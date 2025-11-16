import React, { FC, useEffect, useContext, useState, ReactNode, CSSProperties } from "react";

import * as Tooltip from "@radix-ui/react-tooltip";

// Context
import { contentStateContext } from "../../context/ContentState";

interface TooltipWrapProps {
  name?: string;
  style?: CSSProperties;
  content: string;
  children: ReactNode;
  override?: string;
  hide?: string;
  tooltipStyle?: CSSProperties;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

const TooltipWrap: FC<TooltipWrapProps> = (props) => {
  const contextValue = useContext(contentStateContext);
  const classname = props.name ? props.name : "";
  const [override, setOverride] = useState<string>("");

  useEffect(() => {
    // Check if hideUI is set
    if (!contextValue) return;
    const [contentState] = contextValue;
    if (contentState.hideUI) {
      setOverride("override");
    } else {
      setOverride("");
    }
  }, [contextValue]);

  return (
    <div className={classname} style={props.style}>
      {props.content === "" ? (
        <div>{props.children}</div>
      ) : (
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={700} defaultOpen={false}>
            <Tooltip.Trigger asChild>{props.children}</Tooltip.Trigger>
            <Tooltip.Portal
              container={
                document.getElementsByClassName("screenity-shadow-dom")[0]
              }
            >
              <Tooltip.Content
                className={
                  "TooltipContent" +
                  " " +
                  props.override +
                  " " +
                  props.hide +
                  " " +
                  override
                }
                style={{
                  display: override === "override" ? "none" : "block",
                  whiteSpace: "pre-line",
                  maxWidth: "240px",
                  lineHeight: "1.4",
                  ...props.tooltipStyle,
                }}
                side={props.side || "left"}
                sideOffset={props.sideOffset || 8}
              >
                {props.content}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      )}
    </div>
  );
};

export default TooltipWrap;
