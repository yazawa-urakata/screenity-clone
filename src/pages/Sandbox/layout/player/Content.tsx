import type React from "react";
import { useContext } from "react";
import CropperWrap from "../../components/editor/CropperWrap";
import SimpleResultPanel from "../../components/player/SimpleResultPanel";
// Components
import VideoPlayer from "../../components/player/VideoPlayer";
// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context
import styles from "../../styles/player/_Content.module.scss";

const Content: React.FC = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  return (
    <div className={styles.content}>
      <div className={styles.wrap}>
        {contentState.mode === "audio" && <VideoPlayer />}
        {/* player モードでは動画再生なしのSimpleResultPanelを表示 */}
        {contentState.mode === "player" && <SimpleResultPanel />}
        {contentState.mode === "crop" && <CropperWrap />}
      </div>
    </div>
  );
};

export default Content;
