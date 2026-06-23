import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { isAppInstalled, isIosDevice, type BeforeInstallPromptEvent } from "./pwa";

type InstallMode = "native" | "ios";

interface PwaInstallContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isOpen: boolean;
  mode: InstallMode;
  installing: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  install: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const ctx = use(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  const mode: InstallMode = isIosDevice() ? "ios" : "native";
  const canInstall = !installed && (mode === "ios" || deferredPrompt !== null);

  useEffect(() => {
    setInstalled(isAppInstalled());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  const install = useCallback(async () => {
    if (mode === "ios") {
      closeDialog();
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        closeDialog();
      }
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  }, [closeDialog, deferredPrompt, mode]);

  const value = useMemo(
    () => ({
      canInstall,
      isInstalled: installed,
      isOpen,
      mode,
      installing,
      openDialog,
      closeDialog,
      install,
    }),
    [canInstall, closeDialog, install, installed, installing, isOpen, mode, openDialog],
  );

  return <PwaInstallContext value={value}>{children}</PwaInstallContext>;
}
