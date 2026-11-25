"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Smartphone,
  ShieldAlert,
  Loader2,
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
  const [isInstalling, setIsInstalling] = useState(false);
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
      setIsInstalling(false);
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

  if (!mounted || isStandalone || (!deferredPrompt && !isMobileDevice)) {
    return null;
  }

  const triggerNativePrompt = async (
    promptEvent: BeforeInstallPromptEvent
  ): Promise<boolean> => {
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        window.__pwaInstallPrompt = null;
        setDeferredPrompt(null);
      }
      return true;
    } catch (err) {
      console.warn("[PWA Prompt Error]:", err);
      return false;
    }
  };

  const handleInstallClick = async () => {
    const immediatePrompt = deferredPrompt || window.__pwaInstallPrompt;
    if (immediatePrompt) {
      setIsInstalling(true);
      const ok = await triggerNativePrompt(immediatePrompt);
      setIsInstalling(false);
      if (ok) return;
    }

    // On Android over HTTPS, if the user tapped Install within the first moment while SW is activating,
    // wait briefly for beforeinstallprompt so native automatic installation fires directly!
    if (!isIOS && isSecure && typeof window !== "undefined") {
      setIsInstalling(true);
      const latePrompt = await new Promise<BeforeInstallPromptEvent | null>(
        (resolve) => {
          if (window.__pwaInstallPrompt) {
            resolve(window.__pwaInstallPrompt);
            return;
          }
          let settled = false;
          const onReady = () => {
            if (!settled && window.__pwaInstallPrompt) {
              settled = true;
              window.removeEventListener("pwa-install-ready", onReady);
              resolve(window.__pwaInstallPrompt);
            }
          };
          window.addEventListener("pwa-install-ready", onReady);
          setTimeout(() => {
            if (!settled) {
              settled = true;
              window.removeEventListener("pwa-install-ready", onReady);
              resolve(window.__pwaInstallPrompt || null);
            }
          }, 1200);
        }
      );
      setIsInstalling(false);

      if (latePrompt) {
        setDeferredPrompt(latePrompt);
        const ok = await triggerNativePrompt(latePrompt);
        if (ok) return;
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

  const modalContent =
    guideMode && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-text/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setGuideMode(null)}
          >
            <div
              className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-4 text-left shadow-xl"
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
                        ? "HTTPS Needed for Auto-Install"
                        : "Install on Your Phone"}
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
                      1. Tap the <strong>Share</strong> icon in Safari (bottom bar) or Chrome (top-right).
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                    <PlusSquare className="w-5 h-5 text-primary shrink-0" />
                    <span>
                      2. Tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                    </span>
                  </div>
                </div>
              )}

              {guideMode === "android" && (
                <div className="space-y-2.5 pt-1 text-xs sm:text-sm text-text">
                  <p className="text-xs text-secondary leading-relaxed">
                    If the app is already installed or your browser suppressed automatic install, add it from the menu:
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                    <MoreVertical className="w-5 h-5 text-primary shrink-0" />
                    <span>
                      1. Tap the <strong>⋮ Menu</strong> icon at the top-right of your browser.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                    <Smartphone className="w-5 h-5 text-primary shrink-0" />
                    <span>
                      2. Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
                    </span>
                  </div>
                </div>
              )}

              {guideMode === "insecure" && (
                <div className="space-y-2.5 pt-1 text-xs sm:text-sm text-text">
                  <div className="flex items-start gap-3 p-3.5 bg-status-pendingBg rounded-xl border border-status-pending/30 text-status-pending">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      Android &amp; iOS block automatic one-tap app downloads over local <strong>http://</strong> Wi-Fi IPs. Once hosted on an <strong>https://</strong> domain (or HTTPS tunnel), pressing <strong>Install App</strong> automatically triggers your phone&apos;s native installer.
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setGuideMode(null)}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-surface font-semibold rounded-xl text-sm transition"
              >
                Got it
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        disabled={isInstalling}
        onClick={handleInstallClick}
        title="Install Project QR App"
        className="px-3 py-2 min-h-[38px] bg-primary text-surface hover:bg-primary-dark active:scale-[0.98] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0 disabled:opacity-75"
      >
        {isInstalling ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Installing...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Install App</span>
          </>
        )}
      </button>
      {modalContent}
    </>
  );
}
