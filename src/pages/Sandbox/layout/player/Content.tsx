import type React from "react";
import SimpleResultPanel from "../../components/player/SimpleResultPanel";
import styles from "../../styles/player/_Content.module.scss";

const Content: React.FC = () => {
  return (
    <div className={styles.content}>
      <div className={styles.wrap}>
        <SimpleResultPanel />
      </div>
    </div>
  );
};

export default Content;
