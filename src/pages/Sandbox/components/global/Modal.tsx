import React, { useState, useEffect, useContext, useCallback } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

// Context
import { ContentStateContext } from "../../context/ContentState";

interface ModalProps {}

const Modal: React.FC<ModalProps> = (props) => {
  const contextValue = useContext(ContentStateContext);

  if (!contextValue) {
    throw new Error("Modal must be used within ContentStateContext");
  }

  const [contentState, setContentState] = contextValue;
  const [title, setTitle] = useState<string>("Test");
  const [description, setDescription] = useState<string>("Description here");
  const [button1, setButton1] = useState<string | null>("Submit");
  const [button2, setButton2] = useState<string | null>("Cancel");
  const [trigger, setTrigger] = useState<() => void>(() => {});
  const [trigger2, setTrigger2] = useState<() => void>(() => {});
  const [showModal, setShowModal] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(null);
  const [learnmore, setLearnMore] = useState<string | null>(null);
  const [learnMoreLink, setLearnMoreLink] = useState<(() => void) | null>(() => {});
  const [colorSafe, setColorSafe] = useState<boolean>(false);
  const [sideButton, setSideButton] = useState<string | false>(false);
  const [sideButtonAction, setSideButtonAction] = useState<() => void>(() => {});

  const openModal = useCallback(
    (
      title: string,
      description: string,
      button1: string | null,
      button2: string | null,
      action: () => void,
      action2: () => void,
      image: string | null = null,
      learnMore: string | null = null,
      learnMoreLink: (() => void) | null = null,
      colorSafe: boolean = false,
      sideButton: string | false = false,
      sideButtonAction: () => void = () => {}
    ): void => {
      setTitle(title);
      setDescription(description);
      setButton1(button1);
      setButton2(button2);
      setShowModal(true);
      setTrigger(() => action);
      setTrigger2(() => action2);
      setImage(image);
      setLearnMore(learnMore);
      setLearnMoreLink(() => learnMoreLink);
      setColorSafe(colorSafe);
      setSideButton(sideButton);
      setSideButtonAction(() => sideButtonAction);
    },
    []
  );

  useEffect(() => {
    setContentState((prevContentState) => ({
      ...prevContentState,
      openModal: openModal,
    }));

    return () => {
      setContentState((prevContentState) => ({
        ...prevContentState,
        openModal: null,
      }));
    };
  }, [openModal, setContentState]);

  return (
    <AlertDialog.Root
      open={showModal}
      onOpenChange={(open: boolean) => {
        setShowModal(open);
      }}
    >
      <AlertDialog.Trigger asChild />
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="AlertDialogOverlay" />
        <AlertDialog.Content className="AlertDialogContent">
          <AlertDialog.Title className="AlertDialogTitle">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="AlertDialogDescription">
            {description}
            {learnmore && " "}
            {learnmore && (
              <a
                href="#"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (learnMoreLink) {
                    learnMoreLink();
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                {learnmore}
              </a>
            )}
          </AlertDialog.Description>
          {image && (
            <img
              src={image}
              style={{
                width: "100%",
                marginBottom: 15,
                marginTop: 5,
                borderRadius: "15px",
              }}
              alt="Modal illustration"
            />
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            {sideButton && (
              <button
                className="SideButtonModal"
                onClick={() => {
                  sideButtonAction();
                  setShowModal(false);
                }}
              >
                {sideButton}
              </button>
            )}
            {button2 && (
              <AlertDialog.Cancel asChild>
                <button className="Button grey" onClick={() => trigger2()}>
                  {button2}
                </button>
              </AlertDialog.Cancel>
            )}
            {button1 && (
              <AlertDialog.Action asChild>
                <button
                  className={!colorSafe ? "Button red" : "Button blue"}
                  onClick={() => trigger()}
                >
                  {button1}
                </button>
              </AlertDialog.Action>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

export default Modal;
