// src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import Sandbox from "./Sandbox";

// Find the container to render into
const container = window.document.querySelector("#app-container");

if (container) {
  const root = createRoot(container);
  root.render(<Sandbox />);
}

// Hot Module Replacement
if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
