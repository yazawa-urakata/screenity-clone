import { sendMessageTab } from "../tabManagement";

export const setSurface = async (request: any) => {
  await chrome.storage.local.set({ surface: request.surface });
  const { activeTab } = await chrome.storage.local.get(["activeTab"]);

  sendMessageTab(activeTab as number, {
    type: "set-surface",
    surface: request.surface,
    subscribed: false,
  });
};
