"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Smartphone,
  ShieldAlert,
  X,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
  }
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

type GuideMode = "ios" | "android" | "insecure" | null;

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [guideMode, setGuideMode] = useState<GuideMode>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMounted(true);

    const standaloneCheck =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    setIsStandalone(standaloneCheck);
    setIsSecure(Boolean(window.isSecureContext));

    const ua = window.navigator.userAgent || "";
    const iosCheck =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    const androidCheck = /Android/i.test(ua);

    setIsIOS(iosCheck);
    setIsMobileDevice(iosCheck || androidCheck);

    if (standaloneCheck) return;

    // Pick up prompt captured early by <head> script before React hydrated
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    const syncPrompt = () => {
      if (window.__pwaInstallPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__pwaInstallPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
      setGuideMode(null);
    };

    window.addEventListener("pwa-install-ready", syncPrompt);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("pwa-install-ready", syncPrompt);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Show whenever not installed: on ALL mobile devices (Android + iOS) OR when desktop has native prompt
  if (!mounted || isStandalone || (!deferredPrompt && !isMobileDevice)) {
    return null;
  }

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || window.__pwaInstallPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === "accepted") {
          window.__pwaInstallPrompt = null;
          setDeferredPrompt(null);
        }
        return;
      } catch (err) {
        console.warn("[PWA Prompt Error]:", err);
      }
    }

    if (!isSecure) {
      setGuideMode("insecure");
      return;
    }

    if (isIOS) {
      setGuideMode("ios");
      return;
    }

    setGuideMode("android");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Download & Install Project QR App"
        className="px-3 py-2 min-h-[38px] bg-primary text-surface hover:bg-primary-dark active:scale-[0.98] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>

      {guideMode && (
        <div
          className="fixed inset-0 z-50 bg-text/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setGuideMode(null)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/icon-192.png"
                  alt="Project QR Icon"
                  className="w-11 h-11 rounded-xl shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-text">
                    Install Project QR
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    {guideMode === "ios"
                      ? "Add to iPhone / iPad Home Screen"
                      : guideMode === "insecure"
                      ? "HTTPS Required on Mobile"
                      : "Install on Android Phone"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideMode(null)}
                aria-label="Close"
                className="p-1.5 min-h-0 text-secondary hover:text-text rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {guideMode === "ios" && (
              <div className="space-y-2.5 pt-1 text-xs sm:text-sm text-text">
                <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                  <Share className="w-5 h-5 text-primary shrink-0" />
                  <span>
                    1. Tap the <strong>Share</strong> button in Safari (bottom bar) or Chrome (top-right).
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                  <PlusSquare className="w-5 h-5 text-primary shrink-0" />
                  <span>
                    2. Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                  </span>
                </div>
              </div>
            )}

            {guideMode === "android" && (
              <div className="space-y-2.5 pt-1 text-xs sm:text-sm text-text">
                <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                  <MoreVertical className="w-5 h-5 text-primary shrink-0" />
                  <span>
                    1. Tap the <strong>⋮ Menu</strong> icon at the top-right of Chrome (or <strong>≡</strong> in Samsung Internet).
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                  <Smartphone className="w-5 h-5 text-primary shrink-0" />
                  <span>
                    2. Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </span>
                </div>
              </div>
            )}

            {guideMode === "insecure" && (
              <div className="space-y-2.5 pt-1 text-xs sm:text-sm text-text">
                <div className="flex items-start gap-3 p-3.5 bg-status-pendingBg rounded-xl border border-status-pending/30 text-status-pending">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Mobile browsers block automatic PWA downloads over plain <strong>http://</strong> network IPs. Open this app via an <strong>https://</strong> URL to enable one-tap installation, or tap <strong>⋮ Menu &rarr; Add to Home screen</strong> in your browser.
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setGuideMode(null)}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-surface font-semibold rounded-xl text-sm transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
