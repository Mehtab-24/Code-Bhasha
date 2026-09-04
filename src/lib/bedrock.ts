import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// ─── Bedrock credential resolution (shared by every Bedrock route) ────────────
// Priority: APP_AWS_* → legacy BEDROCK_AWS_* → plain AWS_*. Values are trimmed
// so stray whitespace/CRLF in env files can't poison the region or keys.

export interface BedrockCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export function resolveBedrockCredentials(): BedrockCredentials {
  return {
    accessKeyId: (
      process.env.APP_AWS_ACCESS_KEY_ID ||
      process.env.BEDROCK_AWS_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID ||
      ''
    ).trim(),
    secretAccessKey: (
      process.env.APP_AWS_SECRET_ACCESS_KEY ||
      process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      ''
    ).trim(),
    region: (
      process.env.APP_AWS_REGION ||
      process.env.BEDROCK_AWS_REGION ||
      process.env.AWS_REGION ||
      'us-east-1'
    ).trim(),
  };
}

let cachedClient: BedrockRuntimeClient | null = null;

/**
 * Lazily builds (and caches, per isolate) the Bedrock runtime client.
 * Returns null when credentials are missing — callers respond with
 * BEDROCK_CONFIG_ERROR in that case.
 */
export function getBedrockClient(): BedrockRuntimeClient | null {
  if (cachedClient) return cachedClient;
  const { accessKeyId, secretAccessKey, region } = resolveBedrockCredentials();
  if (!accessKeyId || !secretAccessKey) return null;
  cachedClient = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

/** 500 payload used by every route when credentials are missing. */
export const BEDROCK_CONFIG_ERROR = {
  error: 'ConfigError',
  message: 'AWS Bedrock credentials are missing from environment variables.',
} as const;
