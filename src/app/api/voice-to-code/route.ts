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
  try {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error("❌ CRITICAL: Missing Bedrock Environment Variables!");
      return NextResponse.json(
        { error: "Server misconfiguration: Missing Bedrock credentials", message: "Server configuration mein problem hai. Admin ko batao." },
        { status: 500 }
      );
    }

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
Your job is to convert Hinglish (Hindi + English) voice commands into clean, executable Python code.

You MUST output the response in this exact format, replacing the text in brackets with your output. DO NOT use markdown code blocks or brackets in your response:
---CODE---
[Your Python 3 code here. Add inline comments in Hinglish to explain what each line does. Keep the code simple and beginner-friendly.]
---EXPLANATION---
[Brief Hinglish explanation explaining what the code does overall.]`;

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

    const response = await bedrockClient.send(command);

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const parser = new DelimiterStreamParser([
          { tag: '---CODE---', field: 'code' },
          { tag: '---EXPLANATION---', field: 'explanation' }
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
          console.error("Voice-to-code stream reading error:", streamError);
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
    console.error('🚨 VOICE-TO-CODE BEDROCK ERROR 🚨', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Voice-to-code failed', message: 'Bhai, kuch problem ho gayi. Dobara try karo.' },
      { status: 500 }
    );
  }
}
