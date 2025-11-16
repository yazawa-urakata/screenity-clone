import React from "react";

const ResizeHandle: React.FC = () => {
  return (
    <div
      className="camera-resize"
      style={{
        position: "absolute",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        backgroundColor: "white",
        border: "2px solid #4597F7",
        cursor: "nwse-resize",
        boxSizing: "border-box",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    />
  );
};

export default ResizeHandle;
