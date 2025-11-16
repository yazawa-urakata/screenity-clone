import React, { FC, useEffect, useState, useContext, useRef } from "react";

import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";

// Icons
import { EyeDropperIcon } from "./SVG";

// Context
import { contentStateContext } from "../../context/ContentState";

import * as ToggleGroup from "@radix-ui/react-toggle-group";

// Components
import TooltipWrap from "./TooltipWrap";
import ColorWheel from "./ColorWheel";
import StrokeWeight from "./StrokeWeight";

interface ColorItem {
  color: string;
  label: string;
}

interface EyeDropperResult {
  sRGBHex: string;
}

declare global {
  interface Window {
    EyeDropper: {
      new(): {
        open(): Promise<EyeDropperResult>;
      };
    };
  }
}

const RadialMenu: FC = () => {
  const contextValue = useContext(contentStateContext);
  if (!contextValue) return null;
  const [contentState, setContentState] = contextValue;

  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const radialMenuRef = useRef<HTMLDivElement>(null);
  const [fullwheel, setFullWheel] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [eyeDropperActive, setEyeDropperActive] = useState<boolean>(false);
  const [override, setOverride] = useState<string>("");
  const [renderColorWheel, setRenderColorWheel] = useState<boolean>(false);

  useEffect(() => {
    // Check if hideUI is set
    if (contentState.hideUI) {
      setOverride("override");
    } else {
      setOverride("");
    }
  }, [contentState.hideUI]);

  // Colors in menu
  const [colors] = useState<ColorItem[]>([
    { color: "#FED252", label: "Yellow" },
    { color: "#4597F7", label: "Blue" },
    { color: "#F24822", label: "Red" },
    { color: "#FFFFFF", label: "White" },
    { color: "#201F1D", label: "Black" },
  ]);

  useEffect(() => {
    if (!open) {
      setFullWheel(false);
      setRenderColorWheel(false);
    } else {
      const timeout = setTimeout(() => {
        setRenderColorWheel(true);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  const selectColor = (): void => {
    const eyeDropper = new window.EyeDropper();
    setEyeDropperActive(true);

    eyeDropper
      .open()
      .then((color: EyeDropperResult) => {
        setContentState((prevContentState) => ({
          ...prevContentState,
          color: color.sRGBHex,
          swatch: 5,
        }));
        setEyeDropperActive(false);
      })
      .catch(() => {
        setEyeDropperActive(false);
      });
  };

  useEffect(() => {
    if (!buttonRef.current) return;
    if (!radialMenuRef.current) return;

    const left =
      buttonRef.current.getBoundingClientRect().left +
      buttonRef.current.getBoundingClientRect().width / 2;
    const top =
      buttonRef.current.getBoundingClientRect().top +
      buttonRef.current.getBoundingClientRect().height / 2;

    radialMenuRef.current.style.left = `${left}px`;
    radialMenuRef.current.style.top = `${top}px`;
  }, [buttonRef, radialMenuRef]);

  return (
    <Popover.Root open={open} onOpenChange={() => setOpen(!open)}>
      <Popover.Trigger asChild>
        <div ref={ref}>
          <Tooltip.Provider>
            <Tooltip.Root delayDuration={700}>
              <Tooltip.Trigger asChild>
                <div className="ToolbarButton" ref={buttonRef}>
                  <div
                    className="ColorPicker"
                    style={{ backgroundColor: contentState.color }}
                  ></div>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal
                container={
                  document.getElementsByClassName("screenity-shadow-dom")[0]
                }
              >
                <Tooltip.Content
                  className={"TooltipContent" + " " + override}
                  style={{
                    display: override === "override" ? "none" : "block",
                  }}
                >
                  Color and stroke
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </Popover.Trigger>
      <Popover.Portal forceMount container={ref.current}>
        <Popover.Content avoidCollisions={false} asChild>
          <div
            className={fullwheel ? "radial-menu color-wheel" : "radial-menu"}
            ref={radialMenuRef}
            style={{
              position: "fixed",
            }}
          >
            <div className="eyedropper">
              <TooltipWrap content="Eyedropper">
                <div
                  tabIndex={open ? 0 : -1}
                  className={
                    eyeDropperActive ? "eyedropper eye-active" : "eyedropper"
                  }
                  onClick={() => {
                    selectColor();
                  }}
                >
                  <EyeDropperIcon />
                </div>
              </TooltipWrap>
            </div>
            <div className="radial-menu-items">
              <ToggleGroup.Root
                className="stroke-weight"
                type="single"
                value={String(contentState.strokeWidth)}
                onValueChange={(value: string) => {
                  setContentState((prevContentState) => ({
                    ...prevContentState,
                    strokeWidth: value,
                  }));
                }}
              >
                <StrokeWeight open={open} />
                {colors.map((color: ColorItem, index: number) => {
                  return (
                    <TooltipWrap
                      content={color.label}
                      style={{ backgroundColor: color.color }}
                      name="radial-menu-item"
                      override="tooltip-small"
                      key={index}
                    >
                      <div
                        tabIndex={open ? 0 : -1}
                        onClick={() => {
                          setContentState((prevContentState) => ({
                            ...prevContentState,
                            color: color.color,
                            swatch: index,
                          }));
                          chrome.storage.local.set({
                            color: color.color,
                            swatch: index,
                          });
                        }}
                        className={
                          contentState.swatch === index
                            ? "radial-menu-item-child color-active"
                            : "radial-menu-item-child"
                        }
                      >
                        {index}
                      </div>
                    </TooltipWrap>
                  );
                })}
                {renderColorWheel && (
                  <ColorWheel
                    fullwheel={fullwheel}
                    open={open}
                    setFullWheel={setFullWheel}
                  />
                )}
              </ToggleGroup.Root>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default RadialMenu;
