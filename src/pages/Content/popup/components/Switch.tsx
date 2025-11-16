import React, {
  FC,
  useContext,
  useEffect,
  useState,
  useRef,
  MouseEvent,
} from "react";
import * as S from "@radix-ui/react-switch";

// Components
import { DropdownIcon } from "../../images/popup/images";

// Context
import { contentStateContext } from "../../context/ContentState";
import { ContentStateContextType } from "../../../../types/context";

interface BaseSwitchProps {
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const BaseSwitch: FC<BaseSwitchProps> = ({ value, checked, onChange }) => (
  <S.Root
    className="SwitchRoot"
    id={value}
    checked={checked}
    onCheckedChange={onChange}
  >
    <S.Thumb className="SwitchThumb" />
  </S.Root>
);

interface SwitchProps {
  name: string;
  label?: string;
  value?: string;
  disabled?: boolean;
  experimental?: boolean;
  onChange?: (checked: boolean) => void;
}

const Switch: FC<SwitchProps> = (props) => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const switchRef = useRef<HTMLButtonElement>(null);
  const [hideToolbarLabel, setHideToolbarLabel] = useState<string>(
    chrome.i18n.getMessage("hideToolbarLabel")
  );
  const [hideToolbarState, setHideToolbarState] = useState<number>(1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownInRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check click outside
    const handleClickOutside = (event: Event): void => {
      if (props.name !== "hideUI") return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownInRef.current &&
        !dropdownInRef.current.contains(event.target as Node)
      ) {
        if (dropdownRef.current.querySelector(":hover")) return;
        if (dropdownInRef.current.querySelector(":hover")) return;
        // Check if any children of dropdownref are clicked also
        const children = dropdownRef.current.querySelectorAll("*");
        for (let i = 0; i < children.length; i++) {
          if (children[i].contains(event.target as Node)) return;
        }

        dropdownRef.current.classList.remove("labelDropdownActive");
      }
    };

    // Bind the event listener
    document.addEventListener("click", handleClickOutside);

    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("click", handleClickOutside);
    };
  }, [props.name]);

  useEffect(() => {
    if (props.name === "hideUI") {
      if (contentState?.hideUIAlerts) {
        setHideToolbarLabel(chrome.i18n.getMessage("hideUIAlerts"));
        setHideToolbarState(2);
      } else if (contentState?.hideToolbar) {
        setHideToolbarLabel(chrome.i18n.getMessage("hideToolbarLabel"));
        setHideToolbarState(1);
      } else if (contentState?.toolbarHover) {
        setHideToolbarLabel(chrome.i18n.getMessage("toolbarHoverOnly"));
        setHideToolbarState(3);
      }
    }
  }, [props.name, contentState?.hideToolbar, contentState?.hideUIAlerts, contentState?.toolbarHover]);

  return (
    <form>
      <div className="SwitchRow">
        <label
          className="Label"
          htmlFor={props.name}
          style={{ paddingRight: 15 }}
          onClick={(e: MouseEvent<HTMLLabelElement>) => {
            if (props.name === "hideUI") {
              e.preventDefault();
              e.stopPropagation();
              if ((e.target as HTMLElement).classList.contains("labelDropdownContentItem"))
                return;
              dropdownRef.current?.classList.toggle("labelDropdownActive");
            }
          }}
        >
          {props.name !== "hideUI" && props.label}
          {props.name === "hideUI" && (
            <div className="labelDropdownWrap" ref={dropdownRef}>
              <div className="labelDropdown" ref={dropdownInRef}>
                {hideToolbarLabel}
                <img src={DropdownIcon} alt="dropdown" />
              </div>
              <div className="labelDropdownContent">
                <div
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: true,
                      hideUIAlerts: false,
                      toolbarHover: false,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: true,
                      hideUIAlerts: false,
                      toolbarHover: false,
                    });
                    setHideToolbarLabel(
                      chrome.i18n.getMessage("hideToolbarLabel")
                    );
                    dropdownRef.current?.classList.remove("labelDropdownActive");
                    setHideToolbarState(1);
                  }}
                >
                  {chrome.i18n.getMessage("hideToolbarLabel")}
                </div>
                <div
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: false,
                      hideUIAlerts: true,
                      toolbarHover: false,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: false,
                      hideUIAlerts: true,
                      toolbarHover: false,
                    });
                    setHideToolbarLabel(chrome.i18n.getMessage("hideUIAlerts"));
                    dropdownRef.current?.classList.remove("labelDropdownActive");
                    setHideToolbarState(2);
                  }}
                >
                  {chrome.i18n.getMessage("hideUIAlerts")}
                </div>
                <div
                  className="labelDropdownContentItem"
                  onClick={() => {
                    setContentState((prevContentState) => ({
                      ...prevContentState,
                      hideToolbar: false,
                      hideUIAlerts: false,
                      toolbarHover: true,
                    }));
                    chrome.storage.local.set({
                      hideToolbar: false,
                      hideUIAlerts: false,
                      toolbarHover: true,
                    });
                    setHideToolbarLabel(
                      chrome.i18n.getMessage("toolbarHoverOnly")
                    );
                    dropdownRef.current?.classList.remove("labelDropdownActive");
                    setHideToolbarState(3);
                  }}
                >
                  {chrome.i18n.getMessage("toolbarHoverOnly")}
                </div>
              </div>
            </div>
          )}
          {props.experimental && (
            <span className="ExperimentalLabel">Experimental</span>
          )}
        </label>
        {props.value ? (
          <S.Root
            className="SwitchRoot"
            id={props.value}
            ref={switchRef}
            checked={contentState?.[props.value] as boolean}
            disabled={props.disabled}
            onCheckedChange={(checked: boolean) => {
              if (props.disabled) return;

              setContentState((prevContentState) => ({
                ...prevContentState,
                [props.value as string]: checked,
              }));
              chrome.storage.local.set({ [props.value as string]: checked });

              if (props.value === "customRegion") {
                if (checked) {
                  chrome.storage.local.set({
                    region: true,
                  });
                }
              }

              if (props.name === "hideUI") {
                if (hideToolbarState === 1) {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    hideToolbar: true,
                    hideUIAlerts: false,
                    toolbarHover: false,
                  }));
                  chrome.storage.local.set({
                    hideToolbar: true,
                    hideUIAlerts: false,
                    toolbarHover: false,
                  });
                } else if (hideToolbarState === 2) {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    hideToolbar: false,
                    hideUIAlerts: true,
                    toolbarHover: false,
                  }));
                  chrome.storage.local.set({
                    hideToolbar: false,
                    hideUIAlerts: true,
                    toolbarHover: false,
                  });
                } else if (hideToolbarState === 3) {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    hideToolbar: false,
                    hideUIAlerts: false,
                    toolbarHover: true,
                  }));
                  chrome.storage.local.set({
                    hideToolbar: false,
                    hideUIAlerts: false,
                    toolbarHover: true,
                  });
                }
              } else if (props.name === "pushToTalk") {
                if (!checked) {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    micActive: true,
                  }));
                }
              }

              if (typeof props.onChange === "function") {
                props.onChange(checked);
              }
            }}
          >
            <S.Thumb className="SwitchThumb" />
          </S.Root>
        ) : (
          <S.Root className="SwitchRoot" id={props.name}>
            <S.Thumb className="SwitchThumb" />
          </S.Root>
        )}
      </div>
    </form>
  );
};

export default Switch;
