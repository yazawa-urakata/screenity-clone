/**
 * Supabase認証状態管理Hook（Sandbox用）
 *
 * Chrome Storageからトークンを取得し、認証状態を管理します。
 * トークンの有効期限チェックやストレージ変更監視を含みます。
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
      // sync storageの認証関連の変更を検知
      if (namespace === "sync") {
        const authKeys = [
          "supabase_access_token",
          "supabase_refresh_token",
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
   * Chrome Storageから認証状態を読み込む
   */
  const loadAuthState = (): void => {
    chrome.storage.sync.get(
      [
        "supabase_access_token",
        "supabase_refresh_token",
        "supabase_expires_at",
        "supabase_authenticated",
      ],
      (data) => {
        const accessToken = (data["supabase_access_token"] as string | undefined) || null;
        const refreshToken = (data["supabase_refresh_token"] as string | undefined) || null;
        const expiresAt = (data["supabase_expires_at"] as number | undefined) || null;
        const authenticated = !!data["supabase_authenticated"];

        // トークンの有効期限チェック
        const now = Math.floor(Date.now() / 1000); // 現在時刻（Unix秒）
        const isTokenValid = expiresAt ? now < expiresAt : false;

        setAuthState({
          isAuthenticated: authenticated && isTokenValid && !!accessToken,
          accessToken,
          refreshToken,
          expiresAt,
        });

        setLoading(false);
      }
    );
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
