/**
 * Model-agnostic AI provider abstraction.
 *
 * Switch providers by setting AI_PROVIDER env var to:
 *   anthropic | openai | gemini
 *
 * The matching API key and model env vars must also be set.
 * No call-site changes are needed — just update env vars.
 */
import { anthropic } from '@ai-sdk/anthropic';
import { openai }    from '@ai-sdk/openai';
import { google }    from '@ai-sdk/google';

type ProviderName = 'anthropic' | 'openai' | 'gemini';

const MODELS: Record<ProviderName, () => ReturnType<typeof anthropic | typeof openai | typeof google>> = {
  anthropic: () => anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'),
  openai:    () => openai(process.env.OPENAI_MODEL ?? 'gpt-4o'),
  gemini:    () => google(process.env.GEMINI_MODEL ?? 'gemini-1.5-pro'),
};

export function getModel() {
  const name = (process.env.AI_PROVIDER ?? 'anthropic') as ProviderName;
  const factory = MODELS[name];
  if (!factory) throw new Error(`Unknown AI_PROVIDER: "${name}". Must be anthropic | openai | gemini.`);
  return factory();
}
