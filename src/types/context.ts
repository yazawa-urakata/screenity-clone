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
  isSubscribed: boolean;
  setIsSubscribed: (isSubscribed: boolean) => void;
  hasSubscribedBefore: boolean;
  setHasSubscribedBefore: (hasSubscribedBefore: boolean) => void;
  proSubscription: boolean;
  setProSubscription: (proSubscription: boolean) => void;

  // 録画設定
  offscreenRecording: boolean;
  setOffscreenRecording: (offscreenRecording: boolean) => void;
  zoomEnabled: boolean;
  setZoomEnabled: (zoomEnabled: boolean) => void;

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

  // カメラ設定
  cameraActive: boolean;
  setCameraActive?: (cameraActive: boolean) => void;
  defaultVideoInput: string;
  setDefaultVideoInput?: (defaultVideoInput: string) => void;
  videoInput: MediaDeviceInfo[];
  setVideoInput?: (videoInput: MediaDeviceInfo[]) => void;

  // 領域設定
  customRegion: boolean;
  setCustomRegion?: (customRegion: boolean) => void;
  regionWidth: number;
  setRegionWidth?: (regionWidth: number) => void;
  regionHeight: number;
  setRegionHeight?: (regionHeight: number) => void;
  fromRegion?: boolean;
  setFromRegion?: (fromRegion: boolean) => void;

  // 背景エフェクト
  backgroundEffect: string;
  setBackgroundEffect?: (backgroundEffect: string) => void;

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

// CameraContextの型定義
export interface CameraContextType {
  // カメラステート
  stream: MediaStream | null;
  setStream: (stream: MediaStream | null) => void;
  isActive: boolean;
  setIsActive: (isActive: boolean) => void;

  // カメラ設定
  deviceId: string;
  setDeviceId: (deviceId: string) => void;
  facingMode: 'user' | 'environment';
  setFacingMode: (mode: 'user' | 'environment') => void;

  // エフェクト
  backgroundBlur: boolean;
  setBackgroundBlur: (blur: boolean) => void;

  // TODO: 他のカメラステートを追加
}
