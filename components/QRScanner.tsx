"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Scanner, IDetectedBarcode, useDevices } from "@yudiel/react-qr-scanner";
import { Html5Qrcode } from "html5-qrcode";
import { authorizeScannedTokenAction } from "@/app/actions/scan";
import {
  RotateCcw,
  Loader2,
  CameraOff,
  SwitchCamera,
  ImageUp,
} from "lucide-react";

interface QRScannerProps {
  appBaseUrl?: string;
}

export function QRScanner({ appBaseUrl }: QRScannerProps) {
  const router = useRouter();
  const devices = useDevices();
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isOpening, setIsOpening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractToken = (text: string): string | null => {
    const trimmed = text.trim();

    try {
      const url = new URL(trimmed);
      const match = url.pathname.match(/^\/(?:m|project)\/([a-zA-Z0-9_\-]+)$/);
      if (match) {
        return match[1];
      }
    } catch {
      // Not a full URL
    }

    const relativeMatch = trimmed.match(/^\/(?:m|project)\/([a-zA-Z0-9_\-]+)$/);
    if (relativeMatch) {
      return relativeMatch[1];
    }

    if (/^[a-zA-Z0-9_\-]{6,64}$/.test(trimmed) && !trimmed.includes("http")) {
      return trimmed;
    }

    return null;
  };

  const navigateWithToken = async (rawValue: string) => {
    const token = extractToken(rawValue);

    if (!token) {
      setIsScanning(false);
      setErrorMessage("This QR is not from Project QR.");
      return;
    }

    setIsScanning(false);
    setIsOpening(true);
    try {
      await authorizeScannedTokenAction(token);
    } catch {
      // Proceed to route
    }
    router.push(`/project/${token}`);
  };

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (!isScanning || isOpening || detectedCodes.length === 0) return;

    const rawValue = detectedCodes[0].rawValue;
    if (!rawValue) return;

    await navigateWithToken(rawValue);
  };

  const handleSwitchCamera = () => {
    if (!devices || devices.length < 2) return;
    setSelectedDeviceIndex((prev) =>
      prev === null ? 1 % devices.length : (prev + 1) % devices.length
    );
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    try {
      const html5Qr = new Html5Qrcode("qr-file-decode-hidden");
      const decodedText = await html5Qr.scanFile(file, false);
      html5Qr.clear();
      await navigateWithToken(decodedText);
    } catch {
      setIsScanning(false);
      setErrorMessage("No valid Project QR code found in the selected image.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setCameraBlocked(false);
    setIsOpening(false);
    setIsScanning(true);
  };

  const activeDeviceId =
    selectedDeviceIndex !== null && devices[selectedDeviceIndex]
      ? devices[selectedDeviceIndex].deviceId
      : undefined;

  const videoConstraints: MediaTrackConstraints = activeDeviceId
    ? { deviceId: { exact: activeDeviceId } }
    : { facingMode: { ideal: "environment" } };

  return (
    <div className="flex flex-col items-center justify-center min-h-[68dvh] px-1">
      <div id="qr-file-decode-hidden" className="hidden" />

      <div className="relative w-full max-w-[360px] sm:max-w-[420px] lg:max-w-[440px] aspect-[4/5] sm:aspect-square rounded-3xl overflow-hidden bg-text border border-border flex items-center justify-center">
        {isScanning && !errorMessage && !cameraBlocked ? (
          <div className="w-full h-full">
            <Scanner
              onScan={handleScan}
              onError={(error) => {
                console.error("Camera Scanner Error:", error);
                const msg = String(error).toLowerCase();
                if (
                  msg.includes("permission") ||
                  msg.includes("notallowed") ||
                  msg.includes("denied")
                ) {
                  setCameraBlocked(true);
                  setIsScanning(false);
                }
              }}
              constraints={videoConstraints}
              components={{
                finder: false,
              }}
              styles={{
                container: { width: "100%", height: "100%" },
                video: { width: "100%", height: "100%", objectFit: "cover" },
              }}
            />

            {/* Viewfinder Frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 border border-surface/50 rounded-2xl relative">
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-[3px] border-l-[3px] border-surface rounded-tl-lg" />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-[3px] border-r-[3px] border-surface rounded-tr-lg" />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-[3px] border-l-[3px] border-surface rounded-bl-lg" />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-[3px] border-r-[3px] border-surface rounded-br-lg" />
              </div>
            </div>

            {/* Camera Switch Button (when device has multiple cameras) */}
            {devices && devices.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                title="Switch camera"
                aria-label="Switch camera"
                className="absolute bottom-3.5 right-3.5 p-2.5 bg-text/70 hover:bg-text/90 text-surface rounded-full backdrop-blur-xs transition"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : isOpening ? (
          <div className="p-6 text-center text-surface bg-primary/95 inset-0 absolute flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-semibold">Opening project details...</p>
          </div>
        ) : cameraBlocked ? (
          <div className="p-6 text-center text-surface bg-text inset-0 absolute flex flex-col items-center justify-center">
            <CameraOff className="w-9 h-9 text-sand mb-3" />
            <p className="text-sm font-semibold mb-1.5">Camera Access Needed</p>
            <p className="text-xs text-surface/75 mb-5 max-w-[260px] leading-relaxed">
              Allow camera permission in your browser settings, or scan from an image file below.
            </p>
            <button
              onClick={handleRetry}
              className="py-2.5 px-5 bg-primary text-surface text-xs font-semibold rounded-xl flex items-center gap-1.5 active:opacity-90 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Camera Again</span>
            </button>
          </div>
        ) : (
          <div className="p-6 text-center text-surface bg-primary/95 inset-0 absolute flex flex-col items-center justify-center">
            <p className="text-sm font-semibold mb-2">{errorMessage}</p>
            <p className="text-xs text-surface/80 mb-5">
              Point your camera at a Mimar Project QR code.
            </p>
            <button
              onClick={handleRetry}
              className="py-2.5 px-5 bg-surface text-text text-xs font-semibold rounded-xl flex items-center gap-1.5 active:bg-background transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Scan Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Hint & Upload QR Image Option (Ideal for Laptops / Desktops / Saved Screenshots) */}
      <div className="text-center pt-5 pb-2 space-y-3 w-full max-w-[360px] sm:max-w-[420px]">
        <div>
          <p className="text-sm font-medium text-text">Scan Model QR Code</p>
          <p className="text-xs text-secondary mt-0.5">
            Align the QR code inside the frame to view details & log maintenance
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-surface hover:bg-background border border-border rounded-xl text-xs font-semibold text-secondary hover:text-text inline-flex items-center justify-center gap-2 transition"
          >
            <ImageUp className="w-4 h-4 text-primary" />
            <span>Scan QR from Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileScan}
          />
        </div>
      </div>
    </div>
  );
}
