import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

// Check if AWS credentials are configured
const hasAWS = 
  process.env.BEDROCK_AWS_ACCESS_KEY_ID && 
  process.env.BEDROCK_AWS_SECRET_ACCESS_KEY;

let ddbDocClient: any = null;

if (hasAWS) {
  try {
    const client = new DynamoDBClient({
      region: process.env.BEDROCK_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
      }
    });
    ddbDocClient = DynamoDBDocumentClient.from(client);
  } catch (err) {
    console.error('[DynamoDB] Failed to initialize DynamoDBClient:', err);
  }
}

// Fallback in-memory storage for local development
let mockDb: Record<string, any> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'guest@codebhasha.com';

  if (ddbDocClient) {
    try {
      const command = new GetCommand({
        TableName: 'CodeBhashaProjects',
        Key: { userId: email }
      });
      const response = await ddbDocClient.send(command);
      return NextResponse.json({ projects: response.Item?.projects || [] });
    } catch (err) {
      console.warn('[DynamoDB] Fetch failed, falling back to local server mock:', err);
    }
  }

  // Fallback
  const projects = mockDb[email] || [];
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const { email, files } = await request.json();
    const targetEmail = email || 'guest@codebhasha.com';

    if (ddbDocClient) {
      try {
        const command = new PutCommand({
          TableName: 'CodeBhashaProjects',
          Item: {
            userId: targetEmail,
            projects: files,
            updatedAt: Date.now()
          }
        });
        await ddbDocClient.send(command);
        return NextResponse.json({ success: true, message: 'Saved to DynamoDB' });
      } catch (err) {
        console.warn('[DynamoDB] Save failed, falling back to local server mock:', err);
      }
    }

    // Fallback
    mockDb[targetEmail] = files;
    return NextResponse.json({ success: true, message: 'Saved to Server Mock memory' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
