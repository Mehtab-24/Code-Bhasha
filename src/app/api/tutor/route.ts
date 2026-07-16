import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';

export const runtime = 'edge';

const AWS_REGION = process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID as string,
    secretAccessKey: AWS_SECRET_ACCESS_KEY as string,
  }
});

const TutorSchema = z.object({
  message: z.string().min(1),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
  context: z.object({
    code: z.string().optional(),
    console: z.string().optional(),
    error: z.string().nullable().optional(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('❌ CRITICAL: Missing Bedrock Environment Variables!');
      return NextResponse.json(
        { error: 'Server misconfiguration', message: 'AWS Bedrock configuration keys missing.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const parsed = TutorSchema.parse(body);

    const systemPrompt = `You are "Desi Tutor", a Socratic Python coding mentor for Indian students.
Your goal is to guide the student towards solving their coding problem themselves using Socratic questioning, conversational hints, and gentle logic guidelines.

CRITICAL RULES:
1. DO NOT WRITE THE COMPLETE CODE SOLUTION for the student. NEVER output the full solution code block.
2. If the student asks for code, explain the logic in Hinglish (Hindi written in English script) and write only a tiny, incomplete snippet (e.g. showing a function definition or a single line) if absolutely necessary.
3. Speak in a friendly, conversational Hinglish (e.g., "Bhai, dekh line 4 me...", "Dekho, loop variable change karo...", "Arre yaar, indentation check karo!").
4. If an error is present in the console, explain the error conceptually in Hinglish first.
5. Ask exactly one guiding question at the end of your response to help the student figure out the next step.`;

    // Package the student's current workspace state as instruction context
    const currentCode = parsed.context?.code || '';
    const currentConsole = parsed.context?.console || '';
    const currentError = parsed.context?.error || '';

    const workspaceContextPrompt = `STUDENT CODE WORKSPACE CONTEXT:
--- CODE ---
${currentCode || '(No code written yet)'}
--- CONSOLE OUTPUT ---
${currentConsole || '(Console is empty)'}
--- RUNTIME ERROR ---
${currentError || '(No active runtime error)'}
---
Use this context to tailor your Socratic guidance.`;

    // Map history to Nova's format
    const messages = [];

    // Inject workspace context as the first user turn or system prompt assistant setup
    messages.push({
      role: 'user',
      content: [{ text: `${workspaceContextPrompt}\n\nStudent prompt: Let's start!` }]
    });
    messages.push({
      role: 'assistant',
      content: [{ text: 'Bhai, got the workspace details. Pucho kya help chahiye!' }]
    });

    // Append conversation history
    if (parsed.history && parsed.history.length > 0) {
      for (const msg of parsed.history) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: [{ text: msg.content }]
        });
      }
    }

    // Append latest student question
    messages.push({
      role: 'user',
      content: [{ text: parsed.message }]
    });

    const payload = {
      schemaVersion: 'messages-v1',
      system: [{ text: systemPrompt }],
      messages,
      inferenceConfig: {
        max_new_tokens: 800,
        temperature: 0.4,
        top_p: 0.9,
      }
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: 'amazon.nova-micro-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const encoder = new TextEncoder();
        try {
          for await (const event of response.body) {
            if (event.chunk && event.chunk.bytes) {
              const chunkData = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
              if (chunkData.contentBlockDelta?.delta?.text) {
                const text = chunkData.contentBlockDelta.delta.text;
                controller.enqueue(encoder.encode(JSON.stringify({ field: 'text', text }) + '\n'));
              }
            }
          }
        } catch (streamError) {
          console.error('Tutor stream reading error:', streamError);
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
    console.error('🚨 TUTOR BEDROCK ERROR 🚨', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Tutor help failed', message: 'Bhai, Socratic connection failed. Dobara try karo.' },
      { status: 500 }
    );
  }
}
