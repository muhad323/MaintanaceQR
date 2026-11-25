import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const QRScanner = dynamic(
  () => import("@/components/QRScanner").then((mod) => mod.QRScanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-xs text-secondary">Starting camera...</span>
      </div>
    ),
  }
);

export default function ScanPage() {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  return (
    <div className="max-w-xl mx-auto py-2 sm:py-6">
      <QRScanner appBaseUrl={appBaseUrl} />
    </div>
  );
}
