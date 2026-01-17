import React, { createContext, useContext, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

type ToastType = "success" | "error" | "info";

type ToastCtx = {
  showToast: (msg: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("success");

  const value = useMemo(
    () => ({
      showToast: (m: string, t: ToastType = "success") => {
        setMsg(m);
        setType(t);
        setOpen(true);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value} >
      {children}
      <Snackbar
        open={open}
        autoHideDuration={2200}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={type} variant="filled" onClose={() => setOpen(false)}>
          {msg}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
