import React, { useContext, useState, useEffect } from "react";
import { ContentStateContext } from "../../context/ContentState";

// Components
import Title from "./Title";
import ClipsPanel from "../editor/ClipsPanel";

interface SimpleResultPanelProps { }

interface UploadStatus {
  status: "completed" | "error" | "uploading" | "unknown";
  completeTime?: number;
  error?: string;
}

/**
 * SimpleResultPanel
 *
 * 動画再生機能を削除したシンプルな結果表示パネル。
 * - タイトル表示
 * - クリップ一覧表示
 * - リアルタイムS3アップロードの最終状態表示
 *
 * 根拠：
 * - リアルタイムアップロードはRecorder側で完了済み
 * - Chrome Storageから最終的なアップロード状態を読み取り表示
 * - ClipsPanel は contentState.clips のみを使用（動画再生不要）
 * - Title は独立したコンポーネント（動画再生不要）
 */
const SimpleResultPanel: React.FC<SimpleResultPanelProps> = () => {
  const contextValue = useContext(ContentStateContext);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "unknown",
  });

  if (!contextValue) {
    throw new Error("SimpleResultPanel must be used within ContentStateContext");
  }

  const [contentState] = contextValue;

  useEffect(() => {
    // Chrome Storage からアップロード状態を読み取り
    const loadUploadStatus = () => {
      chrome.storage.local.get(
        ["instantUploadStatus", "instantUploadCompleteTime", "instantUploadError"],
        (result) => {
          if (result.instantUploadStatus === "completed") {
            setUploadStatus({
              status: "completed",
              completeTime: result.instantUploadCompleteTime as number,
            });
          } else if (result.instantUploadStatus === "error") {
            setUploadStatus({
              status: "error",
              error: result.instantUploadError as string,
            });
          } else {
            setUploadStatus({
              status: "unknown",
            });
          }
        }
      );
    };

    // 初回読み込み
    loadUploadStatus();

    // Chrome Storage の変更を監視
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.instantUploadStatus) {
        console.log("[SimpleResultPanel] instantUploadStatus changed:", changes.instantUploadStatus.newValue);
        loadUploadStatus();
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const getUploadStatusMessage = () => {
    switch (uploadStatus.status) {
      case "completed":
        return {
          icon: "✅",
          title: "アップロード完了",
          description: "録画がS3に正常にアップロードされました",
          color: "#10b981",
        };
      case "error":
        return {
          icon: "❌",
          title: "アップロード失敗",
          description: uploadStatus.error || "アップロード中にエラーが発生しました",
          color: "#ef4444",
        };
      default:
        return {
          icon: "⏳",
          title: "録画完了",
          description: "アップロード状態を確認中...",
          color: "#6b7280",
        };
    }
  };

  const statusMessage = getUploadStatusMessage();

  return (
    <div className="simpleResultPanel">
      <div className="resultWrap">
        <div className="resultContent">
          <div className="uploadStatusSection">
            <div className="uploadIcon" style={{ color: statusMessage.color }}>
              {statusMessage.icon}
            </div>
            <h2 className="uploadTitle">{statusMessage.title}</h2>
            <p className="uploadDescription">{statusMessage.description}</p>
          </div>
          {contentState.mode === "player" && <ClipsPanel />}
        </div>
      </div>
      <style>
        {`
          .simpleResultPanel {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F6F7FB;
          }
          .resultWrap {
            width: 100%;
            max-width: 800px;
            padding: 40px;
          }
          .resultContent {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }
          .uploadStatusSection {
            text-align: center;
            margin-bottom: 32px;
          }
          .uploadIcon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .uploadTitle {
            font-family: 'Satoshi-Medium', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #1A1A1A;
            margin: 0 0 12px 0;
          }
          .uploadDescription {
            font-family: 'Satoshi-Medium', sans-serif;
            font-size: 16px;
            color: #6E7684;
            margin: 0 0 8px 0;
          }
          @media (max-width: 900px) {
            .simpleResultPanel {
              position: relative !important;
            }
            .resultWrap {
              padding: 20px;
            }
            .resultContent {
              padding: 24px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default SimpleResultPanel;
