import React, { FC, ReactNode, MouseEvent } from "react";
import * as Toolbar from "@radix-ui/react-toolbar";

// Components
import TooltipWrap from "./TooltipWrap";

interface ToolTriggerProps {
  content: string;
  type: "button" | "mode" | "toggle";
  grab?: boolean;
  resume?: boolean;
  value?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
}

const ToolTrigger: FC<ToolTriggerProps> = (props) => {
  const grab = props.grab ? " grab" : "";
  const resume = props.resume ? " resume" : "";
  const customClass = props.className ? " " + props.className : "";

  return (
    <TooltipWrap content={props.content}>
      {props.type === "button" ? (
        <Toolbar.Button
          className={"ToolbarButton" + grab + resume + customClass}
          onClick={props.onClick}
          disabled={props.disabled}
        >
          {props.children}
        </Toolbar.Button>
      ) : props.type === "mode" ? (
        <div className="ToolbarToggleWrap">
          <Toolbar.ToggleItem
            className="ToolbarModeItem"
            value={props.value || ""}
            disabled={props.disabled}
          >
            {props.children}
          </Toolbar.ToggleItem>
        </div>
      ) : (
        <div className="ToolbarToggleWrap">
          <Toolbar.ToggleItem
            className="ToolbarToggleItem"
            value={props.value || ""}
            disabled={props.disabled}
          >
            {props.children}
          </Toolbar.ToggleItem>
        </div>
      )}
    </TooltipWrap>
  );
};

export default ToolTrigger;
