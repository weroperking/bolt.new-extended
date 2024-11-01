import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { type DragEvent, memo, useEffect, useRef, useState } from 'react';
import { cssTransition, type Id, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { fileModificationsToHTML } from '~/utils/diff';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import { webcontainer } from '~/lib/webcontainer';
import { eventBus, type WebcontainerErrorEvent } from '~/lib/events';
import { isValidFileType } from '~/utils/fileValidation';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, type Provider } from '~/utils/modelConstants';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory } = useChatHistory();

  return (
    <>
      {ready && <ChatImpl initialMessages={initialMessages} storeMessageHistory={storeMessageHistory} />}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
}

export const ChatImpl = memo(({ initialMessages, storeMessageHistory }: ChatProps) => {
  useShortcuts();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);

  const { showChat } = useStore(chatStore);

  const [animationScope, animate] = useAnimate();

  const [fileInputs, setFileInputs] = useState<FileList | null>(null);

  const addFiles = (files: FileList) => {
    const isValid = Array.from(files).every(isValidFileType);
    if (!isValid) {
      toast.error("Unsupported file type. Only images, text, pdf, csv, json, xml, and code files are supported.");
      return;
    }

    setFileInputs((prev) => {
      if (prev === null) {
        return files;
      }

      const merged = new DataTransfer();

      for (let i = 0; i < prev.length; i++) {
        merged.items.add(prev[i]);
      }

      for (let i = 0; i < files.length; i++) {
        merged.items.add(files[i]);
      }

      return merged.files;
    });
  }
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;

    if (files) {
      addFiles(files);
    }
  }

  const removeFile = (index: number) => {
    setFileInputs((prev) => {
      if (prev === null) {
        return null;
      }

      const copy = new DataTransfer();

      for (let i = 0; i < prev.length; i++) {
        if (i !== index) {
          copy.items.add(prev[i]);
        }
      }

      if (copy.items.length === 0) {
        return null;
      }
      return copy.files;
    });
  }

  const { messages, isLoading, input, handleInputChange, setInput, stop, append } = useChat({
    api: '/api/chat',
    onError: (error) => {
      logger.error('Request failed\n\n', error);
      toast.error('There was an error processing your request');
    },
    onFinish: () => {
      logger.debug('Finished streaming');
    },
    initialMessages,
  });

  const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
  const { parsedMessages, parseMessages } = useMessageParser();

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

  useEffect(() => {
    chatStore.setKey('started', initialMessages.length > 0);
  }, []);

  useEffect(() => {
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  }, [messages, isLoading, parseMessages]);

  const scrollTextArea = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  };

  const abort = () => {
    stop();
    chatStore.setKey('aborted', true);
    workbenchStore.abortAllActions();
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input, textareaRef]);

  const runAnimation = async () => {
    if (chatStarted) {
      return;
    }

    await Promise.all([
      animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
      animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
    ]);

    chatStore.setKey('started', true);

    setChatStarted(true);
  };

  const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
    const _input = messageInput || input;

    if (_input.length === 0 || isLoading) {
      return;
    }

    /**
     * @note (delm) Usually saving files shouldn't take long but it may take longer if there
     * many unsaved files. In that case we need to block user input and show an indicator
     * of some kind so the user is aware that something is happening. But I consider the
     * happy case to be no unsaved files and I would expect users to save their changes
     * before they send another message.
     */
    await workbenchStore.saveAllFiles();

    const fileModifications = workbenchStore.getFileModifcations();

    chatStore.setKey('aborted', false);

    runAnimation();

    if (fileModifications !== undefined) {
      const diff = fileModificationsToHTML(fileModifications);

      /**
       * If we have file modifications we append a new user message manually since we have to prefix
       * the user input with the file modifications and we don't want the new user input to appear
       * in the prompt. Using `append` is almost the same as `handleSubmit` except that we have to
       * manually reset the input and we'd have to manually pass in file attachments. However, those
       * aren't relevant here.
       */
      append({ role: 'user', content: `[Model: ${provider}-${model}]\n\n${diff}\n\n${_input}` });

      /**
       * After sending a new message we reset all modifications since the model
       * should now be aware of all the changes.
       */
      workbenchStore.resetAllFileModifications();
    } else {

      const filePromises: Promise<{
        name?: string;
        contentType?: string;
        url: string;
      }>[] = Array.from(fileInputs || []).map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            let contentType = file.type || 'text/plain';
            if (contentType === 'application/octet-stream') {
              contentType = 'text/plain';
            }
            if (reader.result === null || typeof reader.result !== 'string') {
              reject(new Error('Failed to read file'));
              return;
            }
            resolve({
              name: file.name,
              contentType: contentType,
              url: reader.result
            });
          };
          reader.onerror = reject;
        });
      });

      const experimental_attachments: {
        name?: string;
        contentType?: string;
        url: string;
      }[] = await Promise.all(filePromises);
      append({
        role: 'user',
        content: `[Model: ${provider}-${model}]\n\n${_input}`,
        experimental_attachments: experimental_attachments
      });
    }

    setFileInputs(null);

    setInput('');

    resetEnhancer();

    textareaRef.current?.blur();
  };

  const [messageRef, scrollRef] = useSnapScroll();

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer?.files || new DataTransfer().files;
    const droppedFilesArray = Array.from(droppedFiles);
    if (droppedFilesArray.length > 0) {
      addFiles(droppedFiles);
    }
    setIsDragging(false);
  };

  useEffect(() => {
    const sentErrors = new Set<string>();
    let currentToastId: Id = -1;

    const handleWebcontainerError = (event: WebcontainerErrorEvent) => {
      const newErrors = event.messages.filter((msg: string) => !sentErrors.has(msg));
      if (newErrors.length === 0) return;
      newErrors.forEach((msg: string) => sentErrors.add(msg));

      const joinedErrors = Array.from(sentErrors).join('\n');
      const errorElement = <div className="flex flex-col gap-2">
        <div>Ran into errors while executing the command:</div>
        <div className="text-sm text-bolt-elements-textSecondary">
          {newErrors[0].slice(0, 100)}
          {newErrors[0].length > 100 && '...'}

          {newErrors.length > 1 && ` (+${newErrors.length - 1} more)`}
        </div>
        <button
          onClick={() => {
            const errorMessage = `The following errors occurred while running the command:\n${joinedErrors}\n\nHow can we fix these errors?`;
            sentErrors.clear();
            toast.dismiss(currentToastId);
            currentToastId = -1;
            append({
              role: 'user',
              content: `[Model: ${provider}-${model}]\n\n${errorMessage}`
            });
          }}
          className="px-3 py-1.5 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text rounded-md text-sm font-medium"
        >
          Fix errors
        </button>
      </div>;

      if (currentToastId !== -1) {
        toast.update(currentToastId, {
          render: errorElement
        });
        return;
      } else {
        currentToastId = toast.error(
          errorElement,
          {
            autoClose: false,
            closeOnClick: false
          }
        );
      }
    };

    webcontainer.then(() => {
      eventBus.on('webcontainer-error', handleWebcontainerError);
    });

    return () => {
      webcontainer.then(() => {
        eventBus.off('webcontainer-error', handleWebcontainerError);
      });
    };
  }, [append]);

  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);

  const setProviderModel = (provider: string, model: string) => {
    setProvider(provider as Provider);
    setModel(model);
  }

  return (
    <BaseChat
      ref={animationScope}

      fileInputRef={fileInputRef}
      fileInputs={fileInputs}
      removeFile={removeFile}
      handleFileInputChange={handleFileInputChange}

      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}

      model={model}
      provider={provider}
      setProviderModel={setProviderModel}

      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      isStreaming={isLoading}
      enhancingPrompt={enhancingPrompt}
      promptEnhanced={promptEnhanced}
      sendMessage={sendMessage}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={handleInputChange}
      handleStop={abort}
      messages={messages.map((message, i) => {
        if (message.role === 'user') {
          return message;
        }

        return {
          ...message,
          content: parsedMessages[i] || '',
        };
      })}
      enhancePrompt={() => {
        enhancePrompt(input, model, provider, (input) => {
          setInput(input);
          scrollTextArea();
        });
      }}
    />
  );
});
