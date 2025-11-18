/**
 * 認証ガードコンポーネント
 *
 * 認証が必要なコンポーネントをラップする
 * ShadowDOM対応のためインラインスタイルを使用
 */

import React from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { LoginPrompt } from './LoginPrompt';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSupabaseAuth();

  if (isLoading) {
    return (
      <>
        {/* Background overlay */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 99999999998,
          pointerEvents: 'auto',
        }} />

        {/* Loading screen */}
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '400px',
          maxWidth: '90vw',
          minHeight: '400px',
          padding: '32px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          zIndex: 99999999999,
          pointerEvents: 'auto',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4285f4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#666',
          }}>読み込み中...</p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <>{children}</>;
};
