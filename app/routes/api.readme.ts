import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { type Messages, type StreamingOptions, streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';

export async function action(args: ActionFunctionArgs) {
  return readmeAction(args);
}

async function readmeAction({ context, request }: ActionFunctionArgs) {
  const { messages, provider, model, apiKey, temperature, topP, topK } = await request.json<{
    messages: Messages,
    provider: string,
    model: string,
    apiKey: string,
    temperature: number,
    topP: number,
    topK: number
  }>();

  if (!messages || !provider || !model) {
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

    messages.push({
      role: "user",
      content: stripIndents`
          You are creating a README.md file for a that project. Keep it concise and direct.

          <important_sections>
          1. Project name and description (1-2 sentences)
          2. Key features/benefits (3-4 bullet points max)
          3. Simple usage instructions (2-3 steps)
          </important_sections>

          Please provide the README content wrapped in <boltArtifact> tags. Make it concise, straightforward, and avoid any unnecessary information.

          Note: The project helps automate the process of uploading WebContainer projects to GitHub, so focus on that core functionality in the README.
        `,
    });
    const result = await streamText(messages, context.cloudflare.env, options, provider, model, apiKey);

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
