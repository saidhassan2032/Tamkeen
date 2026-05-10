import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export type Provider = 'anthropic' | 'gemini';
export type Purpose = 'tasks' | 'chat' | 'guide' | 'report';

const modelConfig: Record<Provider, Record<Purpose, string>> = {
  anthropic: {
    tasks:  'claude-3-5-haiku-20241022',
    chat:   'claude-3-5-sonnet-20241022',
    guide:  'claude-3-5-haiku-20241022',
    report: 'claude-3-5-sonnet-20241022',
  },
  gemini: {
    tasks:  'gemini-2.0-flash',
    chat:   'gemini-2.0-flash',
    guide:  'gemini-2.0-flash',
    report: 'gemini-1.5-pro',
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
