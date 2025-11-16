import React, { useEffect, useState, useContext } from "react";

import * as Select from "@radix-ui/react-select";

import styles from "../../styles/edit/_Dropdown.module.scss";

// Context
import { ContentStateContext } from "../../context/ContentState";

interface DropdownProps {
  icon?: boolean;
}

interface Preset {
  name: string;
  label?: string;
  width?: number;
  height?: number;
}

const Dropdown: React.FC<DropdownProps> = (props) => {
  const contextValue = useContext(ContentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const [label, setLabel] = useState<string>("None");
  const [value, setValue] = useState<string>("none");

  // Video presets for Youtube, Instagram, TikTok, etc.
  const presets: Preset[] = [
    {
      name: "none",
    },
    {
      name: "Youtube",
      label: "Youtube",
      width: 1920,
      height: 1080,
    },
    {
      name: "YoutubeShorts",
      label: "Youtube Shorts",
      width: 1920,
      height: 1080,
    },
    {
      name: "InstagramPost",
      label: "Instagram Post",
      width: 1080,
      height: 1080,
    },
    {
      name: "InstagramStory",
      label: "Instagram Story",
      width: 1080,
      height: 1920,
    },
    {
      name: "TikTok",
      label: "TikTok",
      width: 1080,
      height: 1920,
    },
    {
      name: "Facebook",
      label: "Facebook",
      width: 1080,
      height: 1080,
    },
    {
      name: "Twitter",
      label: "Twitter",
      width: 1080,
      height: 1080,
    },
    {
      name: "Dribbble",
      label: "Dribbble",
      width: 2800,
      height: 2100,
    },
  ];

  useEffect(() => {
    // Update the value when the contentState changes
    setValue(contentState.cropPreset);
    const foundPreset = presets.find(
      (preset) => preset.name === contentState.cropPreset
    );
    if (foundPreset) {
      setLabel(foundPreset.label || "None");
    }

    if (contentState.cropPreset === "none") return;
    const preset = presets.find(
      (preset) => preset.name === contentState.cropPreset
    );
    if (!preset || !preset.width || !preset.height) return;

    const aspectRatio = preset.width / preset.height;
    const maxWidth = contentState.prevWidth;
    const maxHeight = contentState.prevHeight;

    let width = Math.min(preset.width, maxWidth);
    let height = Math.min(preset.height, maxHeight);

    if (width > maxWidth || height > maxHeight) {
      if (width / height > aspectRatio) {
        width = Math.min(maxWidth, width);
        height = width / aspectRatio;
      } else {
        height = Math.min(maxHeight, height);
        width = height * aspectRatio;
      }
    }

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    const left = maxWidth / 2 - width / 2;
    const top = maxHeight / 2 - height / 2;

    setContentState((prevContentState) => ({
      ...prevContentState,
      fromCropper: false,
      width: width,
      height: height,
      left: left,
      top: top,
    }));
  }, [contentState.cropPreset]);

  return (
    <Select.Root
      value={value}
      onValueChange={(newValue: string) => {
        setValue(newValue);
        const foundPreset = presets.find((preset) => preset.name === newValue);
        if (foundPreset) {
          setLabel(foundPreset.label || "None");
        }
        setContentState((prevContentState) => ({
          ...prevContentState,
          cropPreset: newValue,
        }));
      }}
    >
      <Select.Trigger className={styles.SelectTrigger} aria-label="Food">
        {props.icon && (
          <Select.Icon className={styles.SelectIconType}></Select.Icon>
        )}
        <div className={styles.SelectValue}>
          <Select.Value placeholder="Select a source">{label}</Select.Value>
        </div>
        <Select.Icon className={styles.SelectIconDrop}>
          <img src="/assets/icons/dropdown.svg" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal className={styles.Portal}>
        <Select.Content position="popper" className={styles.SelectContent}>
          <Select.ScrollUpButton
            className={styles.SelectScrollButton}
          ></Select.ScrollUpButton>
          <Select.Viewport className={styles.SelectViewport}>
            <Select.Group>
              <SelectItem value="none">None</SelectItem>
            </Select.Group>

            <Select.Separator className={styles.SelectSeparator} />
            <Select.Group>
              {presets.map(
                (preset, index) =>
                  preset.name !== "none" && (
                    <SelectItem value={preset.name} key={index}>
                      {preset.label}
                    </SelectItem>
                  )
              )}
            </Select.Group>
          </Select.Viewport>
          <Select.ScrollDownButton
            className={styles.SelectScrollButton}
          ></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

interface SelectItemProps extends Select.SelectItemProps {
  children: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <Select.Item className={styles.SelectItem} {...props} ref={forwardedRef}>
        <Select.ItemText>{children}</Select.ItemText>
        <Select.ItemIndicator className={styles.SelectItemIndicator}>
          <img src="/assets/icons/check-white.svg" />
        </Select.ItemIndicator>
      </Select.Item>
    );
  }
);

export default Dropdown;
