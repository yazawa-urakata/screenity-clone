import type React from "react";
import { useContext } from "react";
// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context
import styles from "../../styles/player/_Player.module.scss";
import AudioNav from "../editor/AudioNav";
import Content from "./Content";
// Components
import PlayerNav from "./PlayerNav";

const Player: React.FC = () => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context

  return (
    <div className={styles.layout}>
      {contentState.mode === "player" && <PlayerNav />}
      {contentState.mode === "audio" && <AudioNav />}
      <div className={styles.content}>
        <Content />
      </div>
    </div>
  );
};

export default Player;
