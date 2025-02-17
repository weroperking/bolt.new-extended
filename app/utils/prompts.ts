import { getSystemPrompt } from "~/lib/.server/llm/prompts/prompts";
import "~/lib/.server/llm/prompts/extended-prompt-v1"
import { getExtendedPrompt } from '~/lib/.server/llm/prompts/extended-prompt-v1';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  getPrompt: (cwd?: string) => string;
}

export const defaultPrompts: Prompt[] = [
  // TODO: Planned for future release
  /*{
    id: 'extended-v1-with-framework',
    name: 'Extended V1 with Framework',
    description: 'Default prompt optimized for framework-specific responses',
    getPrompt: (cwd?: string) => getExtendedWithFrameworksPrompt(cwd)
  },*/
  {
    id: 'extended-v1',
    name: 'Extended V1',
    description: 'General-purpose extended prompt',
    getPrompt: (cwd?: string) => getExtendedPrompt(cwd)
  },
  {
    id: 'system-default',
    name: 'System Default',
    description: 'Basic system prompt',
    getPrompt: (cwd?: string) => getSystemPrompt(cwd)
  }
];

export const getPromptById = (id: string, cwd?: string) => {
  const prompt = defaultPrompts.find((p) => p.id === id);

  if (!prompt) {
    return getSystemPrompt(cwd);
  }

  return prompt.getPrompt(cwd);
}
