// React Context関連の型定義

// ContentStateの型定義
export interface ContentStateContextType {
  // タイマー
  timer: number;
  setTimer: (timer: number) => void;
  time: number;
  setTime?: (time: number) => void;
  alarmTime: number;
  setAlarmTime?: (alarmTime: number) => void;
  fromAlarm?: boolean;
  setFromAlarm?: (fromAlarm: boolean) => void;

  // 認証状態
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  screenityUser: any; // TODO: User型を定義

  // 録画設定
  offscreenRecording: boolean;
  setOffscreenRecording: (offscreenRecording: boolean) => void;

  // アラーム
  alarm: boolean;
  setAlarm: (alarm: boolean) => void;

  // URL設定
  URL: string;
  setURL: (url: string) => void;
  URL2: string;
  setURL2: (url: string) => void;

  // 録画関連
  startRecording: () => void;
  stopRecording: () => void;

  // UI設定
  hideUI: boolean;
  setHideUI?: (hideUI: boolean) => void;
  hideUIAlerts: boolean;
  setHideUIAlerts?: (hideUIAlerts: boolean) => void;
  hideToolbar: boolean;
  setHideToolbar?: (hideToolbar: boolean) => void;
  toolbarHover: boolean;
  setToolbarHover?: (toolbarHover: boolean) => void;

  // オーディオ設定
  micActive: boolean;
  setMicActive?: (micActive: boolean) => void;
  pushToTalk?: boolean;
  setPushToTalk?: (pushToTalk: boolean) => void;
  defaultAudioInput: string;
  setDefaultAudioInput?: (defaultAudioInput: string) => void;
  audioInput: MediaDeviceInfo[];
  setAudioInput?: (audioInput: MediaDeviceInfo[]) => void;

  // 領域設定
  customRegion: boolean;
  setCustomRegion?: (customRegion: boolean) => void;
  regionWidth: number;
  setRegionWidth?: (regionWidth: number) => void;
  regionHeight: number;
  setRegionHeight?: (regionHeight: number) => void;
  fromRegion?: boolean;
  setFromRegion?: (fromRegion: boolean) => void;

  // Toast機能
  openToast?: (title: string, action: () => void, durationMs?: number) => void;

  // カラー設定
  color: string;
  setColor?: (color: string) => void;
  swatch: number;
  setSwatch?: (swatch: number) => void;

  // 描画設定
  strokeWidth: string;
  setStrokeWidth?: (strokeWidth: string) => void;

  // TODO: 他のステートを追加
  [key: string]: any;
}
