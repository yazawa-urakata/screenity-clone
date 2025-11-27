import React, { useContext } from "react";

// Components
import PlayerNav from "./PlayerNav";
import AudioNav from "../editor/AudioNav";
import Content from "./Content";

import styles from "../../styles/player/_Player.module.scss";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

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
