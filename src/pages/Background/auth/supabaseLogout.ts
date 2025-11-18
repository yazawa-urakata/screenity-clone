/**
 * Supabaseログアウト処理
 */

import { getWebAppUrl } from '../../../utils/supabaseClient';

export async function supabaseLogout(): Promise<void> {
  console.log('🔐 Supabase logout initiated');

  // Chrome Storageから認証情報を削除
  await chrome.storage.sync.remove([
    'supabase_access_token',
    'supabase_refresh_token',
    'supabase_user',
    'supabase_expires_at',
  ]);

  await chrome.storage.sync.set({
    supabase_authenticated: false,
  });

  // Webアプリのログアウトエンドポイントを呼び出し（オプション）
  try {
    const webAppUrl = getWebAppUrl();
    await fetch(`${webAppUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.warn('⚠️ Webアプリへのログアウト通知失敗:', error);
    // エラーは無視（拡張機能側のログアウトは完了している）
  }

  console.log('✅ Supabase logout completed');
}
