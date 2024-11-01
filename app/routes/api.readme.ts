import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { StreamingTextResponse, parseStreamPart } from 'ai';
import { type Messages, streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODEL_REGEX } from '~/utils/modelConstants';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function action(args: ActionFunctionArgs) {
  return readmeAction(args);
}

async function readmeAction({ context, request }: ActionFunctionArgs) {
  const { messages } = await request.json<{ messages: Messages }>();

  try {
    const lastMessage = messages[messages.length - 1];
    const model = lastMessage.content.match(MODEL_REGEX);

    const provider = model ? model[1] : DEFAULT_PROVIDER;
    const modelId = model ? model[2] : DEFAULT_MODEL;

    messages.push({
      role: "user",
      content: stripIndents`[Model: ${provider}-${modelId}]\n\n
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
    const result = await streamText(messages, context.cloudflare.env);

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const processedChunk = decoder
          .decode(chunk)
          .split('\n')
          .filter((line) => line !== '')
          .map(parseStreamPart)
          .map((part) => part.value)
          .join('');

        controller.enqueue(encoder.encode(processedChunk));
      },
    });

    const transformedStream = result.toAIStream().pipeThrough(transformStream);

    return new StreamingTextResponse(transformedStream);
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
