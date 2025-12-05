import * as Toolbar from "@radix-ui/react-toolbar";
import type React from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { type DraggableData, Rnd } from "react-rnd";
import { MAX_CLIPS } from "../../../../utils/clipUtils";
// Context
import { contentStateContext } from "../../context/ContentState";
// Icons
import {
  CheckIcon,
  ClipIcon,
  ClipStopIcon,
  CloseIcon,
  GrabIcon,
  StopIcon,
} from "../components/SVG";
// Components
import ToolTrigger from "../components/ToolTrigger";

const ToolbarWrap: React.FC = () => {
  const contextValue = useContext(contentStateContext);

  const DragRef = useRef<Rnd | null>(null);
  const ToolbarRef = useRef<HTMLDivElement | null>(null);
  const [side, setSide] = useState<string>("ToolbarTop");
  const [elastic, setElastic] = useState<string>("");
  const [shake, setShake] = useState<string>("");
  const [dragging, setDragging] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("00:00");
  const timeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextValue) return;
    const [, , t] = contextValue;

    if (!Number.isNaN(t)) {
      const clampedT = Math.max(0, t); // prevent negative values
      const hours = Math.floor(clampedT / 3600);
      const minutes = Math.floor((clampedT % 3600) / 60);
      const seconds = clampedT % 60;

      // Determine the timestamp format based on the total duration (t)
      const newTimestamp =
        hours > 0
          ? `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
          : `${minutes.toString().padStart(2, "0")}:${seconds
              .toString()
              .padStart(2, "0")}`;

      // Adjust the width of the time display based on the duration
      if (hours > 0 && timeRef.current) {
        // Adjust for HH:MM:SS format when hours are present
        timeRef.current.style.width = "58px";
      } else if (timeRef.current) {
        // Adjust for MM:SS format when there are no hours
        timeRef.current.style.width = "42px";
      }

      setTimestamp(newTimestamp);
    }
  }, [contextValue?.[2]]);

  const handleDragStart = useCallback(
    (_e: MouseEvent | TouchEvent, _d: DraggableData): void => {
      setDragging("ToolbarDragging");
    },
    [],
  );

  const handleDrag = useCallback(
    (_e: MouseEvent | TouchEvent, d: DraggableData): void => {
      if (!ToolbarRef.current) return;

      // Width and height
      const width = ToolbarRef.current.getBoundingClientRect().width;
      const height = ToolbarRef.current.getBoundingClientRect().height;

      if (d.y < 130) {
        setSide("ToolbarBottom");
      } else {
        setSide("ToolbarTop");
      }

      if (
        d.x < -25 ||
        d.x + width > window.innerWidth ||
        d.y < 60 ||
        d.y + height - 80 > window.innerHeight
      ) {
        setShake("ToolbarShake");
      } else {
        setShake("");
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (_e: MouseEvent | TouchEvent | null, d: DraggableData): void => {
      if (!contextValue || !ToolbarRef.current || !DragRef.current) return;
      const [, setContentState] = contextValue;

      setShake("");
      setDragging("");
      let xpos = d.x;
      let ypos = d.y;

      // Width and height
      const width = ToolbarRef.current.getBoundingClientRect().width;
      const height = ToolbarRef.current.getBoundingClientRect().height;

      // Check if toolbar is off screen
      if (d.x < -10) {
        setElastic("ToolbarElastic");
        xpos = -10;
      } else if (d.x + width + 30 > window.innerWidth) {
        setElastic("ToolbarElastic");
        xpos = window.innerWidth - width - 30;
      }

      if (d.y < 130) {
        setSide("ToolbarBottom");
      } else {
        setSide("ToolbarTop");
      }

      if (d.y < 80) {
        setElastic("ToolbarElastic");
        ypos = 80;
      } else if (d.y + height - 60 > window.innerHeight) {
        setElastic("ToolbarElastic");
        ypos = window.innerHeight - height + 60;
      }
      DragRef.current.updatePosition({ x: xpos, y: ypos });

      setTimeout(() => {
        setElastic("");
      }, 250);

      setContentState((prevContentState) => ({
        ...prevContentState,
        toolbarPosition: {
          ...prevContentState.toolbarPosition,
          offsetX: xpos,
          offsetY: ypos,
          left: xpos < window.innerWidth / 2,
          right: !(xpos < window.innerWidth / 2),
          top: ypos < window.innerHeight / 2,
          bottom: !(ypos < window.innerHeight / 2),
        },
      }));

      // Is it on the left or right, also top or bottom

      const left = xpos < window.innerWidth / 2;
      const right = !(xpos < window.innerWidth / 2);
      const top = ypos < window.innerHeight / 2;
      const bottom = !(ypos < window.innerHeight / 2);
      let offsetX = xpos;
      let offsetY = ypos;

      if (right) {
        offsetX = window.innerWidth - xpos;
      }
      if (bottom) {
        offsetY = window.innerHeight - ypos;
      }

      setContentState((prevContentState) => ({
        ...prevContentState,
        toolbarPosition: {
          ...prevContentState.toolbarPosition,
          offsetX: offsetX,
          offsetY: offsetY,
          left: left,
          right: right,
          top: top,
          bottom: bottom,
        },
      }));

      chrome.storage.local.set({
        toolbarPosition: {
          offsetX: offsetX,
          offsetY: offsetY,
          left: left,
          right: right,
          top: top,
          bottom: bottom,
        },
      });
    },
    [contextValue],
  );

  useLayoutEffect(() => {
    function setToolbarPosition(): void {
      if (!DragRef.current || !ToolbarRef.current) return;

      let xpos = DragRef.current.getDraggablePosition().x;
      let ypos = DragRef.current.getDraggablePosition().y;

      // Width and height of toolbar
      const width = ToolbarRef.current.getBoundingClientRect().width;
      const height = ToolbarRef.current.getBoundingClientRect().height;

      // Keep toolbar positioned relative to the bottom and right of the screen, proportionally
      if (xpos + width + 30 > window.innerWidth) {
        xpos = window.innerWidth - width - 30;
      }
      if (ypos + height - 60 > window.innerHeight) {
        ypos = window.innerHeight - height + 60;
      }

      DragRef.current.updatePosition({ x: xpos, y: ypos });
    }
    window.addEventListener("resize", setToolbarPosition);
    setToolbarPosition();
    return () => window.removeEventListener("resize", setToolbarPosition);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Mount時のみ実行（初期位置設定）
  useEffect(() => {
    if (!contextValue || !DragRef.current) return;
    const [contentState] = contextValue;

    let x = contentState.toolbarPosition.offsetX;
    let y = contentState.toolbarPosition.offsetY;

    if (contentState.toolbarPosition.bottom) {
      y = window.innerHeight - contentState.toolbarPosition.offsetY;
    }

    if (contentState.toolbarPosition.right) {
      x = window.innerWidth - contentState.toolbarPosition.offsetX;
    }

    DragRef.current.updatePosition({ x: x, y: y });

    handleDrop(null, {
      x: x,
      y: y,
      deltaX: 0,
      deltaY: 0,
      lastX: x,
      lastY: y,
      node: document.createElement("div"),
    });
  }, []);

  // contextValue の存在チェック - すべてのフック呼び出し後に行う
  if (!contextValue) return null;
  const [contentState] = contextValue;

  return (
    <div>
      {/* Toast は Wrapper.tsx で常時レンダリングされているため削除 */}
      <div
        className={
          contentState.paused && contentState.recording
            ? "ToolbarPaused"
            : "ToolbarPaused hidden"
        }
      ></div>
      <div className={`ToolbarBounds ${shake}`}></div>
      <Rnd
        default={{
          x: 200,
          y: 500,
          width: "auto",
          height: "auto",
        }}
        className={`react-draggable ${elastic} ${shake} ${dragging}`}
        dragHandleClassName="grab"
        enableResizing={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDrop}
        ref={DragRef}
      >
        <Toolbar.Root className={`ToolbarRoot ${side}`} ref={ToolbarRef}>
          <ToolTrigger grab type="button" content="">
            <GrabIcon />
          </ToolTrigger>
          <div className={"ToolbarRecordingControls"}>
            <ToolTrigger
              type="button"
              content={chrome.i18n.getMessage("finishRecordingTooltip")}
              disabled={!contentState.recording || contentState.clipRecording}
              onClick={() => {
                contentState.stopRecording();
              }}
            >
              <StopIcon width="20" height="20" />
            </ToolTrigger>
            <div
              className={`ToolbarRecordingTime ${
                contentState.timeWarning ? "TimerWarning" : ""
              }`}
              ref={timeRef}
            >
              {timestamp}
            </div>
            {/* === クリップ録画ボタン === */}

            {/* 状態: 初期（クリップ選択前） */}
            {!contentState.clipSelecting && !contentState.clipRecording && (
              <ToolTrigger
                type="button"
                content={`クリップ範囲を選択 (${contentState.clips?.length || 0}/${MAX_CLIPS})`}
                disabled={
                  !contentState.recording ||
                  contentState.paused ||
                  (contentState.clips?.length || 0) >= MAX_CLIPS
                }
                onClick={() => {
                  contentState.startClipSelection();
                }}
              >
                <ClipIcon width="20" height="20" />
              </ToolTrigger>
            )}

            {/* 状態: クロップ選択中 */}
            {contentState.clipSelecting && (
              <>
                {/* 決定ボタン */}
                <ToolTrigger
                  type="button"
                  content="クロップを確定してクリップ録画開始"
                  onClick={() => {
                    contentState.confirmClipSelection();
                  }}
                  className="clip-confirm-button"
                >
                  <CheckIcon width="20" height="20" />
                </ToolTrigger>

                {/* キャンセルボタン */}
                <ToolTrigger
                  type="button"
                  content="クリップ選択をキャンセル"
                  onClick={() => {
                    contentState.cancelClipSelection();
                  }}
                  className="clip-cancel-button"
                >
                  <CloseIcon width="20" height="20" />
                </ToolTrigger>
              </>
            )}

            {/* 状態: クリップ録画中 */}
            {contentState.clipRecording && (
              <ToolTrigger
                type="button"
                content="クリップ録画を終了"
                onClick={() => {
                  contentState.endClipRecording();
                }}
                className="clip-stop-button"
              >
                <ClipStopIcon width="20" height="20" />
              </ToolTrigger>
            )}
          </div>
        </Toolbar.Root>
      </Rnd>
    </div>
  );
};

export default ToolbarWrap;
