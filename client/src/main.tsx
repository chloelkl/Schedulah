import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./contexts/ToastContext";
import { AddModeActionProvider } from "./contexts/AddModeActionContext";
import './index.css'
import { AuthProvider } from "./contexts/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider >
      <AddModeActionProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AddModeActionProvider>
    </ToastProvider>
  </React.StrictMode>
);
