export type Provider =
  | 'Anthropic'
  | 'OpenAI'
  | 'Google'
  | 'Mistral'
  | 'Groq'
  | 'OpenRouter'
  | 'Deepseek'
  | 'TogetherAI'
  | 'Ollama'
  | 'LMStudio';

export const MODEL_REGEX = /^\[Model: (.*?)-(.*?)\]\n\n/;

export type ModelInfo = {
  name: string;
  provider: Provider;
  label: string;
  inputPrice?: number;
  outputPrice?: number;
  maxOutputTokens?: number;
  description?: string;
  deprecated?: boolean;
};

// Sabit modeller
const STATIC_MODELS: ModelInfo[] = [
  // Anthropic
  {
    name: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
  },

  // OpenAI
  {
    name: 'gpt-4o-mini',
    label: 'GPT-4 Mini',
    provider: 'OpenAI',
    inputPrice: 0.150,
    outputPrice: 0.075,
  },
  {
    name: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    provider: 'OpenAI',
    inputPrice: 10,
    outputPrice: 30,
  },
  {
    name: 'gpt-4',
    label: 'GPT-4',
    provider: 'OpenAI',
    inputPrice: 30,
    outputPrice: 60
  },
  {
    name: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    inputPrice: 3,
    outputPrice: 6,
  },

  // Google
  {
    name: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'Google',
    inputPrice: 0.15,
    outputPrice: 0.6,
  },

  // Mistral
  {
    name: 'ministral-3b-latest',
    label: 'Mini Mistral 3B',
    provider: 'Mistral',
    inputPrice: 0.04,
    outputPrice: 0.04,
  },
  {
    name: 'ministral-8b-latest',
    label: 'Mini Mistral 8B',
    provider: 'Mistral',
    inputPrice: 0.04,
    outputPrice: 0.04,
  },
  {
    name: 'mistral-large-latest',
    label: 'Mistral Large',
    provider: 'Mistral',
    inputPrice: 2,
    outputPrice: 6,
  },
  {
    name: 'mistral-small-latest',
    label: 'Mistral Small',
    provider: 'Mistral',
    inputPrice: 0.2,
    outputPrice: 0.6,
  },
  {
    name: 'codestral-latest',
    label: 'Codestral',
    provider: 'Mistral',
    inputPrice: 0.2,
    outputPrice: 0.6,
  },
  {
    name: 'open-mistral-nemo',
    label: 'Open Mistral Nemo',
    provider: 'Mistral',
    inputPrice: 0.15,
    outputPrice: 0.15,
  },
  {
    name: 'open-codestral-mamba',
    label: 'Open Codestral Mamba',
    provider: 'Mistral'
  },
  {
    name: 'open-mistral-7b',
    label: 'Open Mistral 7B',
    provider: 'Mistral',
    inputPrice: 0.25,
    outputPrice: 0.25,
  },
  {
    name: 'open-mixtral-8x7b',
    label: 'Open Mixtral 8x7B',
    provider: 'Mistral',
    inputPrice: 0.7,
    outputPrice: 0.7
  },
  {
    name: 'open-mixtral-8x22b',
    label: 'Open Mixtral 8x22B',
    provider: 'Mistral',
    inputPrice: 2,
    outputPrice: 6,
  },

  // Groq
  {
    name: 'llama-3.2-1b-preview',
    label: 'Llama 3.2 1B (Preview)',
    provider: 'Groq',
    inputPrice: 0.04,
    outputPrice: 0.04,
  },
  {
    name: 'llama-3.2-3b-preview',
    label: 'Llama 3.2 3B (Preview)',
    provider: 'Groq',
    inputPrice: 0.06,
    outputPrice: 0.06,
  },
  {
    name: 'llama-3.1-70b-versatile',
    label: 'Llama 3.1 70B Versatile',
    provider: 'Groq',
    inputPrice: 0.59,
    outputPrice: 0.79,
  },
  {
    name: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    provider: 'Groq',
    inputPrice: 0.05,
    outputPrice: 0.08,
  },
  {
    name: 'llama3-70b-8192',
    label: 'Llama 3 70B 8k',
    provider: 'Groq',
    inputPrice: 0.59,
    outputPrice: 0.79,
  },
  {
    name: 'llama3-8b-8192',
    label: 'Llama 3 8B',
    provider: 'Groq',
    inputPrice: 0.05,
    outputPrice: 0.08,
  },
  {
    name: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B 32k',
    provider: 'Groq',
    inputPrice: 0.24,
    outputPrice: 0.24,
  },
  {
    name: 'gemma-7b-it',
    label: 'Gemma 7B 8k Instruct',
    provider: 'Groq',
    inputPrice: 0.07,
    outputPrice: 0.07,
  },
  {
    name: 'gemma2-9b-it',
    label: 'Gemma 2 9B Instruct',
    provider: 'Groq',
    inputPrice: 0.20,
    outputPrice: 0.20,
  },



  // Deepseek
  {
    name: 'deepseek-coder',
    label: 'Deepseek-Coder',
    provider: 'Deepseek',
    inputPrice: 0.14,
    outputPrice: 0.28,
  },
  {
    name: 'deepseek-chat',
    label: 'Deepseek-Chat',
    provider: 'Deepseek',
    inputPrice: 0.14,
    outputPrice: 0.28,
  }
];

export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
export const DEFAULT_PROVIDER: Provider = 'Anthropic';

export let MODEL_LIST: ModelInfo[] = [...STATIC_MODELS];

async function fetchOpenRouterModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    const data: any = await response.json();
    return data.data.map((model: any) => ({
      name: model.id,
      label: model.name || model.id,
      provider: 'OpenRouter' as Provider,
      inputPrice: Math.round(parseFloat(model.pricing?.completion) * 1000000 * 100) / 100,
      outputPrice: Math.round(parseFloat(model.pricing?.completion) * 1000000 * 100) / 100,
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

async function fetchTogetherAIModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.together.xyz/v1/models', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.TOGETHER_AI_API_KEY}`
      }
    });
    const data: any = await response.json();
    return data.map((model: any) => ({
      name: model.id,
      label: model.display_name,
      provider: 'TogetherAI' as Provider,
      description: model.description,
      inputPrice: model.pricing?.input,
      outputPrice: model.pricing?.output,
    }));
  } catch (error) {
    console.error('Error fetching TogetherAI models:', error);
    return [];
  }
}

async function fetchOllamaModels(): Promise<ModelInfo[]> {
  try {
    const baseUrl = import.meta.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/tags`);
    const data: any = await response.json();
    return data.models.map((model: string) => ({
      name: model,
      label: model,
      provider: 'Ollama' as Provider,
    }));
  } catch (error) {
    return [];
  }
}

async function fetchLMStudioModels(): Promise<ModelInfo[]> {
  try {
    const baseUrl = import.meta.env.LM_STUDIO_API_BASE_URL || 'http://localhost:1234/v1';
    const response = await fetch(`${baseUrl}/models`);
    const data: any = await response.json();
    return data.map((model: any) => ({
      name: model.id,
      label: model.display_name,
      provider: 'LMStudio' as Provider,
    }));
  } catch (error) {
    return [];
  }
}

async function initializeModelList(): Promise<void> {
  const [openRouterModels, togetherAIModels, ollamaModels, lmStudioModels] = await Promise.all([
    fetchOpenRouterModels(),
    fetchTogetherAIModels(),
    fetchOllamaModels(),
    fetchLMStudioModels()
  ]);

  MODEL_LIST = [
    ...STATIC_MODELS,
    ...openRouterModels,
    ...togetherAIModels,
    ...ollamaModels,
    ...lmStudioModels
  ];
}

initializeModelList().then();

export function getModelsByProvider(provider: Provider): ModelInfo[] {
  return MODEL_LIST.filter(model => model.provider === provider);
}

export function getModelByName(name: string): ModelInfo | undefined {
  return MODEL_LIST.find(model => model.name === name);
}

export { initializeModelList };
