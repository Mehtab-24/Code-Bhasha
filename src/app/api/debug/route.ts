import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from 'zod';

// 1. Initialize Bedrock Client (Securely using server-side env vars)
console.log("🔍 ENV VAR CHECK:");
console.log("Region:", process.env.AWS_REGION);
console.log("Access Key:", process.env.AWS_ACCESS_KEY_ID ? "Loaded!" : "MISSING!");
console.log("Secret Key:", process.env.AWS_SECRET_ACCESS_KEY ? "Loaded!" : "MISSING!");

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

// 2. Input validation schema
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
    const body = await req.json();
    const { code, error } = DebugSchema.parse(body);

    // 3. Construct the System and User prompts
    const systemPrompt = `You are the "Desi Debugger" — a friendly senior developer who explains Python errors to beginners in conversational Hinglish (mix of Hindi and English).
    Your explanations must:
    1. Start with "Bhai" or "Yaar" to sound friendly.
    2. Explain WHAT went wrong in simple Hindi.
    3. Tell EXACTLY how to fix it (specific line, specific character).
    4. Never use jargon without explaining it.
    5. Be max 3 sentences.
    
    Return ONLY a valid JSON object:
    {
      "friendly_message": "<Hinglish explanation, max 3 sentences>",
      "fix_suggestion": "<Hinglish instruction on exactly what to type/change>",
      "corrected_line": "<the corrected version of the error line, or null>"
    }`;

    const userPrompt = `Error Type: ${error.type}\nError Message: ${error.message}\nLine Number: ${error.lineno}\nProblematic Line: ${error.line_text}\nFull Code:\n${code}`;

    // 4. Call Amazon Nova Micro (Bypasses Marketplace checks!)
    const payload = {
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userPrompt }] }],
      inferenceConfig: {
        max_new_tokens: 500,
        temperature: 0.1,
      }
    };

    const command = new InvokeModelCommand({
      modelId: "amazon.nova-micro-v1:0", 
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    
    // 5. Safely parse Amazon Nova's response to guarantee JSON
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const bedrockText = responseBody.output.message.content[0].text;
    
    const jsonMatch = bedrockText.match(/\{[\s\S]*\}/);
    const finalJson = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(bedrockText);

    return NextResponse.json(finalJson);

  } catch (err) {
    console.error("Debug API Error:", err);
    return NextResponse.json(
      { friendly_message: "Bhai, server mein kuch dikkat aayi. Thodi der mein try karo.", fix_suggestion: "Wait for 1 minute.", corrected_line: null },
      { status: 500 }
    );
  }
}