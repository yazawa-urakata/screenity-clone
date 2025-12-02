/**
 * Supabase トークンストレージ管理モジュール
 * 
 * chrome.storage.session を使用して、セッション限定でトークンを安全に管理します。
 * 
 * セキュリティ上の利点:
 * - インメモリストレージ（ディスクに書き込まれない）
 * - セッション限定（ブラウザを閉じると自動的にクリア）
 * - デフォルトで Content scripts からアクセス不可
 * 
 * @see https://developer.chrome.com/docs/extensions/reference/storage/#property-session
 */

import type { SupabaseUser } from '../types/supabase';

/**
 * ストレージキーの定義
 * 
 * 一箇所で管理することで、将来的な変更を容易にする
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'supabase_access_token',
  USER: 'supabase_user',
  EXPIRES_AT: 'supabase_expires_at',
  AUTHENTICATED: 'supabase_authenticated',
} as const;

/**
 * 認証トークンの型定義
 */
interface AuthTokens {
  accessToken: string;
  user: SupabaseUser;
  expiresAt: number;
}

/**
 * 認証状態の型定義
 */
interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: SupabaseUser | null;
  expiresAt: number | null;
}

/**
 * トークンと認証情報を保存
 * 
 * @param tokens - 保存するトークンとユーザー情報
 * @returns Promise<void>
 * 
 * @example
 * await setAuthTokens({
 *   accessToken: 'eyJ...',
 *   user: { id: '123', email: 'user@example.com', ... },
 *   expiresAt: 1234567890
 * });
 */
export async function setAuthTokens(tokens: AuthTokens): Promise<void> {
  if (!chrome.storage.session) {
    console.warn('⚠️ chrome.storage.session is not available in this context');
    return;
  }

  await chrome.storage.session.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: tokens.accessToken,
    [STORAGE_KEYS.USER]: tokens.user,
    [STORAGE_KEYS.EXPIRES_AT]: tokens.expiresAt,
    [STORAGE_KEYS.AUTHENTICATED]: true,
  });

  console.log('✅ Supabase tokens saved to session storage');
}

/**
 * トークンと認証情報を取得
 * 
 * @returns Promise<AuthState> - 認証状態とトークン情報
 * 
 * @example
 * const { isAuthenticated, accessToken, user } = await getAuthTokens();
 * if (isAuthenticated) {
 *   console.log('User:', user.email);
 * }
 */
export async function getAuthTokens(): Promise<AuthState> {
  if (!chrome.storage.session) {
    console.warn('⚠️ chrome.storage.session is not available in this context');
    return {
      isAuthenticated: false,
      accessToken: null,
      user: null,
      expiresAt: null,
    };
  }

  return new Promise((resolve) => {
    chrome.storage.session.get(
      [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.EXPIRES_AT,
        STORAGE_KEYS.AUTHENTICATED,
      ],
      (data) => {
        resolve({
          isAuthenticated: !!data[STORAGE_KEYS.AUTHENTICATED],
          accessToken: (data[STORAGE_KEYS.ACCESS_TOKEN] as string | undefined) || null,
          user: (data[STORAGE_KEYS.USER] as SupabaseUser | undefined) || null,
          expiresAt: (data[STORAGE_KEYS.EXPIRES_AT] as number | undefined) || null,
        });
      }
    );
  });
}

/**
 * すべての認証情報をクリア
 * 
 * ログアウト時やセッション期限切れ時に使用します。
 * 
 * @returns Promise<void>
 * 
 * @example
 * await clearAuthTokens();
 * console.log('User logged out');
 */
export async function clearAuthTokens(): Promise<void> {
  if (!chrome.storage.session) {
    console.warn('⚠️ chrome.storage.session is not available in this context');
    return;
  }

  await chrome.storage.session.remove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.EXPIRES_AT,
    STORAGE_KEYS.AUTHENTICATED,
  ]);

  console.log('🔐 Supabase tokens cleared from session storage');
}
