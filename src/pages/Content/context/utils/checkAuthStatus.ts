interface AuthStatusResponse {
  authenticated: boolean;
  user?: unknown;
  subscribed?: boolean;
  proSubscription?: unknown;
  cached?: boolean;
}

interface AuthStatusResult {
  authenticated: boolean;
  user: unknown | null;
  subscribed: boolean;
  proSubscription: unknown | null;
  cached: boolean;
}

export const checkAuthStatus = async (): Promise<AuthStatusResult> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "check-auth-status" },
      (response: AuthStatusResponse) => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ Error checking auth status:",
            chrome.runtime.lastError.message
          );
          resolve({
            authenticated: false,
            user: null,
            subscribed: false,
            proSubscription: null,
            cached: false,
          });
        } else {
          resolve({
            authenticated: !!response?.authenticated,
            user: response?.user ?? null,
            subscribed: !!response?.subscribed,
            proSubscription: response?.proSubscription ?? null,
            cached: response?.cached ?? false,
          });
        }
      }
    );
  });
};
