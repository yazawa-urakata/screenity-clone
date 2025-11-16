export const isPinned = async (): Promise<boolean> => {
  try {
    const userSettings = await chrome.action.getUserSettings();
    return userSettings.isOnToolbar;
  } catch (error) {
    console.error(
      "Failed to check if the extension is pinned:",
      (error as Error).message
    );
    return false;
  }
};

export const getPlatformInfo = async (): Promise<chrome.runtime.PlatformInfo | null> => {
  try {
    return await chrome.runtime.getPlatformInfo();
  } catch (error) {
    console.error("Failed to retrieve platform info:", (error as Error).message);
    return null;
  }
};

export const resizeWindow = async (
  width: number,
  height: number
): Promise<void> => {
  if (width === 0 || height === 0) {
    return;
  }

  const window = await chrome.windows.getCurrent();
  await chrome.windows.update(window.id!, {
    width,
    height,
  });
};

interface MemoryEstimate {
  data?: StorageEstimate;
  error?: string;
}

export const checkAvailableMemory = async (): Promise<MemoryEstimate> => {
  try {
    const data = await navigator.storage.estimate();

    return { data };
  } catch (error) {
    console.error("Failed to estimate memory:", error);
    return { error: (error as Error).message };
  }
};
