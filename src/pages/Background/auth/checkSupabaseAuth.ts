/**
 * 録画開始前の認証チェック
 *
 * すべての機能で認証を必須とする要件に対応
 */

import { checkSupabaseAuth } from './supabaseAuth';

/**
 * 認証必須の操作を実行する前にチェック
 *
 * @throws Error 未認証の場合
 */
export async function requireSupabaseAuth(): Promise<void> {
  const { isAuthenticated, user } = await checkSupabaseAuth();

  if (!isAuthenticated) {
    throw new Error('Supabase authentication required. Please log in first.');
  }

  console.log('✅ Supabase authentication verified:', user?.email);
}
