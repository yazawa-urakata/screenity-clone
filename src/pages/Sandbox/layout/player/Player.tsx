import type React from "react";
import styles from "../../styles/player/_Player.module.scss";
import Content from "./Content";

const Player: React.FC = () => {
  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <Content />
      </div>
    </div>
  );
};

export default Player;
