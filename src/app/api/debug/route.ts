import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from 'zod';
import { DelimiterStreamParser } from '@/lib/stream-parser';

export const runtime = 'edge';

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: (process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) as string,
    secretAccessKey: (process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) as string,
  }
});

const DebugSchema = z.object({
  code: z.string().max(10000), 
  error: z.object({
    type: z.string().max(100),
    message: z.string().max(5000), 
    lineno: z.number().int().min(1).max(5000),
    line_text: z.string().max(1000),
  }),
});

export async function POST(req: Request) {
  try {
    if (!process.env.BEDROCK_AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) {
      console.error("❌ CRITICAL: Missing Bedrock Environment Variables in Debug API!");
      return NextResponse.json(
        { friendly_message: "Bhai, server configuration mein problem hai.", fix_suggestion: "Admin se contact karo.", corrected_line: null },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { code, error } = DebugSchema.parse(body);

    const systemPrompt = `You are the "Desi Debugger" — a friendly senior developer who explains Python errors to beginners in conversational Hinglish (mix of Hindi and English).
Your explanations must:
1. Start with "Bhai" or "Yaar" to sound friendly.
2. Explain WHAT went wrong in simple Hindi.
3. Tell EXACTLY how to fix it (specific line, specific character).
4. Never use jargon without explaining it.
5. Be max 3 sentences.

You MUST output the response in this exact format, replacing the text in brackets with your output. DO NOT use markdown code blocks or brackets in your response:
---FRIENDLY_MESSAGE---
[Hinglish explanation, max 3 sentences]
---FIX_SUGGESTION---
[Hinglish instruction on exactly what to type/change]
---CORRECTED_LINE---
[the corrected version of the error line, or the word 'null']`;

    const userPrompt = `Error Type: ${error.type}\nError Message: ${error.message}\nLine Number: ${error.lineno}\nProblematic Line: ${error.line_text}\nFull Code:\n${code}`;

    const payload = {
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userPrompt }] }],
      inferenceConfig: {
        max_new_tokens: 500,
        temperature: 0.1,
      }
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "amazon.nova-micro-v1:0", 
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const parser = new DelimiterStreamParser([
          { tag: '---FRIENDLY_MESSAGE---', field: 'friendly_message' },
          { tag: '---FIX_SUGGESTION---', field: 'fix_suggestion' },
          { tag: '---CORRECTED_LINE---', field: 'corrected_line' }
        ]);
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
          console.error("Stream reading error:", streamError);
          // Send an error event to the stream
          controller.enqueue(encoder.encode(JSON.stringify({ field: 'error', text: 'Stream reading failed' }) + '\n'));
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
    console.error("🚨 DEBUGGER API ERROR DETAILS 🚨", err);
    return NextResponse.json(
      { friendly_message: "Bhai, server mein kuch dikkat aayi. Thodi der mein try karo.", fix_suggestion: "Wait for 1 minute.", corrected_line: null },
      { status: 500 }
    );
  }
}