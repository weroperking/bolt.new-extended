import type { Message } from 'ai';
import React from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { PopoverHover } from '~/components/ui/PopoverHover';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
}

export const Messages = React.forwardRef<HTMLDivElement, MessagesProps>((props: MessagesProps, ref) => {
  const { id, isStreaming = false, messages = [] } = props;

  return (
    <div id={id} ref={ref} className={props.className}>
      {messages.length > 0
        ? messages.map((message, index) => {
            const { role, content, experimental_attachments } = message;
            const isUserMessage = role === 'user';
            const isFirst = index === 0;
            const isLast = index === messages.length - 1;

            return (
              <>
                <div
                  key={index}
                  className={classNames('flex gap-4 p-6 w-full rounded-[calc(0.75rem-1px)]', {
                    'bg-bolt-elements-messages-background': isUserMessage || !isStreaming || (isStreaming && !isLast),
                    'bg-gradient-to-b from-bolt-elements-messages-background from-30% to-transparent':
                      isStreaming && isLast,
                    'mt-4': !isFirst,
                  })}
                >
                  {isUserMessage && (
                    <div className="flex items-center justify-center w-[34px] h-[34px] overflow-hidden bg-white text-gray-600 rounded-full shrink-0 self-start">
                      <div className="i-ph:user-fill text-xl"></div>
                    </div>
                  )}
                  <div className="grid grid-col-1 w-full">
                    {isUserMessage ? <UserMessage content={content} /> : <AssistantMessage content={content} />}
                    {experimental_attachments && (
                      <div className="flex flex-col gap-5 p-4">
                        <div className="px-5 flex gap-5">
                          {experimental_attachments && (
                            <div className="flex flex-row gap-2">
                              {Array.from(experimental_attachments).map((attachment, index) => {
                                return (
                                  <div className="relative" key={index}>
                                    <div
                                      className="relative flex rounded-lg border border-bolt-elements-borderColor overflow-hidden">
                                      <PopoverHover>
                                        <PopoverHover.Trigger>
                                          <button className="h-20 w-20 bg-transparent outline-none">
                                            {attachment.contentType && attachment.contentType.includes('image') ? (
                                              <img
                                                className="object-cover w-full h-full"
                                                src={attachment.url}
                                                alt={attachment.name}
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
                                            {attachment.name}
                                          </span>
                                        </PopoverHover.Content>
                                      </PopoverHover>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })
        : null}
      {isStreaming && (
        <div className="text-center w-full text-bolt-elements-textSecondary i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
      )}
    </div>
  );
});
