import { onActionButtonClickedListener } from "./onActionButtonClickedListener";
import { onCommandListener } from "./onCommandListener";
import { onInstalledListener } from "./onInstalledListener";
import { onStartupListener } from "./onStartupListener";
import { onTabActivatedListener } from "./onTabActivatedListener";
import { onTabRemovedListener } from "./onTabRemovedListener";
import { onTabUpdatedListener } from "./onTabUpdatedListener";
import { onWindowFocusChangedListener } from "./onWindowFocusChangedListener";

// Initialize all listeners
export const initializeListeners = (): void => {
  onCommandListener();
  onInstalledListener();
  onTabRemovedListener();
  onTabActivatedListener();
  onTabUpdatedListener();
  chrome.windows.onFocusChanged.addListener(onWindowFocusChangedListener);
  onActionButtonClickedListener();
  onStartupListener();
};
