import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from 'zod';

// Validate environment variables at module load time
const AWS_REGION = process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

// Log environment variable status (without exposing secrets)
console.log('[Voice-to-Code] Environment check:', {
  region: AWS_REGION,
  hasAccessKey: !!AWS_ACCESS_KEY_ID,
  hasSecretKey: !!AWS_SECRET_ACCESS_KEY,
  accessKeyPrefix: AWS_ACCESS_KEY_ID?.substring(0, 8) + '...',
});

// Initialize Bedrock Client for code generation
const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID as string,
    secretAccessKey: AWS_SECRET_ACCESS_KEY as string,
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

CRITICAL RULES:
1. You MUST ALWAYS return a valid JSON object with this exact structure:
   {
     "code": "<your Python code here>",
     "explanation": "<brief Hinglish explanation>"
   }
2. The "code" field must contain ONLY valid Python 3 code - no markdown, no backticks, no explanations.
3. Add inline comments in Hinglish to explain what each line does.
4. Keep the code simple and beginner-friendly.
5. If the request is unclear, make reasonable assumptions.
6. Always include proper indentation and syntax.
7. NEVER wrap the code in markdown code blocks (no \`\`\`python).
8. The JSON must be valid and parseable.

Example response format:
{
  "code": "# 1 se 10 tak odd numbers print karo\\nfor i in range(1, 11):\\n    if i % 2 != 0:\\n        print(i)",
  "explanation": "Yeh code 1 se 10 tak ke odd numbers print karta hai"
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
    console.log('[Voice-to-Code] Model ID: amazon.nova-micro-v1:0');
    console.log('[Voice-to-Code] Region:', AWS_REGION);
    
    const response = await bedrockClient.send(command);
    
    console.log('[Voice-to-Code] ✅ Received response from Nova');
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('[Voice-to-Code] Nova response:', JSON.stringify(responseBody, null, 2));

    // Extract text from Nova response
    // Nova Micro returns: { output: { message: { content: [{ text: "..." }] } } }
    const outputText = responseBody.output?.message?.content?.[0]?.text || '';
    
    if (!outputText) {
      console.error('[Voice-to-Code] ❌ No output text from Nova');
      console.error('[Voice-to-Code] Response structure:', JSON.stringify(responseBody, null, 2));
      throw new Error('No output from Nova Micro');
    }

    console.log('[Voice-to-Code] Extracted output text:', outputText.substring(0, 200) + '...');

    // BULLETPROOF EXTRACTION LOGIC
    // Try multiple extraction strategies in order of preference
    
    // Strategy 1: Try to extract JSON object
    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        console.log('[Voice-to-Code] ✅ Successfully parsed JSON response');
        
        // Extract code, removing any markdown wrappers if present
        let code = result.code || '';
        
        // Remove markdown code blocks if they exist
        code = code.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();
        
        return {
          code: code || outputText,
          explanation: result.explanation || 'Code generated from your voice command'
        };
      } catch (parseError) {
        console.warn('[Voice-to-Code] ⚠️ JSON parse failed:', parseError);
        console.warn('[Voice-to-Code] Trying fallback extraction strategies...');
      }
    }
    
    // Strategy 2: Try to extract code from markdown blocks
    const markdownMatch = outputText.match(/```python\n([\s\S]*?)```/);
    if (markdownMatch) {
      console.log('[Voice-to-Code] ✅ Extracted code from markdown block');
      return {
        code: markdownMatch[1].trim(),
        explanation: 'Code generated from your voice command'
      };
    }
    
    // Strategy 3: Try to extract any code block
    const genericCodeMatch = outputText.match(/```\n?([\s\S]*?)```/);
    if (genericCodeMatch) {
      console.log('[Voice-to-Code] ✅ Extracted code from generic code block');
      return {
        code: genericCodeMatch[1].trim(),
        explanation: 'Code generated from your voice command'
      };
    }
    
    // Strategy 4: Fallback - use raw output as code
    console.warn('[Voice-to-Code] ⚠️ No structured format found, using raw output as code');
    return {
      code: outputText.trim(),
      explanation: 'Code generated from your voice command'
    };

  } catch (error) {
    console.error('🚨 CODE GENERATION ERROR 🚨');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error:', error);
    
    throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(req: Request) {
  try {
    // CRITICAL: Validate environment variables first
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error("❌ CRITICAL: Missing Bedrock Environment Variables!");
      console.error("Expected: BEDROCK_AWS_ACCESS_KEY_ID and BEDROCK_AWS_SECRET_ACCESS_KEY");
      console.error("Or fallback: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
      console.error("Current env keys:", Object.keys(process.env).filter(k => k.includes('AWS') || k.includes('BEDROCK')));
      
      return NextResponse.json(
        { 
          error: "Server misconfiguration: Missing Bedrock credentials",
          message: "Server configuration mein problem hai. Admin ko batao.",
          details: "AWS credentials not found in environment variables"
        },
        { status: 500 }
      );
    }

    console.log('[Voice-to-Code] ✅ Environment variables validated');

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
    console.error('BACKEND BEDROCK ERROR:', err);
    console.error('🚨 BEDROCK API ERROR DETAILS 🚨');
    console.error('Error type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('Error message:', err instanceof Error ? err.message : String(err));
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    console.error('Full error object:', err);
    
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
