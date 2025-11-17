# Chrome Extension 実装のベストプラクティス (Manifest V3)

> 実装経験と Chrome 公式ドキュメントに基づく汎用的なガイドライン

## 目次

1. [メッセージング](#メッセージング)
2. [状態管理とストレージ](#状態管理とストレージ)
3. [Service Worker](#service-worker)
4. [Content Scripts](#content-scripts)
5. [権限管理](#権限管理)
6. [エラーハンドリング](#エラーハンドリング)
7. [型安全性](#型安全性)

---

## メッセージング

### 原則 1: メッセージハンドラーは必ず応答する

**Chrome 公式ドキュメント**:
> "By default, the sendResponse callback must be called synchronously.
> If you want to do asynchronous work, you **must** return a literal `true`."

```typescript
// ❌ BAD: undefined を返すとメッセージポートが閉じる
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message);
  // ← undefined が返される → "message port closed" エラー
});

// ✅ GOOD: 同期処理は値を返す
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = handleMessage(message);
  sendResponse(result);
});

// ✅ GOOD: 非同期処理は true を返す
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageAsync(message).then(sendResponse);
  return true; // 非同期処理を示す
});
```

**実装パターン: Promise ベースの自動ハンドリング**

```typescript
export const messageDispatcher = (
  message: BaseMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean | void => {
  const handler = handlers[message.type];

  if (handler) {
    try {
      const result = handler(message, sender, sendResponse);

      // Promise を自動検出
      if (result instanceof Promise) {
        result
          .then((response) => sendResponse(response))
          .catch((err: Error) => sendResponse({ error: err.message }));
        return true; // 非同期処理を示す
      } else {
        sendResponse(result);
      }
    } catch (err) {
      sendResponse({ error: (err as Error).message });
    }
  }
};
```

---

### 原則 2: sender.tab.id を優先的に使用する

**理由**: `sender.tab.id` はメッセージ送信元のタブ ID を確実に取得できます。Chrome Storage の値は古い可能性があります。

```typescript
// ❌ BAD: Chrome Storage の値のみに依存
async function handleMessage(message, sender) {
  const { recordingTab } = await chrome.storage.local.get(['recordingTab']);
  await chrome.tabs.sendMessage(recordingTab, response);
}

// ✅ GOOD: sender.tab.id を優先
async function handleMessage(message, sender) {
  const { recordingTab } = await chrome.storage.local.get(['recordingTab']);
  const targetTabId = sender.tab?.id || recordingTab;

  if (targetTabId) {
    await chrome.tabs.sendMessage(targetTabId, response);
  }
}
```

---

### 原則 3: メッセージ送信エラーを適切にハンドリングする

**段階的エラーハンドリング**: データ保存 = クリティカル、通知 = 非クリティカル

```typescript
async function handleDataUpdate(message, sender) {
  try {
    // 1. データ保存（最優先）
    await chrome.storage.local.set({ data: message.payload });
    console.log('✅ データ保存成功');

    // 2. 通知送信（失敗しても許容）
    const targetTabId = sender.tab?.id;
    if (targetTabId) {
      try {
        await chrome.tabs.sendMessage(targetTabId, {
          type: 'data-updated',
          payload: message.payload,
        });
        console.log('✅ 通知送信成功');
      } catch (messageError) {
        console.warn('⚠️ 通知送信失敗（データは保存済み）:', messageError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ データ保存エラー:', error);
    throw error;
  }
}
```

---

## 状態管理とストレージ

### 原則 4: Chrome Storage を信頼できる唯一の情報源とする

**Chrome 公式ドキュメント**:
> "The Storage API is accessible from all extension contexts, including service workers and content scripts.
> Data persists even if the user clears cache or browsing history."

**アーキテクチャパターン**:

```
┌─────────────────────────────────────────────────┐
│           Chrome Storage (Single Source of Truth) │
│  ・永続化                                        │
│  ・全コンテキストからアクセス可能                │
│  ・キャッシュクリアの影響を受けない              │
└─────────────────────────────────────────────────┘
           ↕                          ↕
   ┌───────────────┐        ┌───────────────┐
   │ Service Worker │        │ Content Script │
   │  (Background)  │        │    (UI Layer)  │
   │                │        │                │
   │ ・データ保存   │        │ ・UI更新       │
   │ ・ビジネスロジック│      │ ・楽観的更新   │
   └───────────────┘        └───────────────┘
```

---

### 原則 5: Storage 同期パターンを実装する

**パターン 1: 楽観的 UI 更新 + Storage 同期**

```typescript
// Content Script: ユーザーアクション
async function handleUserAction(data) {
  // 1. 楽観的 UI 更新（即座にフィードバック）
  setContentState((prev) => ({
    ...prev,
    items: [...prev.items, data],
  }));

  // 2. Background に保存リクエスト
  chrome.runtime.sendMessage({
    type: 'save-data',
    payload: { data },
  });
}

// Content Script: 保存完了通知を受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'data-saved') {
    // 3. Chrome Storage から最新データを取得して同期
    chrome.storage.local.get(['items'], (result) => {
      setContentState((prev) => ({
        ...prev,
        items: result.items || [],
      }));
    });

    sendResponse({ success: true });
  }
});
```

**パターン 2: Storage Change Listener による自動同期**

```typescript
// Content Script または Service Worker
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.items?.newValue) {
    console.log('✅ Storage が更新されました');

    // 状態を自動同期
    setContentState((prev) => ({
      ...prev,
      items: changes.items.newValue,
    }));
  }
});
```

---

### 原則 6: 非同期ストレージプリロードを実装する

**Chrome 公式ドキュメント**:
> "Asynchronously retrieve data from storage.sync before executing event handlers."

```typescript
// Service Worker での実装例
const storageCache: Record<string, any> = {};

// 起動時にストレージをプリロード
const initStorageCache = chrome.storage.local.get().then((items) => {
  Object.assign(storageCache, items);
});

// イベントハンドラーでキャッシュを使用
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await initStorageCache; // キャッシュの準備を待つ
  } catch (e) {
    console.error('Storage 初期化エラー:', e);
  }

  // キャッシュを使用してビジネスロジックを実行
  storageCache.count = (storageCache.count || 0) + 1;
  storageCache.lastTabId = tab.id;

  chrome.storage.local.set(storageCache);
});
```

---

## Service Worker

### 原則 7: Service Worker はイベント駆動として設計する

**Chrome 公式ドキュメント**:
> "Extension service workers serve as 'an extension's central event handler.'
> Service workers load when needed and unload during dormancy."

**重要な制約**:

- ✅ DOM アクセス不可
- ✅ イベント駆動型（必要時のみ起動）
- ✅ グローバル変数は休止時にリセットされる

```typescript
// ❌ BAD: グローバル変数に依存
let userData = null; // Service Worker 休止時に失われる

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'get-user-data') {
    return userData; // null になる可能性
  }
});

// ✅ GOOD: Chrome Storage を使用
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'get-user-data') {
    chrome.storage.local.get(['userData'], (result) => {
      sendResponse(result.userData);
    });
    return true; // 非同期
  }
});
```

---

### 原則 8: Service Worker のライフサイクルを理解する

**ライフサイクル**:

```
┌──────────────────┐
│  休止中 (Dormant) │
└──────────────────┘
         ↓
    イベント発生
         ↓
┌──────────────────┐
│   起動 (Startup)  │
│  ・イベント処理   │
│  ・Storage 読込   │
└──────────────────┘
         ↓
    処理完了
         ↓
┌──────────────────┐
│   休止 (Idle)     │
│  ・30秒後に終了   │
└──────────────────┘
```

**対策**:

- すべての状態を Chrome Storage に保存
- 長時間タスクは Offscreen Document を使用
- Alarm API でスケジューリング

---

## Content Scripts

### 原則 9: Content Scripts は分離された環境として扱う

**Chrome 公式ドキュメント**:
> "Content scripts run in an isolated world. They can access the DOM but not the page's JavaScript variables."

```typescript
// ❌ BAD: ページのグローバル変数にアクセスしようとする
console.log(window.myPageVariable); // undefined

// ✅ GOOD: メッセージパッシングで Service Worker と通信
chrome.runtime.sendMessage({ type: 'get-data' }, (response) => {
  console.log('Data from Service Worker:', response);
});
```

---

### 原則 10: Web Accessible Resources を適切に宣言する

**manifest.json での宣言**:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*.png", "styles/*.css"],
      "matches": ["https://*/*"]
    }
  ]
}
```

**Content Script での使用**:

```typescript
const imgUrl = chrome.runtime.getURL('images/logo.png');
const img = document.createElement('img');
img.src = imgUrl;
document.body.appendChild(img);
```

---

## 権限管理

### 原則 11: 最小権限の原則を適用する

**Chrome 公式ドキュメント**:
> "Request only the permissions your extension needs."

```json
// ❌ BAD: 不要な権限を要求
{
  "permissions": [
    "tabs",
    "storage",
    "cookies",
    "history",
    "<all_urls>"
  ]
}

// ✅ GOOD: 必要最小限の権限
{
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.example.com/*"
  ]
}
```

---

### 原則 12: activeTab を活用する

**activeTab の利点**:

- ユーザーアクション時のみ権限付与
- ホスト権限を宣言不要
- ユーザーの信頼度が高い

```json
{
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_title": "Click to activate"
  }
}
```

```typescript
// Service Worker
chrome.action.onClicked.addListener(async (tab) => {
  // activeTab により tab.id への一時的なアクセス権を取得
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
```

---

### 原則 13: Optional Permissions を使用する

**段階的な権限要求**:

```json
{
  "permissions": ["storage"],
  "optional_permissions": ["tabs", "cookies"],
  "optional_host_permissions": ["https://www.google.com/*"]
}
```

```typescript
// 必要時に権限を要求
async function requestOptionalPermission() {
  const granted = await chrome.permissions.request({
    permissions: ['tabs'],
    origins: ['https://www.google.com/*']
  });

  if (granted) {
    console.log('✅ 権限が付与されました');
  } else {
    console.log('❌ 権限が拒否されました');
  }
}
```

---

## エラーハンドリング

### 原則 14: エラーを段階的にハンドリングする

**エラーの重要度分類**:

| レベル | 説明 | 対応 |
|--------|------|------|
| **Critical** | データ損失・機能停止 | throw + ユーザー通知 |
| **Warning** | 機能一部制限 | log + デフォルト値 |
| **Info** | 非本質的な失敗 | log のみ |

```typescript
async function handleCriticalOperation(data) {
  try {
    // Critical: データ保存
    await chrome.storage.local.set({ data });
    console.log('✅ データ保存成功');

    try {
      // Warning: 外部 API 呼び出し
      await notifyExternalService(data);
      console.log('✅ 通知成功');
    } catch (notifyError) {
      console.warn('⚠️ 通知失敗（データは保存済み）:', notifyError);
    }

    try {
      // Info: アナリティクス送信
      await sendAnalytics('data-saved');
    } catch (analyticsError) {
      console.info('ℹ️ アナリティクス送信失敗:', analyticsError);
    }

    return { success: true };
  } catch (error) {
    // Critical エラー
    console.error('❌ データ保存エラー:', error);
    throw new Error('データを保存できませんでした');
  }
}
```

---

### 原則 15: エラーメッセージにコンテキストを含める

```typescript
// ❌ BAD: コンテキストなし
console.error(error);

// ✅ GOOD: コンテキストあり
console.error('[ServiceWorker][handleSaveData] データ保存エラー:', {
  error,
  payload: message.payload,
  timestamp: Date.now(),
  sender: sender.tab?.id,
});
```

---

## 型安全性

### 原則 16: TypeScript で型安全なメッセージングを実装する

**型定義**:

```typescript
// types/message.ts
export type MessageType =
  | 'save-data'
  | 'get-data'
  | 'data-updated'
  | 'error';

export interface BaseMessage {
  type: MessageType;
}

export interface SaveDataMessage extends BaseMessage {
  type: 'save-data';
  payload: {
    data: Record<string, any>;
  };
}

export interface GetDataMessage extends BaseMessage {
  type: 'get-data';
  payload: {
    keys: string[];
  };
}

export type Message = SaveDataMessage | GetDataMessage;

export type MessageHandler = (
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | void | Promise<any>;
```

**型安全なハンドラー登録**:

```typescript
// messaging/messageRouter.ts
const handlers: Record<MessageType, MessageHandler> = {} as any;

export const registerMessage = (
  type: MessageType,
  handler: MessageHandler
): void => {
  if (handlers[type]) {
    console.warn(`⚠️ Handler for ${type} already exists. Skipping.`);
    return;
  }
  handlers[type] = handler;
};
```

---

### 原則 17: Chrome Storage の型アサーションを適切に使用する

```typescript
// types/storage.ts
export interface StorageSchema {
  userData: {
    id: string;
    name: string;
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  items: Array<{ id: string; value: string }>;
}

// 型安全な Storage アクセス
async function getTypedData<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | null> {
  const result = await chrome.storage.local.get([key]);
  return result[key] as StorageSchema[K] || null;
}

// 使用例
const userData = await getTypedData('userData');
if (userData) {
  console.log(userData.name); // 型安全
}
```

---

## チェックリスト

新機能を実装する際は、以下を確認してください:

### メッセージング

- [ ] メッセージハンドラーは値を返しているか？
- [ ] 非同期処理では `return true` を返しているか？
- [ ] `sender.tab.id` を優先的に使用しているか？
- [ ] エラーハンドリングは段階的に実施されているか？

### 状態管理

- [ ] Chrome Storage を信頼できる唯一の情報源としているか？
- [ ] Storage 変更を Content Script に同期しているか？
- [ ] 型アサーションを適切に使用しているか？

### Service Worker

- [ ] グローバル変数に依存していないか？
- [ ] すべての状態を Chrome Storage に保存しているか？
- [ ] イベント駆動として設計されているか？

### Content Scripts

- [ ] Web Accessible Resources を宣言しているか？
- [ ] ページの JavaScript と分離されていることを理解しているか？

### 権限管理

- [ ] 最小権限の原則を適用しているか？
- [ ] `activeTab` を活用しているか？
- [ ] Optional Permissions を検討したか？

### エラーハンドリング

- [ ] エラーの重要度に応じた処理を実装しているか？
- [ ] エラーメッセージにコンテキストが含まれているか？
- [ ] Critical エラーはユーザーに通知しているか？

### 型安全性

- [ ] TypeScript の型定義を活用しているか？
- [ ] Storage アクセスは型安全か？
- [ ] メッセージングは型安全か？

---

## 参考資料

### Chrome 公式ドキュメント

- [Chrome Extensions API Reference](https://developer.chrome.com/docs/extensions/reference/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Service Workers](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

### 本プロジェクトの関連ドキュメント

- [implementation-best-practices.md](./implementation-best-practices.md) - 実装から得られた教訓
- [messaging-architecture.md](./messaging-architecture.md) - メッセージングアーキテクチャ詳細

---

## まとめ

Chrome Extension 開発における本質的なベストプラクティス:

1. **メッセージングは非同期処理を正しく扱う** - `return true` と `sendResponse` の適切な使用
2. **Chrome Storage を信頼できる唯一の情報源とする** - 永続化と同期の基盤
3. **Service Worker はイベント駆動として設計する** - グローバル変数に依存しない
4. **最小権限の原則を適用する** - ユーザーの信頼を得る
5. **エラーを段階的にハンドリングする** - データ保護を最優先
6. **型安全性を確保する** - TypeScript でランタイムエラーを防ぐ

これらの原則を遵守することで、**信頼性が高く、保守性に優れた Chrome Extension** を開発できます。
