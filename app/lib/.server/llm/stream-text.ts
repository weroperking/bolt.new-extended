import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODEL_LIST, MODEL_REGEX, type Provider } from '~/utils/modelConstants';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
  experimental_attachments?: {
    name?: string;
    contentType?: string;
    url: string;
  }[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

function extractModelFromMessage(message: Message): { provider: Provider; model: string; content: string } {
  const modelRegex = MODEL_REGEX;
  const match = message.content.match(modelRegex);

  if (match) {
    const provider = match[1] as Provider;
    const model = match[2];
    const content = message.content.replace(modelRegex, '');
    return { provider, model, content };
  }

  return { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL, content: message.content };
}

export function processMessages(messages: Messages): {
  messages: Messages;
  currentModel: string;
  provider: Provider;
} {
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER;

  const processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      const { provider, model, content } = extractModelFromMessage(message);
      if (model && MODEL_LIST.find((m) => m.name === model)) {
        currentModel = model;
        currentProvider = provider;
      }
      return { ...message, content };
    }
    return message;
  });

  return {
    messages: processedMessages,
    currentModel,
    provider: currentProvider
  };
}

export function streamText(messages: Messages, env: Env, options?: StreamingOptions) {
  const { messages: processedMessages, currentModel, provider } = processMessages(messages);
  const model: any = getModel(provider, currentModel, env);

  return _streamText({
    model,
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(processedMessages),
    ...options,
  });
}
