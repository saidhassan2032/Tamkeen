import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export type Provider = 'anthropic' | 'gemini';
export type Purpose = 'tasks' | 'chat' | 'guide' | 'report';

const modelConfig: Record<Provider, Record<Purpose, string>> = {
  anthropic: {
    tasks:  'claude-haiku-4-5',
    chat:   'claude-haiku-4-5',
    guide:  'claude-haiku-4-5',
    report: 'claude-haiku-4-5',
  },
  gemini: {
    tasks:  'gemini-3.1-flash-lite',
    chat:   'gemini-3.1-flash-lite',
    guide:  'gemini-3.1-flash-lite',
    report: 'gemini-3.1-flash-lite',
  },
};

const providerFactories = {
  anthropic: anthropic as (modelId: string) => ReturnType<typeof anthropic>,
  gemini:     google    as (modelId: string) => ReturnType<typeof google>,
};

export function getModel(purpose: Purpose) {
  const provider = (process.env.AI_PROVIDER as Provider) ?? 'anthropic';
  const modelName = modelConfig[provider]?.[purpose];
  if (!modelName) {
    throw new Error(`No model configured for provider="${provider}" purpose="${purpose}"`);
  }
  const factory = providerFactories[provider];
  if (!factory) {
    throw new Error(`Unknown provider "${provider}". Valid options: ${Object.keys(providerFactories).join(', ')}`);
  }
  return factory(modelName);
}
