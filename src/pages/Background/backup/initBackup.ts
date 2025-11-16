import { sendMessageTab } from "../tabManagement";

export const initBackup = async (request: unknown, id: number): Promise<void> => {
  const { backupTab } = await chrome.storage.local.get(["backupTab"]);
  const backupURL = chrome.runtime.getURL("backup.html");

  const createBackupTab = (): void => {
    chrome.tabs.create(
      {
        url: backupURL,
        active: true,
        pinned: true,
        index: 0,
      },
      (tab: chrome.tabs.Tab) => {
        chrome.storage.local.set({ backupTab: tab.id });
        chrome.tabs.onUpdated.addListener(function listener(
          tabId: number,
          changeInfo
        ) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            sendMessageTab(tab.id as number, {
              type: "init-backup",
              request: request,
              tabId: id,
            });
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      }
    );
  };

  if (backupTab) {
    chrome.tabs.get(backupTab as number, (tab?: chrome.tabs.Tab) => {
      if (tab) {
        sendMessageTab(tab.id as number, {
          type: "init-backup",
          request: request,
          tabId: id,
        });
      } else {
        createBackupTab();
      }
    });
  } else {
    createBackupTab();
  }
};
