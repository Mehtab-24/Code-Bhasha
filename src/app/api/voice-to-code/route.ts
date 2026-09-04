import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from 'zod';
import { DelimiterStreamParser } from '@/lib/stream-parser';

export const runtime = 'edge';

const AWS_REGION = process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID as string,
    secretAccessKey: AWS_SECRET_ACCESS_KEY as string,
  }
});

const VoiceToCodeSchema = z.object({
  text: z.string().min(1, 'Transcript cannot be empty').max(500, 'Transcript too long'),
});

export async function POST(req: Request) {
  // ── [Bedrock Debug] environment sanity check ──
  console.log("[Bedrock Debug] Checking credentials:", {
    hasKeyId: !!(process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID),
    keyIdPrefix: (process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)
      ? (process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)!.substring(0, 4)
      : "MISSING",
    hasSecret: !!(process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY),
    region: process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || "MISSING",
    modelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0 (built-in default)",
  });

  const hasKeyId = !!(process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID);
  const hasSecret = !!(process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY);
  if (!hasKeyId || !hasSecret) {
    return NextResponse.json(
      { error: "Environment variables missing on server.", missing: { hasKeyId, hasSecret } },
      { status: 500 }
    );
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

    const systemPrompt = `You are a Python code generator for Indian students learning to code.
Your job is to convert Hinglish (Hindi + English) voice commands into clean, executable Python 3 code.

Return ONLY executable Python code. Brief inline code comments in Hinglish (starting with #) are allowed, but NEVER output multi-line string blocks, markdown fences, or verbose sections labeled '---EXPLANATION---' or similar. Do not restate the task, add headings, or explain the code outside of # comments.`;

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
      response = await bedrockClient.send(command);
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
