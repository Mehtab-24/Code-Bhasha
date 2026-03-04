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
  audio: z.string(), // base64 encoded audio
  mimeType: z.string().optional().default('audio/webm'),
});

// Helper function to convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.replace(/^data:audio\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Mock audio transcription service
// In production, replace this with real AWS Transcribe integration
async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    console.log('[Voice-to-Code] Starting mock audio transcription...');
    
    // Simulate transcription processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock transcription results based on audio size (for demo purposes)
    const audioSize = audioBuffer.length;
    
    // Mock transcriptions for common programming commands in Hinglish
    const mockTranscriptions = [
      "Ek loop banao jo 1 se 10 tak numbers print kare",
      "Function banao jiska naam greet ho aur wo hello world print kare",
      "List banao numbers ki 1 se 5 tak aur uska sum print karo",
      "Number check karo agar 10 se bada hai toh big print karo warna small",
      "String banao hello world aur usko uppercase mein print karo",
      "Ek dictionary banao student ki details ke liye",
      "For loop chalao aur har iteration mein counter print karo",
      "If else condition lagao temperature check karne ke liye",
      "Function banao jo factorial calculate kare",
      "List comprehension use karke even numbers nikalo"
    ];
    
    // Select a random transcription based on audio size
    const index = Math.floor((audioSize * 7) % mockTranscriptions.length);
    const transcript = mockTranscriptions[index];
    
    console.log('[Voice-to-Code] Mock transcription completed:', transcript);
    return transcript;
    
  } catch (error) {
    console.error('[Voice-to-Code] Mock transcription error:', error);
    throw new Error('Audio transcription failed');
  }
}

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
    const { audio, mimeType } = VoiceToCodeSchema.parse(body);

    console.log('[Voice-to-Code] Received audio, mime type:', mimeType);

    // Convert base64 audio to buffer (for future transcription use)
    const _audioBuffer = base64ToBuffer(audio);

    // Step 1: Transcribe audio to text
    let transcript = '';
    
    try {
      // Try to transcribe the audio
      transcript = await transcribeAudio(_audioBuffer);
      console.log('[Voice-to-Code] Transcription successful:', transcript);
    } catch (transcribeError) {
      console.error('[Voice-to-Code] Transcription failed, falling back to text input:', transcribeError);
      
      // Fallback to direct text input if transcription fails
      transcript = (body as { text?: string }).text || '';
      
      if (!transcript) {
        return NextResponse.json(
          { 
            error: 'Transcription failed',
            message: 'Bhai, audio transcription mein problem hui. Text input use karo ya dobara try karo.'
          },
          { status: 501 }
        );
      }
    }

    console.log('[Voice-to-Code] Transcript:', transcript);

    // Step 2: Generate Python code from transcript
    const { code, explanation } = await generatePythonCode(transcript);

    console.log('[Voice-to-Code] Generated code successfully');

    // Return both transcript and generated code
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
