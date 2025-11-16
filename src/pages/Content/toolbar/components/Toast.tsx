import React, {
  FC,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";

import * as ToastEl from "@radix-ui/react-toast";

// Context
import { contentStateContext, ContentStateType } from "../../context/ContentState";

const Toast: FC = () => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const [open, setOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [trigger, setTrigger] = useState<() => void>(() => () => {});
  const triggerRef = useRef<() => void>(trigger);
  const openRef = useRef<boolean>(open);
  const contentStateRef = useRef<ContentStateType>(contentState);
  const [toastDuration, setToastDuration] = useState<number>(2000);

  useEffect(() => {
    contentStateRef.current = contentState;
  }, [contentState]);

  const openToast = useCallback((title: string, action: () => void, durationMs: number = 2000): void => {
    if (contentStateRef.current.hideUI) return;
    setTitle(title);
    setOpen(true);
    setTrigger(() => action);
    setToastDuration(durationMs);
  }, []);

  useEffect(() => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      openToast: openToast,
    }));

    return () => {
      setContentState((prevContentState) => ({
        ...prevContentState,
        openToast: undefined,
      }));
    };
  }, [openToast]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    triggerRef.current = trigger;

    return () => {
      triggerRef.current = () => {};
    };
  }, [trigger]);

  return (
    <ToastEl.Provider swipeDirection="down" duration={toastDuration}>
      <ToastEl.Root
        className="ToastRoot"
        open={open}
        onOpenChange={setOpen}
        onEscapeKeyDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          triggerRef.current();
          setOpen(false);
        }}
      >
        <ToastEl.Title className="ToastTitle">{title}</ToastEl.Title>
        <ToastEl.Action
          className="ToastAction"
          asChild
          altText="Escape"
          onClick={() => {
            trigger();
          }}
        >
          <button
            className="Button"
            onClick={(e) => {
              e.stopPropagation();
              trigger();
            }}
          >
            Esc
          </button>
        </ToastEl.Action>
      </ToastEl.Root>
      <ToastEl.Viewport className="ToastViewport" />
    </ToastEl.Provider>
  );
};

export default Toast;
