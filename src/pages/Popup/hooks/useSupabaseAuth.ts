/**
 * Supabase認証状態管理Hook
 *
 * Reactの状態管理パターンに従った認証フック
 * 
 * Important: PopupページはExtension Pageですが、chrome.storage.sessionへの
 * 直接アクセスではなく、Background Script経由でアクセスすることを推奨します。
 * これにより、Content Scriptとの整合性を保ち、アクセス制御を統一できます。
 */

import { useState, useEffect } from 'react';
import type { SupabaseUser } from '../../../types/supabase';

interface UseSupabaseAuthReturn {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean;
  requestLogin: () => void;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();

    // Background Scriptからのメッセージを監視
    const messageListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (message.type === 'AUTH_STATE_CHANGED') {
        console.log('📢 Popup: Received AUTH_STATE_CHANGED from Background Script');
        checkAuthState();
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // ストレージの変更を監視（フォールバック）
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      // session storage の認証関連キーの変更を検知
      if (namespace === 'session') {
        const authKeys = [
          'supabase_authenticated',
          'supabase_access_token',
          'supabase_user',
          'supabase_expires_at',
        ];

        // いずれかの認証関連キーが変更されたら認証状態を再チェック
        const hasAuthChange = authKeys.some((key) => key in changes);

        if (hasAuthChange) {
          console.log('🔄 Popup: Auth state changed in storage, refreshing...');
          checkAuthState();
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, []);

  const checkAuthState = async () => {
    try {
      // Background Script経由で認証状態を取得
      const response = await chrome.runtime.sendMessage({
        type: 'SUPABASE_AUTH_CHECK',
      });

      if (response) {
        setIsAuthenticated(response.isAuthenticated || false);
        setUser(response.user || null);
      }
    } catch (error) {
      console.error('⚠️ Failed to check auth state:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const requestLogin = () => {
    console.log('🔐 Popup: requestLogin called');
    chrome.runtime.sendMessage({ type: 'SUPABASE_LOGIN_REQUEST' });
    console.log('🔐 Popup: SUPABASE_LOGIN_REQUEST message sent');
    // Note: ポップアップは自動的に閉じない
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    requestLogin,
  };
}
