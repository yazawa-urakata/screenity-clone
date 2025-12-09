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

export interface SupabaseSessionResponse {
  access_token: string;
  expires_in: number;
  expires_at: number;
  user: SupabaseUser;
}
