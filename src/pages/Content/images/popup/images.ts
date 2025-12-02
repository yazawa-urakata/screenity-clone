// I need to make this work for a Chrome extension, so I can't import images, instead it needs to be a string with the path to the image
const URL =
  "chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/assets";

const DropdownIcon = `${URL}/dropdown.svg`;
const MicOnIcon = `${URL}/mic-on.svg`;
const MicOffIcon = `${URL}/mic-off.svg`;
const CheckWhiteIcon = `${URL}/check-white.svg`;
const MicOffBlue = `${URL}/mic-off-blue.svg`;
const DropdownGroup = `${URL}/dropdown-group.svg`;
const CloseWhiteIcon = `${URL}/close-white.svg`;

export {
  DropdownIcon,
  MicOnIcon,
  MicOffIcon,
  CheckWhiteIcon,
  MicOffBlue,
  DropdownGroup,
  CloseWhiteIcon,
};
