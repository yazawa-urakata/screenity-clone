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

  return (
    <form>
      <div className="SwitchRow">
        <label
          className="Label"
          htmlFor={props.name}
          style={{ paddingRight: 15 }}
        >
          {props.label}
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

              if (props.name === "pushToTalk") {
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
