import React, { useRef, useEffect, useContext } from "react";
import styles from "../../styles/edit/_Trimmer.module.scss";
import WaveformGenerator from "./Waveform";

// Context
import { ContentStateContext } from "../../context/ContentState";

const Trimmer: React.FC = () => {
  const contextValue = useContext(ContentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const trimmerRef = useRef<HTMLDivElement | null>(null);
  const startHandleRef = useRef<HTMLDivElement | null>(null);
  const endHandleRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef<boolean>(false);
  const activeHandle = useRef<"start" | "end" | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    handle: "start" | "end"
  ): void => {
    e.preventDefault();
    isDragging.current = true;
    activeHandle.current = handle;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isDragging.current) return;
    if (!trimmerRef.current) return;

    const trimmerRect = trimmerRef.current.getBoundingClientRect();
    const trimmerWidth = trimmerRect.width;
    const mouseX = e.clientX - trimmerRect.left;
    let newPosition = mouseX / trimmerWidth;

    if (activeHandle.current === "start") {
      newPosition += 0;
      const validPosition = Math.max(
        Math.min(newPosition, contentState.end - 0.02),
        0
      );
      setContentState((prevContentState) => ({
        ...prevContentState,
        start: validPosition,
      }));
    } else if (activeHandle.current === "end") {
      newPosition -= 0;
      const validPosition = Math.min(
        Math.max(newPosition, contentState.start + 0.02),
        1
      );
      setContentState((prevContentState) => ({
        ...prevContentState,
        end: validPosition,
      }));
    }
  };

  const handleMouseUp = (): void => {
    isDragging.current = false;
    activeHandle.current = null;

    contentState.addToHistory?.();

    setContentState((prevContentState) => ({
      ...prevContentState,
      dragInteracted: true,
    }));

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    // Update the handle positions when the start and end values change
    if (startHandleRef.current) {
      startHandleRef.current.style.left = `calc(${contentState.start * 100}%)`;
    }
    if (endHandleRef.current) {
      endHandleRef.current.style.left = `${contentState.end * 100}%`;
    }
  }, [contentState.start, contentState.end]);

  return (
    <div>
      <div className={styles.trimmerContainer} ref={trimmerRef}>
        <div className={styles.trimWrap}>
          <div
            className={styles.leftOverlay}
            style={{ width: `${contentState.start * 100}%` }}
          />
          <div
            className={styles.rightOverlay}
            style={{ width: `${(1 - contentState.end) * 100}%` }}
          />
          <div
            className={styles.trimSection}
            style={{
              width: `${(contentState.end - contentState.start) * 100}%`,
              left: `${contentState.start * 100}%`,
            }}
          />
          <div className={styles.trimmer}>
            <div
              className={`${styles.handle} ${styles.startHandle}`}
              onMouseDown={(e) => handleMouseDown(e, "start")}
              ref={startHandleRef}
            />
            <div
              className={`${styles.handle} ${styles.endHandle}`}
              onMouseDown={(e) => handleMouseDown(e, "end")}
              ref={endHandleRef}
            />
          </div>
        </div>
        <WaveformGenerator />
      </div>
    </div>
  );
};

export default Trimmer;
