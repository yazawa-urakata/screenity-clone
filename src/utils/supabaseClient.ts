/**
 * Supabase認証ユーティリティ
 */

import type { SupabaseUser } from '../types/supabase';

/**
 * chrome.storage.syncからSupabaseトークンを取得してヘッダーを生成
 */
export async function getSupabaseHeaders(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['supabase_access_token'], (data) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      };

      if (data['supabase_access_token']) {
        headers['Authorization'] =
          `Bearer ${data['supabase_access_token']}`;
      }

      resolve(headers);
    });
  });
}

/**
 * Supabase APIリクエストのヘルパー関数
 *
 * @param path - APIパス（例: 'recordings?select=*'）
 * @param options - fetch options
 */
export async function supabaseRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: any }> {
  const headers = await getSupabaseHeaders();

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`,
      {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * 認証状態を取得
 */
export async function getSupabaseAuthState(): Promise<{
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  accessToken: string | null;
}> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        'supabase_access_token',
        'supabase_user',
        'supabase_authenticated',
      ],
      (data) => {
        resolve({
          isAuthenticated: !!data['supabase_authenticated'],
          user: (data['supabase_user'] as SupabaseUser | undefined) || null,
          accessToken: (data['supabase_access_token'] as string | undefined) || null,
        });
      }
    );
  });
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
