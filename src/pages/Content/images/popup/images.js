// I need to make this work for a Chrome extension, so I can't import images, instead it needs to be a string with the path to the image
const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets";

const DropdownIcon = `${URL}/dropdown.svg`;
const MicOnIcon = `${URL}/mic-on.svg`;
const MicOffIcon = `${URL}/mic-off.svg`;
const CameraOnIcon = `${URL}/camera-on.svg`;
const CameraOffIcon = `${URL}/camera-off.svg`;
const CheckWhiteIcon = `${URL}/check-white.svg`;
const ScreenTabOn = `${URL}/screen-tab-on.svg`;
const ScreenTabOff = `${URL}/screen-tab-off.svg`;
const TempFigma = `${URL}/temp/figma.webp`;
const TempTwitter = `${URL}/temp/twitter.webp`;
const TempDesignSystem = `${URL}/temp/designsystem.webp`;
const TempMarketing = `${URL}/temp/marketing.webp`;
const TempSubstack = `${URL}/temp/substack.webp`;
const CopyLinkIcon = `${URL}/copy-link.svg`;
const HandleControl = `${URL}/canvas/handle.png`;
const RotateControl = `${URL}/canvas/rotate.png`;
const MiddleHandleControl = `${URL}/canvas/middle-handle.png`;
const MiddleHandleControlV = `${URL}/canvas/middle-handle-v.png`;
const CameraOffBlue = `${URL}/camera-off-blue.svg`;
const MicOffBlue = `${URL}/mic-off-blue.svg`;
const DropdownGroup = `${URL}/dropdown-group.svg`;
const PlaceholderThumb = `${URL}/placeholder-thumb.png`;
const CloseWhiteIcon = `${URL}/close-white.svg`;

export {
  DropdownIcon,
  MicOnIcon,
  MicOffIcon,
  CameraOnIcon,
  CameraOffIcon,
  CheckWhiteIcon,
  ScreenTabOn,
  ScreenTabOff,
  TempFigma,
  TempTwitter,
  TempDesignSystem,
  TempMarketing,
  TempSubstack,
  CopyLinkIcon,
  HandleControl,
  RotateControl,
  MiddleHandleControl,
  MiddleHandleControlV,
  CameraOffBlue,
  MicOffBlue,
  DropdownGroup,
  PlaceholderThumb,
  CloseWhiteIcon,
};
