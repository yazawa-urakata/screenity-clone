// Chrome Extension APIの拡張型定義
// このファイルには、@types/chromeに含まれていない型や
// プロジェクト固有のChrome API拡張を追加します

declare namespace chrome {
  // Offscreen API (Manifest V3)
  namespace offscreen {
    export enum Reason {
      AUDIO_PLAYBACK = 'AUDIO_PLAYBACK',
      IFRAME_SCRIPTING = 'IFRAME_SCRIPTING',
      DOM_SCRAPING = 'DOM_SCRAPING',
      BLOBS = 'BLOBS',
      DOM_PARSER = 'DOM_PARSER',
      USER_MEDIA = 'USER_MEDIA',
      DISPLAY_MEDIA = 'DISPLAY_MEDIA',
      WEB_RTC = 'WEB_RTC',
      CLIPBOARD = 'CLIPBOARD',
    }

    interface CreateParameters {
      url: string;
      reasons: Reason[];
      justification: string;
    }

    export function createDocument(
      parameters: CreateParameters
    ): Promise<void>;

    export function closeDocument(): Promise<void>;

    export function hasDocument(): Promise<boolean>;
  }

  // Desktop Capture API (スクリーン録画用)
  namespace desktopCapture {
    export function chooseDesktopMedia(
      sources: string[],
      targetTab: chrome.tabs.Tab | undefined,
      callback: (streamId: string, options: { canRequestAudioTrack: boolean }) => void
    ): number;

    export function cancelChooseDesktopMedia(desktopMediaRequestId: number): void;
  }

  // Runtime Contexts API (Manifest V3)
  namespace runtime {
    interface ContextFilter {
      contextTypes?: Array<'TAB' | 'POPUP' | 'BACKGROUND' | 'OFFSCREEN_DOCUMENT' | 'SIDE_PANEL'>;
      documentIds?: string[];
      documentOrigins?: string[];
      documentUrls?: string[];
      frameIds?: number[];
      incognito?: boolean;
      tabIds?: number[];
      windowIds?: number[];
    }

    interface ExtensionContext {
      contextId: string;
      contextType: 'TAB' | 'POPUP' | 'BACKGROUND' | 'OFFSCREEN_DOCUMENT' | 'SIDE_PANEL';
      documentId: string;
      documentOrigin: string;
      documentUrl: string;
      frameId: number;
      incognito: boolean;
      tabId: number;
      windowId: number;
    }

    export function getContexts(filter: ContextFilter): Promise<ExtensionContext[]>;
  }

  // Scripting API型の補完
  namespace scripting {
    interface InjectionResult {
      frameId: number;
      result?: any;
      error?: any;
    }
  }

  // User Settings API (chrome.action.getUserSettings)
  namespace action {
    interface UserSettings {
      isOnToolbar: boolean;
    }

    export function getUserSettings(): Promise<UserSettings>;
  }
}
