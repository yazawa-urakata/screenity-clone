import type { CSSProperties, FC } from "react";
import { ReactSVG } from "react-svg";

const URL = `chrome-extension://${chrome.i18n.getMessage("@@extension_id")}/assets/`;

interface SVGIconProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}

const GrabIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}tool-icons/grab-icon.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const StopIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/stop-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CameraCloseIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}camera-icons/close.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const CameraIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}tool-icons/camera-icon.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const AlertIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}tool-icons/alert-icon.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const TimeIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}tool-icons/time-icon.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const CloseIconPopup: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}close-icon-popup.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const MoreIconPopup: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}more-icon-popup.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const AudioIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}/tool-icons/audio-icon.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

const ClipIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}tool-icons/clip-icon.svg`}
      width={props.width || "20"}
      height={props.height || "20"}
    />
  );
};

const ClipStopIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}tool-icons/clip-stop-icon.svg`}
      width={props.width || "20"}
      height={props.height || "20"}
    />
  );
};

// チェックアイコン（決定ボタン用）
const CheckIcon: FC<SVGIconProps> = (props) => {
  return (
    <svg
      width={props.width || "20"}
      height={props.height || "20"}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={props.className}
      style={props.style}
      aria-hidden="true"
    >
      <path d="M7.5 13.5L3.5 9.5L4.91 8.09L7.5 10.67L15.09 3.09L16.5 4.5L7.5 13.5Z" />
    </svg>
  );
};

// クローズアイコン（キャンセルボタン用）
const CloseIcon: FC<SVGIconProps> = (props) => {
  return (
    <svg
      width={props.width || "20"}
      height={props.height || "20"}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={props.className}
      style={props.style}
      aria-hidden="true"
    >
      <path d="M15.5 5.91L14.09 4.5L10 8.59L5.91 4.5L4.5 5.91L8.59 10L4.5 14.09L5.91 15.5L10 11.41L14.09 15.5L15.5 14.09L11.41 10L15.5 5.91Z" />
    </svg>
  );
};

const NotSupportedIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={`${URL}/tool-icons/not-supported-icon.svg`}
      width={props.width}
      height={props.height}
    />
  );
};

export {
  GrabIcon,
  StopIcon,
  CameraCloseIcon,
  CameraIcon,
  AlertIcon,
  TimeIcon,
  CloseIconPopup,
  MoreIconPopup,
  AudioIcon,
  NotSupportedIcon,
  ClipIcon,
  ClipStopIcon,
  CheckIcon,
  CloseIcon,
};
