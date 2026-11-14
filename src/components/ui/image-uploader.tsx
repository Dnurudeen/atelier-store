"use client";

import { useRef, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

export type UploadPurpose = "product" | "store" | "avatar" | "return" | "banner" | "category" | "brand";

const MAX_MB = 5;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadImage(file: File, purpose: UploadPurpose): Promise<string> {
  if (!TYPES.includes(file.type)) throw { message: "Upload a JPG, PNG or WebP image." };
  if (file.size > MAX_MB * 1024 * 1024) throw { message: `Images must be ${MAX_MB} MB or smaller.` };
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  const res = await api<{ data: { url: string } }>("/uploads", { method: "POST", formData: form });
  return res.data.url;
}

/**
 * Multi-image uploader: drag & drop or pick files, reorder (first = main photo), remove.
 * Uploads go straight to the API's public disk; `value` holds the resulting URLs.
 */
export function ImageUploader({
  value,
  onChange,
  purpose,
  max = 8,
  hint,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  purpose: UploadPurpose;
  max?: number;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function addFiles(files: FileList | File[]) {
    setError("");
    const list = Array.from(files).slice(0, Math.max(0, max - value.length));
    if (!list.length) {
      setError(`You can add up to ${max} images.`);
      return;
    }
    setUploading((n) => n + list.length);
    const urls: string[] = [];
    for (const file of list) {
      try {
        urls.push(await uploadImage(file, purpose));
      } catch (err) {
        setError(errorMessage(err, "Upload failed."));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (urls.length) onChange([...value, ...urls].slice(0, max));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {value.map((url, i) => (
          <div
            key={url}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            className={cn("group relative aspect-square overflow-hidden rounded-md border bg-surface", i === 0 ? "border-crimson ring-1 ring-crimson" : "border-border")}
          >
            <AppImage src={url} alt={`Image ${i + 1}`} fill sizes="120px" frameClassName="absolute inset-0" />
            {i === 0 && (
              <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 rounded bg-crimson px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Star size={10} className="fill-white" /> Main
              </span>
            )}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute top-1 right-1 rounded-full bg-white/95 p-1 text-foreground shadow hover:text-crimson" aria-label={`Remove image ${i + 1}`}>
              <X size={12} />
            </button>
            <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded bg-white/95 p-0.5 shadow disabled:opacity-30" aria-label="Move earlier">
                <ChevronLeft size={14} />
              </button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} className="rounded bg-white/95 p-0.5 shadow disabled:opacity-30" aria-label="Move later">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}

        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up${i}`} className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ))}

        {value.length + uploading < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-[11px] text-muted transition",
              dragging ? "border-crimson bg-crimson/5 text-crimson" : "border-border hover:border-burgundy hover:text-burgundy"
            )}
          >
            <ImagePlus size={20} />
            Add photo
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="mt-1.5 text-[11px] text-muted">{hint ?? `JPG, PNG or WebP, up to ${MAX_MB} MB, at least 200×200 px. ${max > 1 ? "The first image is the main photo. Drag to reorder." : ""}`}</p>
      {error && <p className="mt-1 text-xs text-crimson">{error}</p>}
    </div>
  );
}
