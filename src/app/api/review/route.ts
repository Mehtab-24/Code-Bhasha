import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
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

const ReviewRequestSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
});

const CodeReviewResponseSchema = z.object({
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  styleScore: z.number().min(0).max(100),
  bugs: z.array(
    z.object({
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      suggestion: z.string(),
    })
  ),
  suggestions: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('❌ CRITICAL: Missing Bedrock Environment Variables!');
      return NextResponse.json(
        { error: 'Server misconfiguration', message: 'AWS Bedrock credentials missing.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { code } = ReviewRequestSchema.parse(body);

    const systemPrompt = `You are an expert Python code reviewer.
Analyze the student's Python code for computational complexity (Time/Space complexity using Big O notation), syntax/logical bugs, and programming style conventions (PEP 8, naming structure).

You MUST respond with a single JSON object. DO NOT wrap the output in markdown code blocks (\`\`\`json ... \`\`\`) or include any text outside of the JSON object.
The JSON object must match this schema exactly:
{
  "timeComplexity": "string representing time complexity, e.g., O(N) because we iterate...",
  "spaceComplexity": "string representing space complexity, e.g., O(1) because we use constant variables...",
  "styleScore": number from 0 to 100,
  "bugs": [
    {
      "description": "Hinglish explanation of the bug",
      "severity": "low" | "medium" | "high",
      "suggestion": "Hinglish suggestion to fix the bug"
    }
  ],
  "suggestions": [
    "Hinglish suggestions for style, clean code, naming conventions or optimization"
  ]
}

IMPORTANT: Write all description, explanation, and suggestion fields in conversational Hinglish (Hindi + English) so it is friendly and easy for Indian students to learn and relate to.`;

    const userPrompt = `Review this Python code:\n\n${code}`;

    const payload = {
      schemaVersion: 'messages-v1',
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 1500,
        temperature: 0.1,
        top_p: 0.9,
      }
    };

    const command = new InvokeModelCommand({
      modelId: 'amazon.nova-micro-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const textOutput = responseBody.output?.message?.content?.[0]?.text || '';

    // Parse output JSON
    let reviewResult;
    try {
      // Clean up markdown block wraps if model output them despite instructions
      const cleanedJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      reviewResult = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('Failed to parse Bedrock response as JSON:', textOutput, parseErr);
      return NextResponse.json(
        { error: 'AI parsing failed', message: 'Tutor review generate nahi ho payi. Dobara try karein.' },
        { status: 500 }
      );
    }

    // Validate schema
    const validated = CodeReviewResponseSchema.parse(reviewResult);

    return NextResponse.json(validated);

  } catch (err) {
    console.error('🚨 CODE REVIEW BEDROCK ERROR 🚨', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Code review failed', message: 'Bhai, review server issue ho gaya. Dobara click karo.' },
      { status: 500 }
    );
  }
}
