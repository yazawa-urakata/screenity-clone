/**
 * Supabase認証関連の型定義
 */

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'Bearer';
  user: SupabaseUser;
}

export interface SupabaseSessionResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: SupabaseUser;
}

export interface SupabaseAuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  accessToken: string | null;
  expiresAt: number | null;
}

export interface SupabaseAuthError {
  error: string;
  message?: string;
}
