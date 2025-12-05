import * as ToastEl from "@radix-ui/react-toast";
import {
  type FC,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// Context
import {
  type ContentStateType,
  contentStateContext,
} from "../../context/ContentState";

const Toast: FC = () => {
  const contextValue = useContext(contentStateContext);

  const [open, setOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [trigger, setTrigger] = useState<() => void>(() => () => {});
  const [toastDuration, setToastDuration] = useState<number>(2000);

  const triggerRef = useRef<() => void>(trigger);
  const openRef = useRef<boolean>(open);
  const contentStateRef = useRef<ContentStateType | null>(null);
  const setContentStateRef = useRef<
    ((value: React.SetStateAction<ContentStateType>) => void) | null
  >(null);

  const openToast = useCallback(
    (title: string, action: () => void, durationMs: number = 2000): void => {
      // エラー通知などの重要なメッセージは hideUI に関わらず表示する
      setTitle(title);
      setOpen(true);
      setTrigger(() => action);
      setToastDuration(durationMs);
    },
    [],
  );

  useEffect(() => {
    if (!contextValue) return;
    const [contentState, setContentState] = contextValue;

    contentStateRef.current = contentState;
    setContentStateRef.current = setContentState;
  }, [contextValue?.[0], contextValue?.[1]]);

  useEffect(() => {
    if (!setContentStateRef.current) return;

    setContentStateRef.current((prevContentState) => ({
      ...prevContentState,
      openToast: openToast,
    }));

    return () => {
      if (!setContentStateRef.current) return;
      setContentStateRef.current((prevContentState) => ({
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

  // contextValue の存在チェック - すべてのフック呼び出し後に行う
  if (!contextValue) return null;

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
            type="button"
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
