/**
 * Supabase認証状態管理Hook（Sandbox用）
 *
 * Important: SandboxページはExtension Pageですが、chrome.storage.sessionへの
 * 直接アクセスではなく、Background Script経由でアクセスすることを推奨します。
 * これにより、Content Scriptとの整合性を保ち、アクセス制御を統一できます。
 */

import { useState, useEffect } from "react";
import type { SupabaseAuthState } from "../types/s3Upload";

interface UseSupabaseAuthReturn {
  /** 認証状態オブジェクト */
  authState: SupabaseAuthState;
  /** ローディング状態 */
  loading: boolean;
  /** ログインページを新しいタブで開く */
  openLoginPage: () => void;
  /** 認証状態を再取得 */
  refreshAuth: () => void;
}

/**
 * Supabase認証フック
 *
 * @returns 認証状態と認証関連の関数
 */
export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [authState, setAuthState] = useState<SupabaseAuthState>({
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初回ロード時に認証状態を取得
    loadAuthState();

    // Chrome Storageの変更を監視
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      // session storage の認証関連の変更を検知
      if (namespace === "session") {
        const authKeys = [
          "supabase_access_token",
          "supabase_expires_at",
          "supabase_authenticated",
        ];

        const hasAuthChange = authKeys.some((key) => key in changes);
        if (hasAuthChange) {
          loadAuthState();
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    // クリーンアップ
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  /**
   * Background Scriptから認証状態を読み込む
   */
  const loadAuthState = async (): Promise<void> => {
    try {
      // Background Script経由で認証状態を取得
      const response = await chrome.runtime.sendMessage({
        type: 'SUPABASE_AUTH_CHECK',
      });

      if (response) {
        // Background Script側で有効期限チェックも行われる
        setAuthState({
          isAuthenticated: response.isAuthenticated || false,
          accessToken: null, // セキュリティのため、アクセストークンはSandboxには渡さない
          refreshToken: null,
          expiresAt: null,
        });
      }
    } catch (error) {
      console.error('⚠️ Failed to load auth state:', error);
      setAuthState({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * ログインページを新しいタブで開く
   */
  const openLoginPage = (): void => {
    // Background scriptに対してログインリクエストを送信
    chrome.runtime.sendMessage({ type: "SUPABASE_LOGIN_REQUEST" });
  };

  /**
   * 認証状態を再取得
   */
  const refreshAuth = (): void => {
    setLoading(true);
    loadAuthState();
  };

  return {
    authState,
    loading,
    openLoginPage,
    refreshAuth,
  };
}
