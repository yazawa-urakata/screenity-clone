import { sendMessageTab } from "../tabManagement";

export const sendMessageRecord = (message: any, responseCallback: ((response: any) => void) | null = null) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["recordingTab", "offscreen"], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError.message);
      }

      if (result.offscreen) {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else {
            responseCallback ? responseCallback(response) : resolve(response);
          }
        });
      } else {
        sendMessageTab(result.recordingTab as number, message, responseCallback)
          .then(resolve)
          .catch(reject);
      }
    });
  });
};
