import { streamText as _streamText, convertToCoreMessages, type Message } from 'ai';
import { getModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '~/utils/modelConstants';
import { getPromptById } from '~/utils/prompts';

export type Messages = Omit<Message, 'id'>[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

export async function streamText(messages: Messages, env: Env, options?: StreamingOptions, provider?: string, currentModel?: string, apiKey?: string, systemPromptId?: string) {
  if (!provider) provider = DEFAULT_PROVIDER;
  if (!currentModel) currentModel = DEFAULT_MODEL;
  const model: any = getModel(provider, currentModel, env, apiKey);

  const systemPrompt = getPromptById(systemPromptId || 'system-default');

  return await _streamText({
    model,
    system: systemPrompt,
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(messages),
    ...options,
  });
}
