// RecorderUI.tsx
import React from "react";
import Warning from "./warning/Warning";
import type {
  InstantUploadState,
  InstantUploadProgress,
  InstantUploadError,
} from "../../types/instantUpload";

interface RecorderUIProps {
  started: boolean;
  isTab: boolean;
  uploadState?: InstantUploadState;
  uploadProgress?: InstantUploadProgress | null;
  uploadError?: InstantUploadError | null;
}

const RecorderUI: React.FC<RecorderUIProps> = ({
  started,
  isTab,
  uploadState,
  uploadProgress,
  uploadError,
}) => {
  return (
    <div className="wrap">
      <img
        className="logo"
        src={chrome.runtime.getURL("assets/logo-text.svg")}
        alt="Screenity logo"
      />
      <div className="middle-area">
        <img
          src={chrome.runtime.getURL("assets/record-tab-active.svg")}
          alt="Recording icon"
        />
        <div className="title">
          {!started
            ? chrome.i18n.getMessage("recorderSelectTitle")
            : chrome.i18n.getMessage("recorderSelectProgressTitle")}
        </div>
        <div className="subtitle">
          {chrome.i18n.getMessage("recorderSelectDescription")}
        </div>
      </div>

      {uploadState && uploadState !== "idle" && uploadProgress && (
        <div className="upload-progress-container">
          <div className="upload-status">
            {uploadState === "uploading" && "📤 リアルタイムアップロード中"}
            {uploadState === "finalizing" && "⏳ 完了処理中"}
            {uploadState === "completed" && "✅ アップロード完了"}
            {uploadState === "error" && "❌ アップロードエラー"}
          </div>

          {(uploadState === "uploading" || uploadState === "finalizing") && (
            <>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>

              <div className="upload-details">
                {Math.round(uploadProgress.percentage)}%
                ({Math.round(uploadProgress.uploadedBytes / 1024 / 1024)} MB
                / {Math.round(uploadProgress.totalBytes / 1024 / 1024)} MB)
              </div>
            </>
          )}

          {uploadError && (
            <div className="upload-error">
              {uploadError.message}
            </div>
          )}
        </div>
      )}

      {!isTab && !started && <Warning />}

      <div className="setupBackgroundSVG"></div>

      <style>
        {`
          body {
            overflow: hidden;
          }
          .button-stop {
            padding: 10px 20px;
            background: #FFF;
            border-radius: 30px;
            color: #29292F;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 0px;
            border: 1px solid #E8E8E8;
            margin-left: auto;
            margin-right: auto;
            z-index: 999999;
          }
          .setupBackgroundSVG {
            position: absolute;
            top: 0px;
            left: 0px;
            width: 100%;
            height:100%;
            background: url('${chrome.runtime.getURL(
              "assets/helper/pattern-svg.svg"
            )}') repeat;
            background-size: 62px 23.5px;
            animation: moveBackground 138s linear infinite;
            transform: rotate(0deg);
          }
          @keyframes moveBackground {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 100% 0;
            }
          }
          .logo {
            position: absolute;
            bottom: 30px;
            left: 0px;
            right: 0px;
            margin: auto;
            width: 120px;
          }
          .wrap {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #F6F7FB;
          }
          .middle-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            font-family: "Satoshi Medium", sans-serif;
          }
          .middle-area img {
            width: 40px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: 700;
            color: #1A1A1A;
            margin-bottom: 14px;
            font-family: Satoshi-Medium, sans-serif;
            text-align: center;
          }
          .subtitle {
            font-size: 14px;
            font-weight: 400;
            color: #6E7684;
            margin-bottom: 24px;
            font-family: Satoshi-Medium, sans-serif;
            text-align: center;
          }
          .upload-progress-container {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 16px 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 320px;
            z-index: 999999;
          }
          .upload-status {
            font-family: "Satoshi Medium", sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #29292F;
            margin-bottom: 12px;
            text-align: center;
          }
          .progress-bar-container {
            width: 100%;
            height: 8px;
            background: #E8E8E8;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%);
            border-radius: 4px;
            transition: width 0.3s ease;
          }
          .upload-details {
            font-family: "Satoshi Regular", sans-serif;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .upload-error {
            font-family: "Satoshi Regular", sans-serif;
            font-size: 12px;
            color: #EF4444;
            text-align: center;
            margin-top: 8px;
          }
        `}
      </style>
    </div>
  );
};

export default RecorderUI;
