/**
 * ログインプロンプトコンポーネント
 *
 * 未認証時に表示されるログイン誘導UI
 * ShadowDOM対応のためインラインスタイルを使用
 */

import React from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

export const LoginPrompt: React.FC = () => {
  const { requestLogin } = useSupabaseAuth();

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

      {/* Login prompt */}
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
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          <img
            src={chrome.runtime.getURL('assets/img/icon-128.png')}
            alt="Screenity"
            style={{
              width: '64px',
              height: '64px',
              marginBottom: '16px',
            }}
          />
          <h1 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
          }}>Screenity へようこそ</h1>
        </div>

        <div style={{
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '24px',
          }}>
            画面録画を開始するにはログインしてください
          </p>

          <button
            onClick={requestLogin}
            style={{
              background: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 32px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3367d6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#4285f4';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = '#2952a3';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = '#3367d6';
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    </>
  );
};
