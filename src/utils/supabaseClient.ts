/**
 * Supabase認証ユーティリティ
 */

import type { SupabaseUser } from '../types/supabase';
import { getAuthTokens } from './supabaseTokenStorage';

/**
 * 認証状態を取得
 */
export async function getSupabaseAuthState(): Promise<{
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  accessToken: string | null;
}> {
  const { isAuthenticated, user, accessToken } = await getAuthTokens();
  return { isAuthenticated, user, accessToken };
}

/**
 * Webアプリケーションのドメインを取得
 */
export function getWebAppUrl(): string {
  // 開発環境判定（拡張機能IDや他の条件でも可）
  const isDev = !('update_url' in chrome.runtime.getManifest());

  return isDev
    ? process.env.WEBAPP_URL_DEV!
    : process.env.WEBAPP_URL_PROD!;
}
