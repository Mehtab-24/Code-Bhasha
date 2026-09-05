import { NextResponse } from 'next/server';
import { InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from 'zod';
import { DelimiterStreamParser } from '@/lib/stream-parser';
import { getBedrockClient, resolveBedrockCredentials, BEDROCK_CONFIG_ERROR } from '@/lib/bedrock';

export const runtime = 'edge';

const VoiceToCodeSchema = z.object({
  text: z.string().min(1, 'Transcript cannot be empty').max(500, 'Transcript too long'),
});

export async function POST(req: Request) {
  // ── [Bedrock Debug] environment sanity check ──
  const creds = resolveBedrockCredentials();
  console.log("[Bedrock Debug] Checking credentials:", {
    hasKeyId: !!creds.accessKeyId,
    keyIdPrefix: creds.accessKeyId ? creds.accessKeyId.substring(0, 4) : "MISSING",
    hasSecret: !!creds.secretAccessKey,
    region: creds.region,
    modelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0 (built-in default)",
  });

  const bedrock = getBedrockClient();
  if (!bedrock) {
    return NextResponse.json(BEDROCK_CONFIG_ERROR, { status: 500 });
  }

  try {
    const body = await req.json();
    const { text } = VoiceToCodeSchema.parse(body);
    const transcript = text.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Empty transcript', message: 'Bhai, kuch bolo toh sahi. Transcript khali hai.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a Python compiler for Hinglish logic. You convert Hinglish (Hindi + English) voice commands from Indian students into clean, executable Python 3 code.

Return ONLY valid, executable Python code with strict formatting. Every statement MUST be on its own line separated by newline characters (\\n). NEVER combine a comment and a Python statement on the same line. Do NOT output markdown code blocks (\`\`\`python) or conversational filler.

Brief inline code comments in Hinglish (starting with #) are allowed, each on its own line above the code it describes. NEVER output multi-line string blocks, or verbose sections labeled '---EXPLANATION---' or similar. Do not restate the task, add headings, or explain the code outside of # comments.`;

    const userPrompt = `Convert this Hinglish command to Python code:\n\n"${transcript}"`;

    const payload = {
      schemaVersion: "messages-v1",
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: "user",
          content: [{ text: userPrompt }]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 1024,
        temperature: 0.2,
        top_p: 0.9,
      }
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "amazon.nova-micro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    let response;
    try {
      response = await bedrock.send(command);
    } catch (err) {
      // Unmask the raw SDK error so throttling/credentials issues are visible
      console.error("[Bedrock SDK Raw Error]:", err);
      const sdkErr = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
      return NextResponse.json(
        {
          error: sdkErr?.name || "BedrockError",
          details: sdkErr?.message,
          code: sdkErr?.$metadata?.httpStatusCode,
        },
        { status: 500 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const parser = new DelimiterStreamParser([
          { tag: '---CODE---', field: 'code' },
          { tag: '---EXPLANATION---', field: 'explanation' }
        ], 'code');
        const encoder = new TextEncoder();

        try {
          for await (const event of response.body) {
            if (event.chunk && event.chunk.bytes) {
              const chunkData = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
              if (chunkData.contentBlockDelta?.delta?.text) {
                const text = chunkData.contentBlockDelta.delta.text;
                const outputs = parser.push(text);
                for (const out of outputs) {
                  controller.enqueue(encoder.encode(JSON.stringify(out) + '\n'));
                }
              }
            }
          }
          // Flush the parser
          const finalOutputs = parser.flush();
          for (const out of finalOutputs) {
            controller.enqueue(encoder.encode(JSON.stringify(out) + '\n'));
          }
        } catch (streamError) {
          console.error("Voice-to-code stream reading error:", streamError);
          const streamErr = streamError as { name?: string; message?: string };
          controller.enqueue(encoder.encode(JSON.stringify({
            field: 'error',
            text: `Stream failure — ${streamErr?.name || 'Error'}: ${streamErr?.message || 'unknown'}`
          }) + '\n'));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (err) {
    // Unmask the raw error — no more generic "kuch problem ho gayi" 500s
    console.error('[Bedrock SDK Raw Error]:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.issues },
        { status: 400 }
      );
    }
    const anyErr = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    return NextResponse.json(
      {
        error: anyErr?.name || "BedrockError",
        details: anyErr?.message || 'Voice-to-code failed',
        code: anyErr?.$metadata?.httpStatusCode,
      },
      { status: 500 }
    );
  }
}
