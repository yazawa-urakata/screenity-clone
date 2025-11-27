import React, {
  useState,
  useEffect,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";

import Welcome from "./layout/Welcome";
import LoginPrompt from "./layout/LoginPrompt";

import { Rnd } from "react-rnd";
import type { DraggableData } from "react-rnd";

import {
  CloseIconPopup,
  GrabIconPopup,
} from "../toolbar/components/SVG";

/* Component import */
import RecordingTab from "./layout/RecordingTab";

// Layouts
import Announcement from "./layout/Announcement";
import SettingsMenu from "./layout/SettingsMenu";
import InactiveSubscription from "./layout/InactiveSubscription";
import LoggedOut from "./layout/LoggedOut";

// Context
import { contentStateContext } from "../context/ContentState";

interface PopupContainerProps {
  shadowRef: React.RefObject<HTMLDivElement & { shadowRoot: ShadowRoot }>;
}

const PopupContainer: React.FC<PopupContainerProps> = (props) => {
  const [contentState, setContentState] = useContext(contentStateContext);
  const contentStateRef = useRef(contentState);
  const DragRef = useRef<Rnd>(null);
  const PopupRef = useRef<HTMLDivElement>(null);
  const [elastic, setElastic] = useState<string>("");
  const [shake, setShake] = useState<string>("");
  const [dragging, setDragging] = useState<string>("");
  const [onboarding, setOnboarding] = useState<boolean>(false);
  const [showProSplash, setShowProSplash] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check chrome storage
    chrome.storage.local.get(
      ["onboarding", "showProSplash"],
      function (result) {
        if (result.onboarding) {
          setOnboarding(true);
          setContentState((prevContentState: any) => ({
            ...prevContentState,
            onboarding: true,
          }));
        }
        if (result.showProSplash) {
          setShowProSplash(true);
          setContentState((prevContentState: any) => ({
            ...prevContentState,
            showProSplash: true,
          }));
        }
      }
    );
  }, []);

  useEffect(() => {
    if (contentState.isLoggedIn) {
      setOnboarding(false);
      setShowProSplash(false);
    } else {
      setOnboarding(contentState.onboarding);
      setShowProSplash(contentState.showProSplash);
    }
  }, [
    contentState.isLoggedIn,
    contentState.onboarding,
    contentState.showProSplash,
  ]);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  useLayoutEffect(() => {
    function setPopupPosition(e?: Event): void {
      if (!DragRef.current || !PopupRef.current) return;

      let xpos = DragRef.current.getDraggablePosition().x;
      let ypos = DragRef.current.getDraggablePosition().y;

      // Width and height of popup
      const width = PopupRef.current.getBoundingClientRect().width;
      const height = PopupRef.current.getBoundingClientRect().height;

      // Keep popup positioned relative to the bottom and right of the screen, proportionally
      if (xpos > window.innerWidth + 10) {
        xpos = window.innerWidth + 10;
      }
      if (ypos + height + 40 > window.innerHeight) {
        ypos = window.innerHeight - height - 40;
      }

      // Check if attached to right or bottom, if so, keep it there
      if (contentStateRef.current.popupPosition.fixed) {
        if (xpos < window.innerWidth) {
          xpos = window.innerWidth + 10;
        }
      }

      DragRef.current.updatePosition({ x: xpos, y: ypos });
    }
    window.addEventListener("resize", setPopupPosition);
    setPopupPosition();
    return () => window.removeEventListener("resize", setPopupPosition);
  }, []);

  const handleDragStart = (e: any, d: DraggableData): void => {
    setDragging("ToolbarDragging");
  };

  const handleDrag = (e: any, d: DraggableData): void => {
    if (!PopupRef.current) return;

    // Width and height
    const width = PopupRef.current.getBoundingClientRect().width;
    const height = PopupRef.current.getBoundingClientRect().height;

    if (
      d.x - 40 < width ||
      d.x > window.innerWidth + 10 ||
      d.y < 0 ||
      d.y + height + 40 > window.innerHeight
    ) {
      setShake("ToolbarShake");
    } else {
      setShake("");
    }
  };

  const handleDrop = (e: any, d: DraggableData): void => {
    if (!PopupRef.current || !DragRef.current) return;

    let anim = "ToolbarElastic";
    if (e === null) {
      anim = "";
    }
    setShake("");
    setDragging("");
    let xpos = d.x;
    let ypos = d.y;

    // Width and height
    const width = PopupRef.current.getBoundingClientRect().width;
    const height = PopupRef.current.getBoundingClientRect().height;

    // Check if popup is off screen
    if (d.x - 40 < width) {
      setElastic(anim);
      xpos = width + 40;
    } else if (d.x + 10 > window.innerWidth) {
      setElastic(anim);
      xpos = window.innerWidth + 10;
    }

    if (d.y < 0) {
      setElastic(anim);
      ypos = 0;
    } else if (d.y + height + 40 > window.innerHeight) {
      setElastic(anim);
      ypos = window.innerHeight - height - 40;
    }
    DragRef.current.updatePosition({ x: xpos, y: ypos });

    setTimeout(() => {
      setElastic("");
    }, 250);

    setContentState((prevContentState: any) => ({
      ...prevContentState,
      popupPosition: {
        ...prevContentState.popupPosition,
        offsetX: xpos,
        offsetY: ypos,
        left: xpos < window.innerWidth / 2 ? true : false,
        right: xpos < window.innerWidth / 2 ? false : true,
        top: ypos < window.innerHeight / 2 ? true : false,
        bottom: ypos < window.innerHeight / 2 ? false : true,
      },
    }));

    // Is it on the left or right, also top or bottom
    let left = xpos < window.innerWidth / 2 ? true : false;
    let right = xpos < window.innerWidth / 2 ? false : true;
    let top = ypos < window.innerHeight / 2 ? true : false;
    let bottom = ypos < window.innerHeight / 2 ? false : true;
    let offsetX = xpos;
    let offsetY = ypos;
    let fixed = d.x + 9 > window.innerWidth ? true : false;

    if (right) {
      offsetX = window.innerWidth - xpos;
    }
    if (bottom) {
      offsetY = window.innerHeight - ypos;
    }

    setContentState((prevContentState: any) => ({
      ...prevContentState,
      popupPosition: {
        ...prevContentState.popupPosition,
        offsetX: offsetX,
        offsetY: offsetY,
        left: left,
        right: right,
        top: top,
        bottom: bottom,
        fixed: fixed,
      },
    }));

    chrome.storage.local.set({
      popupPosition: {
        offsetX: offsetX,
        offsetY: offsetY,
        left: left,
        right: right,
        top: top,
        bottom: bottom,
        fixed: fixed,
      },
    });
  };

  useEffect(() => {
    if (!DragRef.current) return;

    let x = contentState.popupPosition.offsetX;
    let y = contentState.popupPosition.offsetY;

    if (contentState.popupPosition.bottom) {
      y = window.innerHeight - contentState.popupPosition.offsetY;
    }

    if (contentState.popupPosition.right) {
      x = window.innerWidth - contentState.popupPosition.offsetX;
    }

    DragRef.current.updatePosition({ x: x, y: y });

    handleDrop(null, { x: x, y: y, deltaX: 0, deltaY: 0, lastX: x, lastY: y, node: null as any });
  }, []);


  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <div className={"ToolbarBounds" + " " + shake}></div>
      <Rnd
        default={{
          x: contentState.popupPosition.offsetX,
          y: contentState.popupPosition.offsetY,
          width: "auto",
          height: "auto",
        }}
        className={
          "react-draggable" + " " + elastic + " " + shake + " " + dragging
        }
        enableResizing={false}
        dragHandleClassName="drag-area"
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDrop}
        ref={DragRef}
      >
        <div className="popup-container" ref={PopupRef}>
          <div
            className={open ? "popup-drag-head" : "popup-drag-head drag-area"}
          ></div>
          <div
            className={
              open ? "popup-controls open" : "popup-controls drag-area"
            }
          >
            <SettingsMenu
              shadowRef={props.shadowRef}
              open={open}
              setOpen={setOpen}
            />
            <div
              className="popup-control popup-close"
              onClick={() => {
                setContentState((prevContentState: any) => ({
                  ...prevContentState,
                  showExtension: false,
                }));
              }}
            >
              <CloseIconPopup />
            </div>
          </div>
          <div className="popup-nav"></div>
          <div className="popup-content">
            {/* ケース1: ログイン済み + サブスクリプション無効 */}
            {contentState.isSubscribed === false &&
              contentState.isLoggedIn === true ? (
              <InactiveSubscription
                subscription={contentState.proSubscription}
                hasSubscribedBefore={contentState.hasSubscribedBefore}
                onManageClick={() => {
                  const type = contentState.hasSubscribedBefore
                    ? "handle-reactivate"
                    : "handle-upgrade";
                  chrome.runtime.sendMessage({ type });
                }}
                onDowngradeClick={async () => {
                  // Supabaseログアウト
                  await chrome.runtime.sendMessage({ type: 'SUPABASE_CLEAR_AUTH' });

                  setContentState((prev: any) => ({
                    ...prev,
                    isLoggedIn: false,
                    isSubscribed: false,
                    screenityUser: null,
                    proSubscription: null,
                    wasLoggedIn: true,
                  }));

                  // ストレージにも保存
                  chrome.storage.local.set({ wasLoggedIn: true });

                  contentState.openToast(
                    chrome.i18n.getMessage("loggedOutToastTitle"),
                    () => { },
                    2000
                  );
                }}
              />
            ) : (onboarding || showProSplash) ? (
              /* ケース2: オンボーディング中 */
              <Welcome
                setOnboarding={setOnboarding}
                setContentState={setContentState}
                isBack={showProSplash}
                clearBack={() => {
                  setContentState((prev: any) => ({
                    ...prev,
                    showProSplash: false,
                  }));
                  chrome.storage.local.set({ showProSplash: false });
                  setShowProSplash(false);
                }}
              />
            ) : !contentState.isLoggedIn && contentState.wasLoggedIn ? (
              /* ケース3: 過去にログインしていたがログアウトした */
              <LoggedOut
                onManageClick={() => {
                  // Supabaseログインページを開く
                  chrome.runtime.sendMessage({ type: 'SUPABASE_LOGIN_REQUEST' });
                }}
                onDowngradeClick={() => {
                  chrome.storage.local.set({ wasLoggedIn: false });
                  setContentState((prev: any) => ({
                    ...prev,
                    isLoggedIn: false,
                    wasLoggedIn: false,
                  }));
                }}
              />
            ) : !contentState.isLoggedIn && !contentState.wasLoggedIn && !contentState.skipLogin ? (
              /* ケース4: 初回ユーザー（未ログイン） */
              <LoginPrompt
                onLoginClick={() => {
                  // Supabaseログインページを開く
                  chrome.runtime.sendMessage({ type: 'SUPABASE_LOGIN_REQUEST' });
                }}
              />
            ) : (
              /* ケース5: その他（ログイン済み、またはskipLogin: true） */
              <RecordingTab shadowRef={props.shadowRef} />
            )}
          </div>
        </div>
      </Rnd>
    </div>
  );
};

export default PopupContainer;
