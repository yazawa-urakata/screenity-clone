export const createTab = async (
  url: string,
  translate = false,
  active = false
): Promise<chrome.tabs.Tab | undefined> => {
  if (!url) return;

  let finalUrl = url;
  if (translate) {
    const locale = chrome.i18n.getMessage("@@ui_locale");
    if (!locale.includes("en")) {
      finalUrl =
        "http://translate.google.com/translate?js=n&sl=auto&tl=" +
        locale +
        "&u=" +
        url;
    }
  }

  return new Promise((resolve) => {
    chrome.tabs.create(
      {
        url: finalUrl,
        active: active,
      },
      (tab) => {
        resolve(tab);
      }
    );
  });
};
