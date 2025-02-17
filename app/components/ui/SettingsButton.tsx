import { memo } from 'react';
import { IconButton } from './IconButton';

interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton = memo(({ onClick }: SettingsButtonProps) => {
  return (
      <IconButton
        icon="i-ph:gear"
        size="xl"
        title="Settings"
        onClick={onClick}
      />
  );
});
