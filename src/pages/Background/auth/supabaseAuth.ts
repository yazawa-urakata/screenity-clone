/**
 * Supabase認証管理
 *
 * Background scriptで動作する認証管理ロジック
 */

import type { SupabaseUser } from '../../../types/supabase';
import { getSupabaseAuthState } from '../../../utils/supabaseClient';

/**
 * 認証状態をチェック
 *
 * @returns 認証済みかどうか
 */
export async function checkSupabaseAuth(): Promise<{
  isAuthenticated: boolean;
  user: SupabaseUser | null;
}> {
  const authState = await getSupabaseAuthState();

  // トークンの有効期限チェック
  if (authState.isAuthenticated) {
    const expiresAt = await new Promise<number | null>((resolve) => {
      chrome.storage.sync.get(['supabase_expires_at'], (data) => {
        resolve((data['supabase_expires_at'] as number | undefined) || null);
      });
    });

    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (now > expiresAt) {
        console.warn('⚠️ Supabase token expired');
        return { isAuthenticated: false, user: null };
      }
    }
  }

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
  };
}

/**
 * ログインページを開く
 */
export async function openLoginPage(): Promise<void> {
  const { getWebAppUrl } = await import('../../../utils/supabaseClient');
  const webAppUrl = getWebAppUrl();

  chrome.tabs.create({
    url: `${webAppUrl}/login?source=chrome-extension`,
  });
}
