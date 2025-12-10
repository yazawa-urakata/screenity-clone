import type React from "react";
import styles from "../../styles/player/_Player.module.scss";
import Content from "./Content";
import PlayerNav from "./PlayerNav";

const Player: React.FC = () => {
  return (
    <div className={styles.layout}>
      <PlayerNav />
      <div className={styles.content}>
        <Content />
      </div>
    </div>
  );
};

export default Player;
