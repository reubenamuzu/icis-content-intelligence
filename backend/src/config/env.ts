import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  GEMINI_API_KEY: z.string().default(process.env.NODE_ENV === 'test' ? 'test-api-key' : ''),
  ACCOUNT_FOLLOWER_BASELINE: z.coerce.number().positive().default(10000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`[Configuration Error] Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env = parseEnv();
