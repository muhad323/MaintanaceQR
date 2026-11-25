"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface PhotoViewerProps {
  photos?: Array<{ id: number; name: string; mimetype: string }>;
}

export function PhotoViewer({ photos }: PhotoViewerProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <>
      {/* Thumbnails row */}
      <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedPhotoId(photo.id)}
            className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0 bg-background hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${photo.id}`}
              alt={photo.name || "Maintenance photo"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Large View Modal */}
      {selectedPhotoId !== null && (
        <div
          className="fixed inset-0 z-50 bg-text/85 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoId(null)}
        >
          <div
            className="relative max-w-lg w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPhotoId(null)}
              aria-label="Close photo"
              className="absolute -top-12 right-0 p-2 text-surface hover:text-secondary transition"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${selectedPhotoId}`}
              alt="Enlarged photo"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
