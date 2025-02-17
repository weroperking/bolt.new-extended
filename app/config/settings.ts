import type { SettingsPage } from '~/types/settings';
import { PromptsLibrary } from '~/components/settings/pages/PromptsLibrary';

export const settingsPages: SettingsPage[] = [
  /*{
    id: 'providers',
    name: 'AI Providers',
    icon: 'i-ph:robot',
    component: AIProviders,
    description: 'Configure AI model providers'
  },*/
  {
    id: 'prompts',
    name: 'Prompts Library',
    icon: 'i-ph:newspaper',
    component: PromptsLibrary,
    description: 'Manage system prompts'
  }
];
