import React from "react";
import { createRoot } from "react-dom/client";
import Setup from "./Setup";

// Find the container to render into
const container = window.document.querySelector("#app-container");

if (container) {
  const root = createRoot(container);
  root.render(<Setup />);
}

// Hot Module Replacement
declare const module: NodeJS.Module;
if (module.hot) {
  module.hot.accept();
}
