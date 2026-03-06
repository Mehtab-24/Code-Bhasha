import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Explicitly map environment variables for AWS Amplify deployment
  // This ensures runtime env vars are available to API routes
  env: {
    BEDROCK_AWS_ACCESS_KEY_ID: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
    BEDROCK_AWS_SECRET_ACCESS_KEY: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
    BEDROCK_AWS_REGION: process.env.BEDROCK_AWS_REGION,
  },
};

export default nextConfig;
