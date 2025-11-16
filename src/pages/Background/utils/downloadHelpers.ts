import { sendMessageTab } from "../tabManagement";

export const requestDownload = async (
  base64: string,
  title: string
): Promise<void> => {
  try {
    // Open a new tab with the download page
    const tab = await chrome.tabs.create({
      url: "download.html",
      active: false,
    });

    // Add a listener for when the tab finishes loading
    const listener = (
      tabId: number,
      changeInfo: { status?: string; url?: string; }
    ) => {
      if (tabId === tab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);

        // Send the message with the download data
        sendMessageTab(tab.id!, {
          type: "download-video",
          base64,
          title,
        });
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  } catch (error) {
    console.error("Failed to request download:", (error as Error).message);
  }
};

export const downloadIndexedDB = async (): Promise<void> => {
  try {
    // Open a new tab with the download page
    const tab = await chrome.tabs.create({
      url: "download.html",
      active: false,
    });

    // Add a listener for when the tab finishes loading
    const listener = (
      tabId: number,
      changeInfo: { status?: string; url?: string; }
    ) => {
      if (tabId === tab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);

        // Send the message to trigger the IndexedDB download
        sendMessageTab(tab.id!, {
          type: "download-indexed-db",
        });
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  } catch (error) {
    console.error("Failed to initiate IndexedDB download:", (error as Error).message);
  }
};
