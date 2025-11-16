import { MessageType, MessageHandler, BaseMessage } from '../types/message';

const handlers: Record<string, MessageHandler> = {};

export const registerMessage = (
  type: MessageType,
  handler: MessageHandler
): void => {
  if (handlers[type]) {
    console.warn(
      `⚠️ Handler for ${type} already exists in this context. Skipping.`
    );
    return;
  }
  handlers[type] = handler;
};

export const messageDispatcher = (
  message: BaseMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean | void => {
  const handler = handlers[message.type];

  if (handler) {
    try {
      const result = handler(message, sender, sendResponse);

      if (result instanceof Promise) {
        result
          .then((response) => {
            sendResponse(response);
          })
          .catch((err: Error) => {
            sendResponse({ error: err.message });
          });

        return true;
      } else {
        sendResponse(result);
      }
    } catch (err) {
      sendResponse({ error: (err as Error).message });
    }
  }
};

export const messageRouter = (): void => {
  chrome.runtime.onMessage.addListener(
    (
      message: BaseMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      const result = messageDispatcher(message, sender, sendResponse);

      if (result === true || (result && typeof result === 'object' && 'then' in result)) {
        return true;
      }
    }
  );
};
