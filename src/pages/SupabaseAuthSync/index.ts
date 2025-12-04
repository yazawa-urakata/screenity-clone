/**
 * Supabase認証同期Content Script
 *
 * このスクリプトはWebアプリケーションのドメインでのみ実行され、
 * Cookie-based認証を利用してSupabaseセッションを取得し、
 * Chrome拡張機能のStorageに同期する。
 */

import { getWebAppUrl } from "../../utils/supabaseClient";
import { syncSession } from "./sessionSync";

const WEB_APP_URL = getWebAppUrl();

// Webアプリのドメインでのみ実行
if (window.location.origin === WEB_APP_URL) {
  /**
   * ログインページでの状態リセット
   *
   * Content Script から chrome.storage.session に直接アクセスできないため、
   * Background Script にメッセージを送信してクリアする
   */
  if (window.location.pathname === "/login") {
    try {
      chrome.runtime.sendMessage({
        type: "SUPABASE_CLEAR_AUTH",
      });
      console.log(
        "🔐 Supabase Auth Sync: Login page detected, requesting auth state reset",
      );
    } catch (err) {
      console.warn("🔐 Could not send auth clear message:", err);
    }
  }

  /**
   * 初回セッション同期
   */
  syncSession();

  /**
   * カスタムログインイベントをリスン
   * Webアプリ側でログインしたときに即座に同期
   */
  console.log("🔐 Supabase Auth Sync: Registering login event listener");
  window.addEventListener("supabase:login", async () => {
    console.log("🔐 Supabase Auth Sync: Login event detected from web app");

    // セッションを同期
    await syncSession();

    console.log("🔐 Supabase Auth Sync: Login session synced");
  });

  /**
   * カスタムログアウトイベントをリスン
   * Webアプリ側でログアウトしたときに即座に同期
   */
  console.log("🔐 Supabase Auth Sync: Registering logout event listener");
  window.addEventListener("supabase:logout", async () => {
    console.log("🔐 Supabase Auth Sync: Logout event detected from web app");

    // 認証情報をクリア
    // Content Script から chrome.storage.session に直接アクセスできないため、
    // Background Script にメッセージを送信してクリアする
    try {
      await chrome.runtime.sendMessage({
        type: "SUPABASE_CLEAR_AUTH",
      });
      console.log("🔐 Supabase Auth Sync: Auth state cleared");
    } catch (err) {
      console.warn("🔐 Could not send auth clear message:", err);
    }

    // Background scriptに通知
    try {
      await chrome.runtime.sendMessage({
        type: "SUPABASE_SESSION_EXPIRED",
      });
    } catch (err) {
      // Background scriptが応答しない場合は無視
      console.warn("🔐 Background script not available:", err);
    }
  });

  console.log("🔐 Supabase Auth Sync: Session sync completed");
}
