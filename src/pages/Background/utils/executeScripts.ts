export const executeScripts = async (): Promise<void> => {
  const contentScripts = chrome.runtime.getManifest().content_scripts;
  if (!contentScripts) return;

  const tabQueries = contentScripts.map((cs) =>
    chrome.tabs.query({ url: cs.matches })
  );
  const tabResults = await Promise.all(tabQueries);

  const executeScriptPromises: Promise<chrome.scripting.InjectionResult<any>[]>[] = [];
  for (let i = 0; i < tabResults.length; i++) {
    const tabs = tabResults[i];
    const cs = contentScripts[i];

    for (const tab of tabs) {
      if (tab.id && cs.js) {
        const executeScriptPromise = chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: cs.js,
        }).catch(() => {
          // Handle errors silently (chrome.runtime.lastError is handled internally)
          return [];
        });
        executeScriptPromises.push(executeScriptPromise);
      }
    }
  }

  await Promise.all(executeScriptPromises);
};
