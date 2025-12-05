/**
 * リトライユーティリティ
 * 指数バックオフによるリトライ処理を提供
 */

import type { RetryConfig } from "../../types/instantUpload";

export const DEFAULT_RETRY_CONFIG: Record<string, RetryConfig> = {
  initiate: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  partUrl: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 16000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  s3Put: {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 16000,
    backoffMultiplier: 2,
    retryableStatusCodes: [403, 408, 429, 500, 502, 503, 504],
  },
  complete: {
    maxAttempts: 5,
    initialDelayMs: 2000,
    maxDelayMs: 32000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  abort: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ErrorWithStatus {
  status?: number;
}

function isRetryableError(error: unknown, config: RetryConfig): boolean {
  // ネットワークエラー
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // HTTPステータスコードによる判定
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as ErrorWithStatus).status;
    if (typeof status === "number") {
      return config.retryableStatusCodes.includes(status);
    }
  }

  return false;
}

/**
 * 指数バックオフによるリトライ処理
 */
export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context?: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(
        `[Retry] ${context || "Unknown"} - Attempt ${attempt}/${config.maxAttempts}`,
      );
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // リトライ可能なエラーかチェック
      if (!isRetryableError(error, config)) {
        console.error(
          `[Retry] ${context || "Unknown"} - Non-retryable error:`,
          error,
        );
        throw error;
      }

      // 最後の試行の場合はリトライしない
      if (attempt === config.maxAttempts) {
        console.error(`[Retry] ${context || "Unknown"} - Max attempts reached`);
        break;
      }

      // 遅延時間を計算
      const delayMs = Math.min(
        config.initialDelayMs * config.backoffMultiplier ** (attempt - 1),
        config.maxDelayMs,
      );

      console.warn(
        `[Retry] ${context || "Unknown"} - Attempt ${attempt} failed, retrying in ${delayMs}ms...`,
        error,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * 認証エラー時のトークン再取得 + リトライ
 */
export async function retryWithAuthRefresh<T>(
  fn: () => Promise<T>,
  getNewToken: () => Promise<string>,
  config: RetryConfig,
  context?: string,
): Promise<T> {
  try {
    return await exponentialBackoff(fn, config, context);
  } catch (error) {
    // 認証エラー (401) の場合、トークンを再取得して1回だけ再試行
    if (error instanceof Error && error.message.includes("401")) {
      console.warn(
        `[AuthRetry] ${context || "Unknown"} - Refreshing auth token...`,
      );

      // トークン再取得（副作用で認証状態を更新）
      void (await getNewToken());
      console.log(
        `[AuthRetry] ${context || "Unknown"} - Retrying with new token...`,
      );

      return await fn(); // 1回だけ再試行
    }

    throw error;
  }
}
