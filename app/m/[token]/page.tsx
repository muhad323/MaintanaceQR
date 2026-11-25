import Image from "next/image";
import { ExternalLink } from "lucide-react";

export default function PublicModelAttributionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[82dvh] px-4 py-8">
      <div className="w-full max-w-sm sm:max-w-md bg-surface rounded-2xl border border-border overflow-hidden text-center">
        <div className="p-8 sm:p-10 space-y-6">
          <div className="flex justify-center">
            <Image
              src="/brand/logo.png"
              alt="Mimar Models Logo"
              width={240}
              height={96}
              priority
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>

          <div className="space-y-2 pt-3 border-t border-border">
            <h1 className="text-lg sm:text-xl font-bold text-text leading-snug">
              Mimar Models created this model.
            </h1>
            <p className="text-sm text-secondary leading-relaxed">
              For more, check out{" "}
              <a
                href="https://mimarmodels.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline underline-offset-4 hover:text-primary-dark"
              >
                mimarmodels.com
              </a>
            </p>
          </div>

          <a
            href="https://mimarmodels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-5 bg-primary hover:bg-primary-dark text-surface font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition text-sm sm:text-base"
          >
            <span>Visit mimarmodels.com</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="h-3 w-full bg-primary" />
      </div>
    </div>
  );
}
