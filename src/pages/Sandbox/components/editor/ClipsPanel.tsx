import React, { useContext } from "react";
import { formatClipTime } from "../../../../utils/clipUtils";
import styles from "../../styles/edit/_ClipsPanel.module.scss";
import { ContentStateContext } from "../../context/ContentState";

// Icons
import { ReactSVG } from "react-svg";

const URL = "/assets/";

const ClipIcon = URL + "tool-icons/clip-icon.svg";

const ClipsPanel: React.FC = () => {
  const contextValue = useContext(ContentStateContext);
  console.log("contextValue", contextValue);

  if (!contextValue) {
    return null;
  }

  const [contentState] = contextValue;
  const clips = contentState.clips;

  console.log("clips", clips);

  if (!clips || clips.length === 0) {
    return null;
  }

  return (
    <div className={styles.clipsPanel}>
      <div className={styles.clipsPanelHeader}>
        <ReactSVG src={ClipIcon} className={styles.clipIcon} />
        <h3 className={styles.clipsPanelTitle}>
          録画クリップ ({clips.length})
        </h3>
      </div>
      <div className={styles.clipsList}>
        {clips.map((clip, index) => (
          <div key={clip.id} className={styles.clipItem}>
            <div className={styles.clipNumber}>#{index + 1}</div>
            <div className={styles.clipDetails}>
              <div className={styles.clipTime}>
                <span className={styles.clipLabel}>時間:</span>
                <span className={styles.clipValue}>
                  {formatClipTime(clip.startTime)} - {formatClipTime(clip.endTime)}
                </span>
              </div>
              <div className={styles.clipDuration}>
                <span className={styles.clipLabel}>長さ:</span>
                <span className={styles.clipValue}>
                  {Math.floor(clip.duration / 1000)}秒
                </span>
              </div>
              {clip.crop && (
                <div className={styles.clipCrop}>
                  <span className={styles.clipLabel}>範囲:</span>
                  <span className={styles.clipValue}>
                    {clip.crop.width} × {clip.crop.height} (x: {clip.crop.x}, y: {clip.crop.y})
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClipsPanel;
