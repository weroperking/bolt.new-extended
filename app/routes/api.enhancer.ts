import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { type StreamingOptions, streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message, provider, model, apiKey, temperature, topP, topK, systemPromptId } = await request.json<{
    message: string,
    provider: string,
    model: string,
    apiKey: string,
    temperature: number,
    topP: number,
    topK: number,
    systemPromptId: string,
  }>();

  if (!message || !provider || !model) {
    throw new Response(null, {
      status: 400,
      statusText: 'Bad Request',
    });
  }

  try {
    const options: StreamingOptions = {};
    if (temperature) options.temperature = temperature;
    if (topP) options.topP = topP;
    if (topK) options.topK = topK;

    const result = await streamText(
      [
        {
          role: 'user',
          content: stripIndents`
          I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

          IMPORTANT: Only respond with the improved prompt and nothing else!

          <original_prompt>
            ${message}
          </original_prompt>
        `,
        },
      ],
      context.cloudflare.env,
      options,
      provider,
      model,
      apiKey,
      systemPromptId
    );

    return new Response(result.textStream, {
      status: 200,
      headers: {
        contentType: 'text/plain; charset=utf-8',
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
