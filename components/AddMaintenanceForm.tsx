"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addMaintenanceLogAction } from "@/app/actions/maintenance";
import { MaintenanceStatus } from "@/lib/types";
import { compressImage, CompressedImage } from "@/lib/imageCompress";
import {
  Camera,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";

interface AddMaintenanceFormProps {
  projectId: number;
  token: string;
  userName?: string;
}

const STAFF_NAME_STORAGE_KEY = "mimar_staff_name";

export function AddMaintenanceForm({
  projectId,
  token,
  userName = "",
}: AddMaintenanceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [doneBy, setDoneBy] = useState(userName);
  const [status, setStatus] = useState<MaintenanceStatus>("done");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<CompressedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userName && typeof window !== "undefined") {
      const savedName = window.localStorage.getItem(STAFF_NAME_STORAGE_KEY);
      if (savedName) {
        setDoneBy(savedName);
      }
    }
  }, [userName]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFeedback(null);

    const availableSlots = 6 - photos.length;
    if (availableSlots <= 0) {
      setFeedback({
        type: "error",
        message: "Maximum 6 images allowed per maintenance update.",
      });
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    setIsCompressing(true);

    try {
      const compressedResults: CompressedImage[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) continue;
        const compressed = await compressImage(file);
        compressedResults.push(compressed);
      }
      setPhotos((prev) => [...prev, ...compressedResults]);
    } catch (err) {
      console.error("Compression error:", err);
      setFeedback({
        type: "error",
        message: "Failed to process one or more images. Please try again.",
      });
    } finally {
      setIsCompressing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    if (!doneBy.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter your name.",
      });
      return;
    }

    if (!note.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter a maintenance description.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STAFF_NAME_STORAGE_KEY, doneBy.trim());
    }

    const formData = new FormData();
    formData.append("projectId", String(projectId));
    formData.append("token", token);
    formData.append("doneBy", doneBy.trim());
    formData.append("status", status);
    formData.append("note", note.trim());

    if (photos.length > 0) {
      const photosPayload = photos.map((p) => ({
        name: p.name,
        type: p.type,
        base64: p.base64,
      }));
      formData.append("photosJson", JSON.stringify(photosPayload));
    }

    startTransition(async () => {
      const result = await addMaintenanceLogAction(null, formData);
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
      } else {
        setFeedback({
          type: "success",
          message: result.message || "Maintenance update saved.",
        });
        setNote("");
        setStatus("done");
        setPhotos([]);
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-border">
      <div className="mb-4">
        <h2 className="font-bold text-text text-base">
          Add Maintenance Update
        </h2>
        <p className="text-xs text-secondary mt-0.5">
          Add your name, description, and photos of the model
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-4 p-3.5 rounded-xl text-sm leading-relaxed flex items-start gap-2.5 ${
            feedback.type === "success"
              ? "bg-status-doneBg border border-status-done/30 text-status-done"
              : "bg-status-issueBg border border-status-issue/30 text-status-issue"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Your Name */}
        <div>
          <label
            htmlFor="doneBy"
            className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5"
          >
            Your Name <span className="text-status-issue">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="doneBy"
              type="text"
              required
              autoComplete="name"
              value={doneBy}
              onChange={(e) => setDoneBy(e.target.value)}
              placeholder="Enter your name"
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-text placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition text-base sm:text-sm"
            />
          </div>
        </div>

        {/* Status Selection Buttons */}
        <div>
          <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
            Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                {
                  value: "done",
                  label: "Done",
                  active: "bg-status-done text-surface",
                },
                {
                  value: "pending",
                  label: "Pending",
                  active: "bg-status-pending text-surface",
                },
                {
                  value: "issue",
                  label: "Issue",
                  active: "bg-status-issue text-surface",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`py-3 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition active:scale-[0.98] ${
                  status === opt.value
                    ? `${opt.active} border-transparent`
                    : "bg-background border-border text-secondary hover:text-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description Textarea */}
        <div>
          <label
            htmlFor="maintenanceNote"
            className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5"
          >
            Description <span className="text-status-issue">*</span>
          </label>
          <textarea
            id="maintenanceNote"
            required
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe maintenance work done, parts checked, or issues noticed..."
            className="w-full p-3.5 bg-background border border-border rounded-xl text-text placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition text-base sm:text-sm resize-none"
          />
        </div>

        {/* Images Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-primary uppercase tracking-wider">
              Images ({photos.length}/6)
            </label>
            {isCompressing && (
              <span className="text-xs text-primary flex items-center gap-1 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Optimizing...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <button
              type="button"
              disabled={photos.length >= 6 || isCompressing || isPending}
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 px-3 bg-background active:bg-border/40 border border-border rounded-xl text-xs sm:text-sm font-semibold text-text flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-primary shrink-0" />
              <span>Take Photo</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <button
              type="button"
              disabled={photos.length >= 6 || isCompressing || isPending}
              onClick={() => galleryInputRef.current?.click()}
              className="py-3 px-3 bg-background active:bg-border/40 border border-border rounded-xl text-xs sm:text-sm font-semibold text-text flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-primary shrink-0" />
              <span>Gallery</span>
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border bg-background"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={`Upload ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    aria-label="Remove image"
                    className="absolute top-1.5 right-1.5 w-7 h-7 min-h-0 bg-text/80 active:bg-text text-surface rounded-full flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending || isCompressing}
          className="w-full py-4 px-4 bg-primary hover:bg-primary-dark active:scale-[0.99] text-surface font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 text-base"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving update...</span>
            </>
          ) : (
            <span>Submit Maintenance Update</span>
          )}
        </button>
      </form>
    </div>
  );
}
