import React, { useState, type ReactNode } from 'react';
import * as Popover from "@radix-ui/react-popover";

interface PopoverHoverProps {
  children: ReactNode;
}

interface PopoverTriggerProps {
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface PopoverContentProps {
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children, onMouseEnter, onMouseLeave }) => {
  return (
    <Popover.Trigger asChild onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
    </Popover.Trigger>
  );
};

const PopoverContent: React.FC<PopoverContentProps> = ({ children, onMouseEnter, onMouseLeave }) => {
  return (
    <Popover.Portal>
      <Popover.Content
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sideOffset={5}
        className="z-max text-xs bg-gray-950 text-white border border-bolt-elements-borderColor rounded-lg px-2 py-1.5 truncate"
      >
        {children}
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

export const PopoverHover: React.FC<PopoverHoverProps> & {
  Trigger: React.FC<PopoverTriggerProps>;
  Content: React.FC<PopoverContentProps>;
} = ({ children }) => {
  const [open, setOpen] = useState(false);

  const handleMouseEnter = () => {
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setOpen(false);
  };

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      });
    }
    return child;
  });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {childrenWithProps}
    </Popover.Root>
  );
};

PopoverHover.Trigger = PopoverTrigger;
PopoverHover.Content = PopoverContent;
