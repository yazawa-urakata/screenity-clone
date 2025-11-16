export const focusTab = async (tabId: number | null) => {
  if (tabId === null) return;

  try {
    const tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        resolve(tab);
      });
    });

    if (tab && tab.id && tab.windowId) {
      chrome.windows.update(tab.windowId, { focused: true }).then(() => {
        if (tab.id) {
          chrome.tabs.update(tab.id, { active: true });
        }
      });
    }
  } catch (error) {
    // Tab doesn't exist or can't be accessed
  }
};
