/**
 * Supabase認証状態をチェック
 *
 * Background Script の SUPABASE_AUTH_CHECK ハンドラーを呼び出す
 */

interface AuthStatusResult {
  authenticated: boolean;
  user: unknown | null;
  subscribed: boolean;
  proSubscription: unknown | null;
  cached: boolean;
}

/**
 * Supabase認証状態をチェック
 *
 * @returns 認証状態とユーザー情報
 */
export const checkAuthStatus = async (): Promise<AuthStatusResult> => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SUPABASE_AUTH_CHECK',
    });

    const isAuthenticated = response?.isAuthenticated || false;

    return {
      authenticated: isAuthenticated,
      user: response?.user || null,
      // サブスクリプション管理は実装しないため、認証成功時は常にtrue
      subscribed: isAuthenticated,
      proSubscription: null,
      cached: false,
    };
  } catch (error) {
    console.error('❌ Error checking Supabase auth status:', error);
    return {
      authenticated: false,
      user: null,
      subscribed: false,
      proSubscription: null,
      cached: false,
    };
  }
};
