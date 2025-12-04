import { offscreenDocument } from "../offscreen/offscreenDocument";

export const desktopCapture = async (request) => {
  // Ensure that chunk sending is marked as not in progress
  chrome.storage.local.set({ sendingChunks: false });

  // Proceed with offscreen document creation
  offscreenDocument(request);
};
