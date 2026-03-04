import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from 'zod';

// Initialize Bedrock Client for code generation
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

// Input validation schema
const VoiceToCodeSchema = z.object({
  text: z.string().min(1, 'Transcript cannot be empty').max(500, 'Transcript too long'),
});

// Generate Python code from Hinglish text using Amazon Nova Micro
async function generatePythonCode(hinglishText: string): Promise<{ code: string; explanation: string }> {
  try {
    console.log('[Voice-to-Code] Generating code for:', hinglishText);

    // System prompt for Amazon Nova Micro
    const systemPrompt = `You are a Python code generator for Indian students learning to code.
Your job is to convert Hinglish (Hindi + English) voice commands into clean, executable Python code.

Rules:
1. Generate ONLY valid Python 3 code - no markdown, no explanations outside the JSON.
2. Add inline comments in Hinglish to explain what each line does.
3. Keep the code simple and beginner-friendly.
4. If the request is unclear, make reasonable assumptions.
5. Always include proper indentation and syntax.

Return ONLY a valid JSON object:
{
  "code": "<complete Python code with Hinglish comments>",
  "explanation": "<1-2 sentence Hinglish summary of what the code does>"
}`;

    const userPrompt = `Convert this Hinglish command to Python code:\n\n"${hinglishText}"`;

    // Amazon Nova Micro payload structure
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

    const command = new InvokeModelCommand({
      modelId: "amazon.nova-micro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    console.log('[Voice-to-Code] Calling Amazon Nova Micro...');
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('[Voice-to-Code] Nova response:', JSON.stringify(responseBody, null, 2));

    // Extract text from Nova response
    // Nova Micro returns: { output: { message: { content: [{ text: "..." }] } } }
    const outputText = responseBody.output?.message?.content?.[0]?.text || '';
    
    if (!outputText) {
      throw new Error('No output from Nova Micro');
    }

    // Parse the JSON response from Nova
    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If Nova didn't return JSON, wrap the response
      return {
        code: outputText,
        explanation: 'Code generated from your voice command'
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      code: result.code || outputText,
      explanation: result.explanation || 'Code generated successfully'
    };

  } catch (error) {
    console.error('[Voice-to-Code] Code generation error:', error);
    throw new Error('Code generation failed');
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const { text } = VoiceToCodeSchema.parse(body);

    console.log('[Voice-to-Code] Received transcript:', text);

    // Use the transcript directly (no need for audio transcription)
    const transcript = text.trim();

    if (!transcript) {
      return NextResponse.json(
        { 
          error: 'Empty transcript',
          message: 'Bhai, kuch bolo toh sahi. Transcript khali hai.'
        },
        { status: 400 }
      );
    }

    console.log('[Voice-to-Code] Processing transcript:', transcript);

    // Generate Python code from transcript using Amazon Nova Micro
    const { code, explanation } = await generatePythonCode(transcript);

    console.log('[Voice-to-Code] Generated code successfully');

    // Return transcript and generated code
    return NextResponse.json({
      transcript,
      code,
      explanation,
      success: true
    });

  } catch (err) {
    console.error('[Voice-to-Code] API Error:', err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Voice-to-code failed',
        message: 'Bhai, kuch problem ho gayi. Dobara try karo.',
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
