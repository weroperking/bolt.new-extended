import { useLocalStorage } from 'usehooks-ts';

interface Prompt {
  id: string;
  name: string;
  description: string;
}

const defaultPrompts: Prompt[] = [
  {
    id: 'extended-v1',
    name: 'Extended V1',
    description: 'General-purpose extended prompt',
  },
  {
    id: 'system-default',
    name: 'System Default',
    description: 'Basic system prompt',
  }
];

export const PromptsLibrary = () => {
  const [selectedPrompt, setSelectedPrompt] = useLocalStorage('system-prompt', 'extended-v1');

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-bolt-elements-textPrimary">System Prompt Selection</h3>
        <span className="text-sm text-bolt-elements-textSecondary">
          Select the base prompt configuration for AI responses
        </span>
      </div>

      <div className="space-y-3">
        {defaultPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`p-4 rounded-lg border transition-all ${
              selectedPrompt === prompt.id
                ? 'border-bolt-elements-accentPrimary bg-bolt-elements-background-depth-1'
                : 'border-bolt-elements-borderColor'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="systemPrompt"
                checked={selectedPrompt === prompt.id}
                onChange={() => setSelectedPrompt(prompt.id)}
                className="mt-1 accent-bolt-elements-accentPrimary"
              />
              <div className="flex-1">
                <h4 className="font-medium text-bolt-elements-textPrimary">{prompt.name}</h4>
                <p className="text-sm text-bolt-elements-textSecondary mt-1">{prompt.description}</p>
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
