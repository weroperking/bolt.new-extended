import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/.server/llm/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import { createDataStream } from 'ai';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, provider, model, apiKey, temperature, topP, topK, systemPromptId } = await request.json<{
    messages: Messages,
    provider: string,
    model: string,
    apiKey: string,
    temperature: number,
    topP: number,
    topK: number
    systemPromptId: string,
  }>();

  if (!messages || !provider || !model) {
    throw new Response(null, {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  const stream = new SwitchableStream();

  try {
    const options: StreamingOptions = {};
    if (temperature) options.temperature = temperature;
    if (topP) options.topP = topP;
    if (topK) options.topK = topK;

    options.toolChoice = 'none';

    const dataStream = createDataStream({
      async execute(dataStream) {
        options.onFinish = async ({ text: content, finishReason }) => {
          if (finishReason !== 'length') {
            return stream.close();
          }

          if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
            throw Error('Cannot continue message: Maximum segments reached');
          }

          const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;
          console.log(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

          messages.push({ role: 'assistant', content });
          messages.push({ role: 'user', content: CONTINUE_PROMPT });

          const result = await streamText(messages, context.cloudflare.env, options, provider, model, apiKey, systemPromptId);
          result.mergeIntoDataStream(dataStream);
        };

        const result = await streamText(messages, context.cloudflare.env, options, provider, model, apiKey, systemPromptId);
        result.mergeIntoDataStream(dataStream);
      }
    });

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
