/**
 * Supabaseセッション同期ロジック
 */

import type { SupabaseSessionResponse } from '../../types/supabase';
import { getWebAppUrl } from '../../utils/supabaseClient';

const WEB_APP_URL = getWebAppUrl();

export async function syncSession(): Promise<void> {
  try {
    const sessionUrl = `${WEB_APP_URL}/api/auth/session`;
    console.log('🔐 Supabase Auth Sync: Fetching session...');
    console.log('   URL:', sessionUrl);
    console.log('   WEB_APP_URL:', WEB_APP_URL);

    // Webアプリの/api/auth/sessionエンドポイントを呼び出し
    const response = await fetch(sessionUrl, {
      credentials: 'include', // Cookie を含める（重要）
    });

    // 詳細なレスポンス情報をログ出力
    console.log('🔐 Response details:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   URL:', response.url);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('🔐 Supabase Auth Sync: No active session');
      } else {
        console.error('🔐 Supabase Auth Sync: Session fetch failed', response.status);
        // エラーレスポンスの本文を取得
        const responseText = await response.text();
        console.error('   Response body (first 500 chars):', responseText.substring(0, 500));
      }

      // セッションが無効な場合は削除
      await chrome.storage.sync.remove([
        'supabase_access_token',
        'supabase_refresh_token',
        'supabase_user',
        'supabase_expires_at',
      ]);

      await chrome.storage.sync.set({
        supabase_authenticated: false,
      });

      return;
    }

    // レスポンスのContent-Typeをチェック
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Unexpected Content-Type:', contentType);
      const responseText = await response.text();
      console.error('   Response body (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Expected JSON response but got: ${contentType}`);
    }

    const data: SupabaseSessionResponse = await response.json();

    if (data && data.access_token) {
      // トークンをChrome Storageに保存
      await chrome.storage.sync.set({
        supabase_access_token: data.access_token,
        supabase_refresh_token: data.refresh_token,
        supabase_user: data.user,
        supabase_expires_at: data.expires_at,
        supabase_authenticated: true,
      });

      console.log('✅ Supabase Auth Sync: Session synced successfully');
      console.log('   User:', data.user.email);
      console.log('   Expires at:', new Date(data.expires_at * 1000).toISOString());

      // Background scriptに通知
      try {
        await chrome.runtime.sendMessage({
          type: 'SUPABASE_SESSION_SYNCED',
          payload: {
            user: data.user,
            expiresAt: data.expires_at,
          },
        });
      } catch (err) {
        // Background scriptが応答しない場合は無視
        console.warn('🔐 Background script not available:', err);
      }
    }
  } catch (error) {
    console.error('❌ Supabase Auth Sync: Error syncing session:', error);
  }
}
