/**
 * Supabase認証管理
 *
 * Background scriptで動作する認証管理ロジック
 */

import type { SupabaseUser } from "../../../types/supabase";
import { getAuthTokens } from "../../../utils/supabaseTokenStorage";

/**
 * 認証状態をチェック
 *
 * @returns 認証済みかどうか
 */
export async function checkSupabaseAuth(): Promise<{
  isAuthenticated: boolean;
  user: SupabaseUser | null;
}> {
  const { isAuthenticated, user, expiresAt } = await getAuthTokens();

  // トークンの有効期限チェック
  if (isAuthenticated && expiresAt) {
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      console.warn("⚠️ Supabase token expired");
      return { isAuthenticated: false, user: null };
    }
  }

  return {
    isAuthenticated,
    user,
  };
}

/**
 * ログインページを開く
 */
export async function openLoginPage(): Promise<void> {
  console.log("🔐 openLoginPage: Starting...");

  // Service Workerでは document が存在しないため、dynamic importせず直接実装
  // 開発環境判定（拡張機能IDや他の条件でも可）
  const isDev = !("update_url" in chrome.runtime.getManifest());
  const webAppUrl = isDev
    ? process.env.WEBAPP_URL_DEV!
    : process.env.WEBAPP_URL_PROD!;

  console.log("🔐 openLoginPage: webAppUrl =", webAppUrl);
  console.log("🔐 openLoginPage: isDev =", isDev);

  const loginUrl = `${webAppUrl}/login?source=chrome-extension`;
  console.log("🔐 openLoginPage: Opening URL =", loginUrl);

  const tab = await chrome.tabs.create({
    url: loginUrl,
  });

  console.log("✅ openLoginPage: Tab created, ID =", tab.id);
}
