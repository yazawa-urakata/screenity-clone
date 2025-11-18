/**
 * Supabase認証状態管理Hook
 *
 * Reactの状態管理パターンに従った認証フック
 */

import { useState, useEffect } from 'react';
import type { SupabaseUser } from '../../../types/supabase';

interface UseSupabaseAuthReturn {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean;
  requestLogin: () => void;
  logout: () => void;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();

    // ストレージの変更を監視
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      if (namespace === 'sync' && changes['supabase_authenticated']) {
        checkAuthState();
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const checkAuthState = () => {
    chrome.storage.sync.get(
      [
        'supabase_authenticated',
        'supabase_user',
      ],
      (data) => {
        setIsAuthenticated(!!data['supabase_authenticated']);
        setUser((data['supabase_user'] as SupabaseUser | undefined) || null);
        setIsLoading(false);
      }
    );
  };

  const requestLogin = () => {
    chrome.runtime.sendMessage({ type: 'SUPABASE_LOGIN_REQUEST' });
    window.close(); // ポップアップを閉じる
  };

  const logout = () => {
    chrome.runtime.sendMessage({ type: 'SUPABASE_LOGOUT' });
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    requestLogin,
    logout,
  };
}
