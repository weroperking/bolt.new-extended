import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconButton } from '~/components/ui/IconButton';
import { motion } from 'framer-motion';
import { dialogBackdropVariants, dialogVariants } from '~/components/ui/Dialog';
import { settingsPages } from '~/config/settings';
import type { SettingsPage } from '~/types/settings';

interface SettingsDialogProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const SettingsDialog = ({ open, setOpen }: SettingsDialogProps) => {
  const [activePage, setActivePage] = useState<SettingsPage | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-max bg-black/50"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogBackdropVariants}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed top-[50%] left-[50%] z-max max-h-[85vh] w-[800px] max-w-[95vw] translate-x-[-50%] translate-y-[-50%] rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 shadow-2xl focus:outline-none"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogVariants}
          >
            <div className="flex flex-col h-full max-h-[85vh]">
              <Dialog.Title className="flex items-center border-b border-bolt-elements-borderColor px-6 py-4">
                {activePage ? (
                  <div className="flex items-center w-full relative">
                    <IconButton
                      icon="i-ph:arrow-left"
                      className="absolute left-0"
                      onClick={() => setActivePage(null)}
                    />
                    <span className="flex-1 text-lg font-semibold text-bolt-elements-textPrimary text-center">
                      {activePage.name}
                    </span>
                    <Dialog.Close asChild>
                      <IconButton
                        icon="i-ph:x"
                        className="absolute right-0"
                        onClick={() => setOpen(false)}
                      />
                    </Dialog.Close>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-semibold text-bolt-elements-textPrimary">
                      Settings
                    </span>
                    <Dialog.Close asChild>
                      <IconButton
                        icon="i-ph:x"
                        className="ml-auto -mr-2"
                        onClick={() => setOpen(false)}
                      />
                    </Dialog.Close>
                  </>
                )}
              </Dialog.Title>

              <div className="flex-1 overflow-y-auto">
                {activePage ? (
                  <div className="p-6">
                    <activePage.component />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4 p-6">
                    {settingsPages.map((page) => (
                      <IconButton
                        key={page.id}
                        onClick={() => setActivePage(page)}
                        className="group flex flex-col items-center p-8 rounded-lg border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorHover bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2 transition-colors text-center min-h-[240px]"
                      >
                        <IconButton
                          icon={page.icon}
                          size="xxl"
                          className="mb-6 scale-150"
                        />
                        <div className="space-y-3">
                          <div className="font-medium text-lg text-bolt-elements-textPrimary">
                            {page.name}
                          </div>
                          <div className="text-sm text-bolt-elements-textSecondary">
                            {page.description}
                          </div>
                        </div>
                      </IconButton>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
