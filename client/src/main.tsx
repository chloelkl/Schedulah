import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./contexts/ToastContext";
import { AddModeActionProvider } from "./contexts/AddModeActionContext";
import './index.css'

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider >
      <AddModeActionProvider>
        <App />
      </AddModeActionProvider>
    </ToastProvider>
  </React.StrictMode>
);
