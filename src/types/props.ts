// 共通Props型の定義

import { ReactNode } from 'react';

// 動画関連
export interface Video {
  id: string;
  title: string;
  url?: string;
  duration?: number;
  thumbnail?: string;
  size?: number;
  createdAt: Date;
  format?: 'webm' | 'mp4' | 'gif';
}

export interface VideoItemProps {
  video: Video;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export interface VideoListProps {
  videos: Video[];
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

// ユーザー関連
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subscription?: 'free' | 'pro' | 'enterprise';
  createdAt?: Date;
}

// UI コンポーネント Props
export interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export interface DropdownProps {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

// ツールバー関連
export interface Tool {
  id: string;
  name: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
}

export interface ToolbarProps {
  tools: Tool[];
  activeTool?: string;
  onToolSelect: (toolId: string) => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// カメラ関連
export interface CameraSettings {
  deviceId: string;
  width: number;
  height: number;
  facingMode?: 'user' | 'environment';
  frameRate?: number;
}

export interface CameraProps {
  settings: CameraSettings;
  onSettingsChange: (settings: CameraSettings) => void;
  onCapture?: (blob: Blob) => void;
}

// 録画関連
export interface RecordingSettings {
  audio: boolean;
  video: boolean;
  screen: boolean;
  camera: boolean;
  quality: 'low' | 'medium' | 'high';
  fps: 30 | 60;
  format: 'webm' | 'mp4';
}

export interface RecorderProps {
  settings: RecordingSettings;
  onSettingsChange: (settings: RecordingSettings) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}
