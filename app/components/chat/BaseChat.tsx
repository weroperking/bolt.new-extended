import type { Message } from 'ai';
import React, { type RefCallback } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import * as Select from "@radix-ui/react-select";

import styles from './BaseChat.module.scss';
import { PopoverHover } from '~/components/ui/PopoverHover';
import { AnimatePresence, motion } from "framer-motion";
import { type ModelInfo } from '~/utils/modelConstants';
import { debounce } from '~/utils/debounce';

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;

  isDragging?: boolean;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;

  fileInputRef?: React.RefObject<HTMLInputElement> | undefined;
  fileInputs?: FileList | null;
  removeFile?: (index: number) => void;
  handleFileInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;

  model?: string;
  provider?: string;
  setProviderModel?: (provider: string, model: string) => void;

  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  messages?: Message[];
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
}

const EXAMPLE_PROMPTS = [
  { text: 'Build a todo app in React using Tailwind' },
  { text: 'Build a simple blog using Astro' },
  { text: 'Create a cookie consent form using Material UI' },
  { text: 'Make a space invaders game' },
  { text: 'How do I center a div?' },
];

const TEXTAREA_MIN_HEIGHT = 76;

interface ModelSelectProps {
  chatStarted: boolean;
  model?: string;
  provider?: string;
  setProviderModel?: (provider: string, model: string) => void;
}
const ModelSelect = ({ chatStarted, model, provider, setProviderModel }: ModelSelectProps) => {
  const [search, setSearch] = React.useState("");
  const [filteredModels, setFilteredModels] = React.useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchModels = React.useCallback(
    debounce(async (searchTerm: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ search: searchTerm });
        const response = await fetch(`/api/models?${params}`);
        const data: ModelInfo[] = await response.json();
        setFilteredModels(data);
      } catch (error) {
        console.error('Model arama hatası:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  React.useEffect(() => {
    fetchModels(search);
  }, [search, fetchModels]);

  const providers = Array.from(new Set(filteredModels.map((model: any) => model.provider)));
  const currentModel: ModelInfo | undefined = filteredModels.find((m: any) => m.name === model && m.provider === provider);

  return (
    <Select.Root
      value={model ? `${provider}-${model}` : undefined}
      onValueChange={(value) => {
        const [provider, ...rest] = value.split('-');
        const model = rest.join('-');
        setProviderModel?.(provider, model)
      }}
    >
      <Select.Trigger className="inline-flex items-center justify-center gap-1 px-2 py-1 text-sm rounded bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
        <Select.Value>
          {isLoading && <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-sm" />}
          {!isLoading && currentModel && (
            <div className="flex items-center gap-1">
              <div className="i-ph:gear text-sm" />
              <span className="truncate">{currentModel.label} (In: ${currentModel.inputPrice}, Out: ${currentModel.outputPrice})</span>
            </div>
          )}
          {!isLoading && !currentModel && <span>Select model</span>}
        </Select.Value>
        <div className="i-ph:caret-down text-sm opacity-50" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position={"popper"}
          side={"top"}
          sideOffset={5}
          className="overflow-hidden bg-bolt-elements-background-depth-1 rounded-md border border-bolt-elements-borderColor shadow-md z-50 w-[var(--radix-select-trigger-width)] min-w-[220px] max-h-50vh"
        >
          <div className="p-2 border-b border-bolt-elements-borderColor" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <input
                className="w-full px-2 py-1 text-sm bg-bolt-elements-background-depth-2 rounded border border-bolt-elements-borderColor focus:outline-none"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              {isLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-sm" />
                </div>
              )}
            </div>
          </div>
          <Select.ScrollUpButton />
          <Select.Viewport className="p-2">
            {providers.map((providerName) => {
              const providerModels = filteredModels.filter(
                (model: any) => model.provider === providerName
              );

              if (providerModels.length === 0) return null;

              return (
                <Select.Group key={providerName}>
                  <Select.Label className="px-6 py-2 text-xs font-medium text-bolt-elements-textTertiary">
                    {providerName}
                  </Select.Label>
                  {providerModels.map((modelItem: any) => (
                    <Select.Item
                      key={`${modelItem.provider}-${modelItem.name}`}
                      value={`${modelItem.provider}-${modelItem.name}`}
                      className="relative flex items-center px-6 py-2 text-sm text-bolt-elements-textPrimary rounded select-none
                        hover:bg-bolt-elements-item-backgroundAccent
                        data-[disabled]:opacity-50
                        data-[disabled]:pointer-events-none
                        data-[highlighted]:bg-bolt-elements-item-backgroundAccent
                        data-[highlighted]:outline-none
                        cursor-default
                        focus:outline-none"
                    >
                      <Select.ItemText>{modelItem.label} (In: ${modelItem.inputPrice}, Out: ${modelItem.outputPrice})</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2">
                        <div className="i-ph:check text-sm" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Group>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,

      isDragging,
      onDragOver,
      onDragLeave,
      onDrop,


      fileInputRef,
      fileInputs,
      removeFile,
      handleFileInputChange,

      model,
      provider,
      setProviderModel,

      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      enhancingPrompt = false,
      promptEnhanced = false,
      messages,
      input = '',
      sendMessage,
      handleInputChange,
      enhancePrompt,
      handleStop,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    return (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'relative flex h-full w-full overflow-hidden bg-bolt-elements-background-depth-1',
        )}
        data-chat-visible={showChat}

        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div
              className="fixed pointer-events-none top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-bolt-elements-background-depth-1 z-50 backdrop-filter backdrop-blur-[32px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
            >
              <div className="i-ph:file text-4xl text-bolt-elements-textPrimary"></div>
              <div className="text-bolt-elements-textPrimary">Drop files here</div>
            </motion.div>
          )}
        </AnimatePresence>
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div ref={scrollRef} className="flex overflow-y-auto w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[26vh] max-w-chat mx-auto">
                <h1 className="text-5xl text-center font-bold text-bolt-elements-textPrimary mb-2">
                  Where ideas begin
                </h1>
                <p className="mb-4 text-center text-bolt-elements-textSecondary">
                  Bring ideas to life in seconds or get help on existing projects.
                </p>
              </div>
            )}
            <div
              className={classNames('pt-6 px-6', {
                'h-full flex flex-col': chatStarted,
              })}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages
                      ref={messageRef}
                      className="flex flex-col w-full flex-1 max-w-chat px-4 pb-6 mx-auto z-1"
                      messages={messages}
                      isStreaming={isStreaming}
                    />
                  ) : null;
                }}
              </ClientOnly>
              <div
                className={classNames('relative w-full max-w-chat mx-auto z-prompt', {
                  'sticky bottom-0': chatStarted,
                })}
              >
                <div
                  className={classNames(
                    'shadow-sm border border-bolt-elements-borderColor bg-bolt-elements-prompt-background backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden',
                  )}
                >
                  {fileInputs && (
                    <div className="flex flex-col gap-5 bg-bolt-elements-background-depth-1 p-4">
                      <div className="px-5 flex gap-5">
                        {Array.from(fileInputs).map((file, index) => {
                          return (
                            <div className="relative" key={index}>
                              <div
                                className="relative flex rounded-lg border border-bolt-elements-borderColor overflow-hidden">
                                <PopoverHover>
                                  <PopoverHover.Trigger>
                                    <button className="h-20 w-20 bg-transparent outline-none">
                                      {file.type.includes('image') ? (
                                        <img
                                          className="object-cover w-full h-full"
                                          src={URL.createObjectURL(file)}
                                          alt={file.name}
                                        />
                                      ) : (
                                        <div className="flex items-center justify-center w-full h-full text-bolt-elements-textTertiary">
                                          <div className="i-ph:file" />
                                        </div>
                                      )}
                                    </button>
                                  </PopoverHover.Trigger>
                                  <PopoverHover.Content>
                                    <span className="text-xs text-bolt-elements-textTertiary">
                                      {file.name}
                                    </span>
                                  </PopoverHover.Content>
                                </PopoverHover>
                              </div>
                              <button
                                className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full w-[18px] h-[18px] flex items-center justify-center z-1 bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-button-secondary-text"
                                onClick={() => removeFile?.(index)}
                              >
                                <div className="i-ph:x scale-70"></div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                  }
                  <textarea
                    ref={textareaRef}
                    className={`w-full pl-4 pt-4 pr-16 focus:outline-none resize-none text-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        if (event.shiftKey) {
                          return;
                            }

                        event.preventDefault();

                        sendMessage?.(event);
                      }
                    }}
                    value={input}
                    onChange={(event) => {
                      handleInputChange?.(event);
                    }}
                    style={{
                      minHeight: TEXTAREA_MIN_HEIGHT,
                      maxHeight: TEXTAREA_MAX_HEIGHT,
                    }}
                    placeholder="How can Bolt help you today?"
                    translate="no"
                  />
                  <ClientOnly>
                    {() => (
                      <SendButton
                        show={input.length > 0 || isStreaming}
                        isStreaming={isStreaming}
                        onClick={(event) => {
                          if (isStreaming) {
                            handleStop?.();
                            return;
                          }

                          sendMessage?.(event);
                        }}
                      />
                    )}
                  </ClientOnly>
                  <div className="flex justify-between text-sm p-4 pt-2">
                    <div className="flex gap-1 items-center">
                      <input type="file"
                              ref={fileInputRef}
                              aria-hidden="true"
                              accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.txt,.doc,.docx,.py,.ipynb,.js,.mjs,.cjs,.jsx,.html,.css,.scss,.sass,.ts,.tsx,.java,.cs,.php,.c,.cc,.cpp,.cxx,.h,.hh,.hpp,.rs,.swift,.go,.rb,.kt,.kts,.scala,.sh,.bash,.zsh,.bat,.csv,.log,.ini,.cfg,.config,.json,.yaml,.yml,.toml,.lua,.sql,.md,.tex,.latex,.asm,.ino,.s"
                              multiple
                              style={{display: 'none', visibility: 'hidden'}}
                              onChange={handleFileInputChange}
                      />
                      <IconButton
                        title="Upload files"
                        disabled={isStreaming}
                        className="pr-1.5 enabled:hover:bg-bolt-elements-item-backgroundAccent!"
                        onClick={() => fileInputRef?.current?.click()}
                      >
                        <>
                          <div className="i-ph:link text-xl"></div>
                        </>
                      </IconButton>
                      <IconButton
                        title="Enhance prompt"
                        disabled={input.length === 0 || enhancingPrompt}
                        className={classNames({
                          'opacity-100!': enhancingPrompt,
                          'text-bolt-elements-item-contentAccent! pr-1.5 enabled:hover:bg-bolt-elements-item-backgroundAccent!':
                          promptEnhanced
                        })}
                        onClick={() => enhancePrompt?.()}
                      >
                        {enhancingPrompt ? (
                          <>
                            <div
                              className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl"></div>
                            <div className="ml-1.5">Enhancing prompt...</div>
                          </>
                        ) : (
                          <>
                            <div className="i-bolt:stars text-xl"></div>
                            {promptEnhanced && <div className="ml-1.5">Prompt enhanced</div>}
                          </>
                        )}
                      </IconButton>
                      <ModelSelect
                        chatStarted={chatStarted}
                        model={model}
                        provider={provider}
                        setProviderModel={setProviderModel}
                      />
                    </div>
                    {input.length > 3 ? (
                      <div className="text-xs text-bolt-elements-textTertiary">
                        Use <kbd className="kdb">Shift</kbd> + <kbd className="kdb">Return</kbd> for a new line
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="bg-bolt-elements-background-depth-1 pb-6">{/* Ghost Element */}</div>
              </div>
            </div>
            {!chatStarted && (
              <div id="examples" className="relative w-full max-w-xl mx-auto mt-8 flex justify-center">
                <div className="flex flex-col space-y-2 [mask-image:linear-gradient(to_bottom,black_0%,transparent_180%)] hover:[mask-image:none]">
                  {EXAMPLE_PROMPTS.map((examplePrompt, index) => {
                    return (
                      <button
                        key={index}
                        onClick={(event) => {
                          sendMessage?.(event, examplePrompt.text);
                        }}
                        className="group flex items-center w-full gap-2 justify-center bg-transparent text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-theme"
                      >
                        {examplePrompt.text}
                        <div className="i-ph:arrow-bend-down-left" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
        </div>
      </div>
    );
  },
);
