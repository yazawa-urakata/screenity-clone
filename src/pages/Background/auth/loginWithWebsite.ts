import { getCurrentTab, sendMessageTab } from "../tabManagement";

const API_BASE = process.env.SCREENITY_API_BASE_URL;
const CLOUD_FEATURES_ENABLED =
  process.env.SCREENITY_ENABLE_CLOUD_FEATURES === "true";

interface User {
  id: string;
  email: string;
  name?: string;
  [key: string]: unknown;
}

interface Subscription {
  id: string;
  status: string;
  [key: string]: unknown;
}

interface LoginResult {
  authenticated: boolean;
  user?: User;
  subscribed?: boolean;
  proSubscription?: Subscription | null;
  hasSubscribedBefore?: boolean;
  cached?: boolean;
  instantMode: boolean;
}

interface AuthResponse {
  subscribed: boolean;
  subscription: Subscription | null;
  hasSubscribedBefore: boolean;
  [key: string]: unknown;
}

export const loginWithWebsite = async (): Promise<LoginResult> => {
  if (!CLOUD_FEATURES_ENABLED) {
    return { authenticated: false, instantMode: false };
  }
  const { screenityToken, lastAuthCheck, instantMode } =
    await chrome.storage.local.get([
      "screenityToken",
      "lastAuthCheck",
      "instantMode",
    ]);

  if (!screenityToken) {
    return { authenticated: false, instantMode: false };
  }

  const now = Date.now();
  const FRESH_FOR = 1000 * 60 * 60 * 4; // 4 hours

  if (lastAuthCheck && now - (lastAuthCheck as number) < FRESH_FOR) {
    const {
      screenityUser,
      isSubscribed,
      proSubscription,
      hasSubscribedBefore,
    } = await chrome.storage.local.get([
      "screenityUser",
      "isSubscribed",
      "proSubscription",
      "hasSubscribedBefore",
    ]);

    if (!screenityUser) return { authenticated: false, instantMode: false };

    chrome.storage.local.set({ onboarding: false });

    const { originalTabId } = await chrome.storage.local.get("originalTabId");

    if (originalTabId) {
      chrome.tabs.update(originalTabId as number, { active: true });

      sendMessageTab(originalTabId as number, { type: "LOGIN_SUCCESS" });

      sendMessageTab(originalTabId as number, {
        type: "check-auth",
      });
    }

    return {
      authenticated: true,
      user: screenityUser as User,
      subscribed: (isSubscribed as boolean) || false,
      proSubscription: (proSubscription as Subscription | null) || null,
      hasSubscribedBefore: !!(hasSubscribedBefore as boolean),
      cached: true,
      instantMode: (instantMode as boolean) || false,
    };
  }

  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${screenityToken}`,
      },
    });

    if (!response.ok) throw new Error("Token invalid");

    const responseData = (await response.json()) as AuthResponse;
    const { subscribed, subscription, hasSubscribedBefore, ...user } =
      responseData;

    await chrome.storage.local.set({
      screenityUser: user,
      lastAuthCheck: now,
      isSubscribed: subscribed,
      proSubscription: subscription,
      hasSubscribedBefore: !!hasSubscribedBefore,
      onboarding: false,
      showProSplash: false,
    });

    const { originalTabId } = await chrome.storage.local.get("originalTabId");

    if (originalTabId) {
      chrome.tabs.update(originalTabId as number, { active: true });

      sendMessageTab(originalTabId as number, { type: "LOGIN_SUCCESS" });

      sendMessageTab(originalTabId as number, {
        type: "check-auth",
      });
    }

    return {
      authenticated: true,
      user: user as User,
      subscribed: !!subscribed,
      proSubscription: subscription,
      hasSubscribedBefore: !!hasSubscribedBefore,
      cached: false,
      instantMode: (instantMode as boolean) || false,
    };
  } catch (err) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        credentials: "include",
      });
      if (refreshRes.ok) {
        const { token: newToken } = (await refreshRes.json()) as { token: string };
        await chrome.storage.local.set({ screenityToken: newToken });

        return await loginWithWebsite();
      }
    } catch (refreshErr) {
      console.error("❌ Refresh failed:", (refreshErr as Error).message);
    }

    // If refresh also fails fully log out
    await chrome.storage.local.remove([
      "screenityToken",
      "screenityUser",
      "lastAuthCheck",
      "isSubscribed",
      "proSubscription",
    ]);
    return { authenticated: false, instantMode: false };
  }
};
