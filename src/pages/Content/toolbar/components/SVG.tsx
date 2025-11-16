import React, { FC, CSSProperties } from "react";
import { ReactSVG } from "react-svg";

const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets/";

interface SVGIconProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: CSSProperties;
}

const GrabIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/grab-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};
/*

*/

// Convert all to ReactSVG

const StopIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/stop-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const DrawIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/draw-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const PauseIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/pause-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const ResumeIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/resume-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CursorIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/cursor-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CommentIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/comment-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const MicIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/mic-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const MoreIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/more-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const RestartIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/restart-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const DiscardIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/discard-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const EyeDropperIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/eyedropper-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const Stroke1Icon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/stroke-1-icon.svg"}
      width={props.width}
      height={props.height}
      className={props.className}
      style={{
        textAlign: "center",
        margin: "auto",
        display: "block",
        width: "100%",
        height: "100%",
      }}
    />
  );
};

const Stroke2Icon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/stroke-2-icon.svg"}
      width={props.width}
      height={props.height}
      className={props.className}
      style={{
        textAlign: "center",
        margin: "auto",
        display: "block",
        width: "100%",
        height: "100%",
      }}
    />
  );
};

const Stroke3Icon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/stroke-3-icon.svg"}
      width={props.width}
      height={props.height}
      className={props.className}
      style={{
        textAlign: "center",
        margin: "auto",
        display: "block",
        width: "100%",
        height: "100%",
      }}
    />
  );
};

const TargetCursorIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/target-cursor-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const HighlightCursorIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/highlight-cursor-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const HideCursorIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/hide-cursor-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const TextIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/text-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const ArrowIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/arrow-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const EraserIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/eraser-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const PenIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/pen-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const ShapeIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/shape-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const SelectIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/select-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const UndoIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/undo-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const RedoIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/redo-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const ImageIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/image-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const TransformIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/transform-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const HighlighterIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/highlighter-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const RectangleIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/rectangle-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CircleIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/circle-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const TriangleIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/triangle-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const RectangleFilledIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/rectangle-filled-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CircleFilledIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/circle-filled-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const TriangleFilledIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/triangle-filled-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const TrashIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/trash-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const VideoOffIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "camera-icons/video-off.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CameraCloseIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "camera-icons/close.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CameraMoreIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "camera-icons/more.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CameraResizeIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "camera-icons/camera-resize.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CameraIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/camera-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const BlurIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/blur-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const AlertIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/alert-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const TimeIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/time-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};
const SpotlightCursorIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "tool-icons/spotlight-cursor-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const Pip: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "camera-icons/pip.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CloseIconPopup: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "close-icon-popup.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const GrabIconPopup: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "grab-icon-popup.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const MoreIconPopup: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "more-icon-popup.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const OnboardingArrow: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "/helper/onboarding-arrow.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const NoInternet: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "/editor/icons/no-internet.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const CloseButtonToolbar: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "/tool-icons/close-button.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const HelpIconPopup: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "/tool-icons/help-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const AudioIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "/tool-icons/audio-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

const NotSupportedIcon: FC<SVGIconProps> = (props) => {
  return (
    <ReactSVG
      src={URL + "/tool-icons/not-supported-icon.svg"}
      width={props.width}
      height={props.height}
    />
  );
};

export {
  GrabIcon,
  StopIcon,
  DrawIcon,
  PauseIcon,
  ResumeIcon,
  CursorIcon,
  CommentIcon,
  MicIcon,
  MoreIcon,
  RestartIcon,
  DiscardIcon,
  EyeDropperIcon,
  Stroke1Icon,
  Stroke2Icon,
  Stroke3Icon,
  TargetCursorIcon,
  HighlightCursorIcon,
  HideCursorIcon,
  TextIcon,
  ArrowIcon,
  EraserIcon,
  PenIcon,
  ShapeIcon,
  SelectIcon,
  UndoIcon,
  RedoIcon,
  ImageIcon,
  TransformIcon,
  HighlighterIcon,
  RectangleIcon,
  CircleIcon,
  TriangleIcon,
  RectangleFilledIcon,
  CircleFilledIcon,
  TriangleFilledIcon,
  TrashIcon,
  VideoOffIcon,
  CameraCloseIcon,
  CameraMoreIcon,
  CameraResizeIcon,
  CameraIcon,
  BlurIcon,
  AlertIcon,
  TimeIcon,
  SpotlightCursorIcon,
  Pip,
  CloseIconPopup,
  GrabIconPopup,
  OnboardingArrow,
  NoInternet,
  CloseButtonToolbar,
  HelpIconPopup,
  MoreIconPopup,
  AudioIcon,
  NotSupportedIcon,
};
