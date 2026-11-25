import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
      <div className="w-12 h-12 rounded-2xl bg-surface border border-border text-primary flex items-center justify-center mb-3">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-text">Loading details...</p>
      <p className="text-xs text-secondary mt-1">Fetching live project data from Odoo</p>
    </div>
  );
}
