import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getAPIKey, getBaseURL } from '~/lib/.server/llm/api-key';
import { createOpenAI } from '@ai-sdk/openai';
import { createMistral } from '@ai-sdk/mistral';
import { createGroq } from '@ai-sdk/groq';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ollama-ai-provider';

export function getAnthropicModel(apiKey: string, model: string) {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic(model);
}

export function getOpenAIModel(apiKey: string, model: string) {
  const openai = createOpenAI({
    apiKey,
  });

  return openai(model);
}

export function getGoogleModel(apiKey: string, model: string) {
  const google = createGoogleGenerativeAI({
    apiKey,
  });

  return google(model);
}

export function getMistralModel(apiKey: string, model: string) {
  const mistral = createMistral({
    apiKey,
  });

  return mistral(model);
}

export function getGroqModel(apiKey: string, model: string) {
  const groq = createGroq({
    apiKey,
  });

  return groq(model);
}

export function getOpenRouterModel(apiKey: string, model: string) {
  const openRouter = createOpenRouter({
    apiKey,
  });

  return openRouter.chat(model);
}

export function getDeepseekModel(apiKey: string, model: string){
  const deepseek = createOpenAI({
    baseURL: 'https://api.deepseek.com/beta',
    apiKey,
  });

  return deepseek(model);
}

export function getTogetherAIModel(apiKey: string, model: string){
  const togetherAI = createOpenAI({
    baseURL: 'https://api.together.xyz/v1',
    apiKey,
  });

  return togetherAI(model);
}

export function getOllamaModel(baseURL: string, model: string) {
  const ollama = createOllama({
    baseURL,
  });

  return ollama(model);
}

export function getLMStudioModel(baseURL: string, model: string) {
  const lmStudio = createOpenAI({
    baseURL: baseURL
  });

  return lmStudio(model);
}

export function getModel(provider: string, model: string, env: Env) {
  const apiKey = getAPIKey(env, provider);
  const baseURL = getBaseURL(env, provider);

  switch (provider) {
    case 'Anthropic':
      return getAnthropicModel(apiKey, model);
    case 'OpenAI':
      return getOpenAIModel(apiKey, model);
    case 'Google':
      return getGoogleModel(apiKey, model)
    case 'Mistral':
      return  getMistralModel(apiKey, model);
    case 'Groq':
      return getGroqModel(apiKey, model);
    case 'OpenRouter':
      return getOpenRouterModel(apiKey, model);
    case 'Deepseek':
      return getDeepseekModel(apiKey, model);
    case 'TogetherAI':
      return getTogetherAIModel(apiKey, model);
    case 'Ollama':
      return getOllamaModel(baseURL, model);
    case 'LMStudio':
      return getLMStudioModel(baseURL, model);
    default:
      return getAnthropicModel(apiKey, model);
  }
}
