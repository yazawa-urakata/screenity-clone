import React, {
  FC,
  useEffect,
  useState,
  useContext,
  useRef,
  MouseEvent,
  forwardRef,
  ReactNode,
} from "react";

import * as Select from "@radix-ui/react-select";
import {
  DropdownIcon,
  CheckWhiteIcon,
  CameraOnIcon,
  CameraOffIcon,
  MicOnIcon,
  MicOffIcon,
} from "../../images/popup/images";

// Context
import { contentStateContext } from "../../context/ContentState";
import { ContentStateContextType } from "../../../../types/context";

interface DropdownProps {
  type: "camera" | "mic";
  shadowRef: React.RefObject<HTMLDivElement>;
}

const Dropdown: FC<DropdownProps> = (props) => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const [label, setLabel] = useState<string>(chrome.i18n.getMessage("None"));
  const [open, setOpen] = useState<boolean>(false);

  const updateItems = (): void => {
    if (props.type === "camera") {
      if (
        contentState?.defaultVideoInput === "none" ||
        !contentState?.cameraActive
      ) {
        setLabel(chrome.i18n.getMessage("noCameraDropdownLabel"));
      } else {
        // Check if defaultVideoInput is in camdevices, if not set to none
        if (
          contentState?.videoInput?.find(
            (device) => device.deviceId === contentState?.defaultVideoInput
          )
        ) {
          const device = contentState.videoInput.find(
            (device) => device.deviceId === contentState.defaultVideoInput
          );
          if (device) {
            setLabel(device.label);
          }
        } else {
          setLabel(chrome.i18n.getMessage("noCameraDropdownLabel"));
        }
      }
    } else {
      if (
        contentState?.defaultAudioInput === "none" ||
        (!contentState?.micActive && !contentState?.pushToTalk)
      ) {
        setLabel(chrome.i18n.getMessage("noMicrophoneDropdownLabel"));
      } else {
        // Check if defaultAudioInput is in micdevices, if not set to none
        if (
          contentState?.audioInput?.find(
            (device) => device.deviceId === contentState?.defaultAudioInput
          )
        ) {
          const device = contentState.audioInput.find(
            (device) => device.deviceId === contentState.defaultAudioInput
          );
          if (device) {
            setLabel(device.label);
          }
        } else {
          setLabel(chrome.i18n.getMessage("noMicrophoneDropdownLabel"));
        }
      }
    }
  };

  useEffect(() => {
    updateItems();
  }, [
    contentState?.defaultAudioInput,
    contentState?.defaultVideoInput,
    contentState?.audioInput,
    contentState?.videoInput,
    contentState?.cameraActive,
    contentState?.micActive,
  ]);

  useEffect(() => {
    updateItems();
  }, []);

  const toggleActive = (e: MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (props.type === "camera") {
      if (contentState?.cameraActive) {
        setContentState((prevContentState) => ({
          ...prevContentState,
          cameraActive: false,
        }));
        chrome.storage.local.set({
          cameraActive: false,
        });
        setLabel(chrome.i18n.getMessage("noCameraDropdownLabel"));
      } else {
        setContentState((prevContentState) => ({
          ...prevContentState,
          cameraActive: true,
        }));
        chrome.storage.local.set({
          cameraActive: true,
        });
        const device = contentState?.videoInput?.find(
          (device) => device.deviceId === contentState?.defaultVideoInput
        );
        if (device) {
          setLabel(device.label);
        }
      }
    } else {
      if (contentState?.micActive) {
        setContentState((prevContentState) => ({
          ...prevContentState,
          micActive: false,
        }));
        chrome.storage.local.set({
          micActive: false,
        });
        setLabel(chrome.i18n.getMessage("noMicrophoneDropdownLabel"));
      } else {
        setContentState((prevContentState) => ({
          ...prevContentState,
          micActive: true,
        }));
        chrome.storage.local.set({
          micActive: true,
        });
        const device = contentState?.audioInput?.find(
          (device) => device.deviceId === contentState?.defaultAudioInput
        );
        if (device) {
          setLabel(device.label);
        }
      }
    }
  };

  const clickedIcon = useRef<boolean>(false);

  return (
    <Select.Root
      open={open}
      onOpenChange={(open: boolean) => {
        if (clickedIcon.current) return;
        setOpen(open);
      }}
      value={
        props.type === "camera" && contentState?.cameraActive
          ? contentState?.defaultVideoInput
          : props.type === "camera" && !contentState?.cameraActive
          ? "none"
          : props.type === "mic" &&
            (contentState?.micActive || contentState?.pushToTalk)
          ? contentState?.defaultAudioInput
          : props.type === "mic" && !contentState?.micActive
          ? "none"
          : "none"
      }
      onValueChange={(newValue: string) => {
        if (props.type === "camera") {
          if (newValue === "none") {
            setContentState((prevContentState) => ({
              ...prevContentState,
              cameraActive: false,
            }));
            chrome.storage.local.set({
              cameraActive: false,
            });
            setLabel(chrome.i18n.getMessage("noCameraDropdownLabel"));
          } else {
            setContentState((prevContentState) => ({
              ...prevContentState,
              defaultVideoInput: newValue,
              cameraActive: true,
            }));
            chrome.storage.local.set({
              defaultVideoInput: newValue,
              cameraActive: true,
            });
            chrome.runtime.sendMessage({
              type: "switch-camera",
              id: newValue,
            });
            const device = contentState?.videoInput?.find(
              (device) => device.deviceId === newValue
            );
            if (device) {
              setLabel(device.label);
            }
          }
        } else {
          if (newValue === "none") {
            setContentState((prevContentState) => ({
              ...prevContentState,
              micActive: false,
            }));
            chrome.storage.local.set({
              micActive: false,
            });
            setLabel(chrome.i18n.getMessage("noMicrophoneDropdownLabel"));
          } else {
            setContentState((prevContentState) => ({
              ...prevContentState,
              defaultAudioInput: newValue,
              micActive: true,
            }));
            chrome.storage.local.set({
              defaultAudioInput: newValue,
              micActive: true,
            });
            const device = contentState?.audioInput?.find(
              (device) => device.deviceId === newValue
            );
            if (device) {
              setLabel(device.label);
            }
          }
        }
      }}
    >
      <Select.Trigger className="SelectTrigger" aria-label="Food">
        <Select.Icon
          className="SelectIconType"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
            clickedIcon.current = true;
          }}
          onMouseDown={(e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(false);
            clickedIcon.current = true;
          }}
          onMouseUp={() => {
            clickedIcon.current = false;
          }}
        >
          <div
            className="SelectIconButton"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              setOpen(false);
              toggleActive(e);
              clickedIcon.current = true;
            }}
            onMouseDown={(e: MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
              setOpen(false);
              clickedIcon.current = true;
            }}
            onContextMenu={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={() => {
              clickedIcon.current = false;
            }}
          >
            {props.type === "camera" && (
              <img
                src={
                  contentState?.defaultVideoInput === "none" ||
                  !contentState?.cameraActive
                    ? CameraOffIcon
                    : CameraOnIcon
                }
                alt="camera"
              />
            )}
            {props.type === "mic" && (
              <img
                src={
                  contentState?.defaultAudioInput === "none" ||
                  !contentState?.micActive
                    ? MicOffIcon
                    : MicOnIcon
                }
                alt="mic"
              />
            )}
          </div>
        </Select.Icon>
        <div className="SelectValue">
          <Select.Value
            placeholder={chrome.i18n.getMessage(
              "selectSourceDropdownPlaceholder"
            )}
          >
            {label}
          </Select.Value>
        </div>
        {props.type === "camera" &&
          (contentState?.defaultVideoInput === "none" ||
            !contentState?.cameraActive) && (
            <div className="SelectOff">
              {chrome.i18n.getMessage("offLabel")}
            </div>
          )}
        {props.type === "mic" &&
          (contentState?.defaultAudioInput === "none" ||
            (!contentState?.micActive && !contentState?.pushToTalk)) && (
            <div className="SelectOff">
              {chrome.i18n.getMessage("offLabel")}
            </div>
          )}
        <Select.Icon className="SelectIconDrop">
          <img src={DropdownIcon} alt="dropdown" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal
        container={
          props.shadowRef.current?.shadowRoot?.querySelector(
            ".container"
          ) as HTMLElement
        }
      >
        <Select.Content position="popper" className="SelectContent">
          <Select.ScrollUpButton className="SelectScrollButton"></Select.ScrollUpButton>
          <Select.Viewport className="SelectViewport">
            <Select.Group>
              <SelectItem value="none">
                {props.type === "camera"
                  ? chrome.i18n.getMessage("noCameraDropdownLabel")
                  : chrome.i18n.getMessage("noMicrophoneDropdownLabel")}
              </SelectItem>
            </Select.Group>
            {props.type === "camera" &&
              contentState?.videoInput &&
              contentState.videoInput.length > 0 && (
                <Select.Separator className="SelectSeparator" />
              )}
            {props.type === "mic" &&
              contentState?.audioInput &&
              contentState.audioInput.length > 0 && (
                <Select.Separator className="SelectSeparator" />
              )}
            <Select.Group>
              {props.type === "camera" &&
                contentState?.videoInput?.map((device) => (
                  <SelectItem value={device.deviceId} key={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              {props.type === "mic" &&
                contentState?.audioInput?.map((device) => (
                  <SelectItem value={device.deviceId} key={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton className="SelectScrollButton"></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

interface SelectItemProps {
  children: ReactNode;
  className?: string;
  value: string;
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <Select.Item className="SelectItem" {...props} ref={forwardedRef}>
        <Select.ItemText>{children}</Select.ItemText>
        <Select.ItemIndicator className="SelectItemIndicator">
          <img src={CheckWhiteIcon} alt="check" />
        </Select.ItemIndicator>
      </Select.Item>
    );
  }
);

SelectItem.displayName = "SelectItem";

export default Dropdown;
