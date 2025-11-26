import React, { FC, MouseEvent } from "react";

import { CopyLinkIcon } from "../../images/popup/images";

interface VideoItemProps {
  title: string;
  date: string | number;
  thumbnail?: string;
  onOpen?: () => void;
  onCopyLink?: () => void;
}

const VideoItem: FC<VideoItemProps> = ({ title, date, thumbnail, onOpen, onCopyLink }) => {
  const formatRelativeTime = (timestamp: number | string): string => {
    // If it's already a string (mock data), return it directly
    if (typeof timestamp === 'string') {
      return timestamp;
    }

    // Otherwise, format the timestamp
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    const thresholds: Array<{ unit: string; seconds: number }> = [
      { unit: "year", seconds: 31536000 },
      { unit: "month", seconds: 2592000 },
      { unit: "week", seconds: 604800 },
      { unit: "day", seconds: 86400 },
      { unit: "hour", seconds: 3600 },
      { unit: "minute", seconds: 60 },
      { unit: "second", seconds: 1 },
    ];

    for (const { unit, seconds } of thresholds) {
      const value = Math.floor(diffInSeconds / seconds);
      if (value >= 1) {
        return `${value} ${unit}${value !== 1 ? "s" : ""} ago`;
      }
    }

    return "just now";
  };

  return (
    <div
      className="video-item-root"
      tabIndex={0}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        if (
          (e.target as HTMLElement).closest(".copy-link") ||
          (e.target as HTMLElement).closest(".more-actions")
        ) {
          e.stopPropagation();
          return;
        }
        onOpen();
      }}
    >
      <div className="video-item">
        <div className="video-item-left">
          <div className="video-item-info">
            <div className="video-item-info-title">{title}</div>
            <div className="video-item-info-date">
              {formatRelativeTime(date)}
            </div>
          </div>
        </div>
        <div className="video-item-right">
          <button
            role="button"
            tabIndex={0}
            className="copy-link"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              e.stopPropagation();
              onCopyLink();
            }}
          >
            <img src={CopyLinkIcon} alt="Copy link" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoItem;
