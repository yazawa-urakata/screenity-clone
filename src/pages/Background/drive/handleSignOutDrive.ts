export const handleSignOutDrive = async (): Promise<void> => {
  const { token } = await chrome.storage.local.get(["token"]);
  const tokenStr = token as string | undefined;

  if (tokenStr) {
    const url = "https://accounts.google.com/o/oauth2/revoke?token=" + tokenStr;
    fetch(url);

    chrome.identity.removeCachedAuthToken({ token: tokenStr });
  }

  chrome.storage.local.set({ token: false });
};
