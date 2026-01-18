/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type SubmitFn = () => Promise<void> | void;

type Ctx = {
  registerSubmit: (fn: SubmitFn | null) => void;
  submitFromAppBar: () => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
};

const AddModeActionContext = createContext<Ctx | null>(null);

export function AddModeActionProvider({ children }: { children: React.ReactNode }) {
  const submitRef = useRef<SubmitFn | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const value = useMemo<Ctx>(() => {
    return {
      registerSubmit: (fn) => {
        submitRef.current = fn;
      },
      submitFromAppBar: async () => {
        if (!submitRef.current) return;
        await submitRef.current();
      },
      isSubmitting,
      setIsSubmitting,
    };
  }, [isSubmitting]);

  return (
    <AddModeActionContext.Provider value={value}>
      {children}
    </AddModeActionContext.Provider>
  );
}

export function useAddModeAction() {
  const ctx = useContext(AddModeActionContext);
  if (!ctx) throw new Error("useAddModeAction must be used within AddModeActionProvider");
  return ctx;
}
