"use client";

import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[PWA SW Registration]:", err);
        });
    }
  }, []);

  return null;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIosInstallable, setIsIosInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneCheck =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    setIsStandalone(standaloneCheck);
    if (standaloneCheck) return;

    const ua = window.navigator.userAgent || "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);

    if (isIOS) {
      setIsIosInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsIosInstallable(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone || (!deferredPrompt && !isIosInstallable)) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return;
    }

    if (isIosInstallable) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install Project QR App"
        className="px-3 py-2 bg-primary/10 hover:bg-primary/20 active:bg-primary/25 text-primary rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-50 bg-text/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-text">
                  Install Project QR
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Add to your iPhone or iPad Home Screen
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                aria-label="Close"
                className="p-1.5 text-secondary hover:text-text rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-1 text-xs sm:text-sm text-text">
              <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                <Share className="w-5 h-5 text-primary shrink-0" />
                <span>
                  1. Tap the <strong>Share</strong> icon in your Safari toolbar.
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                <PlusSquare className="w-5 h-5 text-primary shrink-0" />
                <span>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-surface font-semibold rounded-xl text-sm transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
