export const removeTab = async (tabId: number | null) => {
  if (tabId === null) return;

  try {
    const tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        resolve(tab);
      });
    });

    if (tab?.id) {
      chrome.tabs.remove(tab.id);
    }
  } catch {
    // Tab doesn't exist or can't be accessed
  }
};
