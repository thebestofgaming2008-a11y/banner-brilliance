import { Crop, Image as ImageIcon, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { uploadProductImage } from "@/services/adminService";

async function loadImage(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image cannot be edited. Upload it again first."));
    image.src = src;
  });
}

async function createCropFile(src: string, crop: Area) {
  const image = await loadImage(src);
  const scale = Math.min(1, 1800 / Math.max(crop.width, crop.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image editing is unavailable in this browser.");
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not create the crop."))),
      "image/webp",
      0.88,
    ),
  );
  return new File([blob], `homepage-crop-${Date.now()}.webp`, { type: "image/webp" });
}

export function HomepageImageInput({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(16 / 9);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const url = await uploadProductImage(file);
      if (!url) throw new Error("Upload did not return a public image URL.");
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  const saveCrop = async () => {
    if (!pixels || !value) return;
    setUploading(true);
    setError("");
    try {
      const file = await createCropFile(value, pixels);
      const url = await uploadProductImage(file);
      if (!url) throw new Error("Could not upload the cropped image.");
      onChange(url);
      setCropOpen(false);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Could not crop image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative aspect-video overflow-hidden rounded border border-black/10 bg-[#f4f1eb]">
          <img src={value} alt="Selected" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="grid aspect-video place-items-center rounded border border-dashed border-black/20 bg-black/[0.025] text-black/35">
          <ImageIcon size={22} />
        </div>
      )}
      <input
        type="url"
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste an image URL"
        className="h-9 w-full rounded border border-black/15 bg-white px-2.5 text-xs outline-none focus:border-black"
      />
      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded bg-black px-3 text-xs font-semibold text-white">
            <Upload size={14} /> {uploading ? "Uploading..." : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
          {value ? (
            <>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded border border-black/15 px-3 text-xs font-semibold"
                onClick={() => setCropOpen(true)}
              >
                <Crop size={14} /> Crop
              </button>
              <button
                type="button"
                title="Remove image"
                aria-label="Remove image"
                className="grid h-9 w-9 place-items-center rounded border border-red-200 text-red-700"
                onClick={() => onChange("")}
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="text-xs leading-5 text-red-700">{error}</p> : null}

      {cropOpen && value ? (
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Crop image"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Crop and zoom</p>
                <p className="text-xs text-black/50">The original remains in R2.</p>
              </div>
              <button
                type="button"
                title="Close"
                aria-label="Close crop editor"
                className="grid h-9 w-9 place-items-center"
                onClick={() => setCropOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative h-[min(58vh,520px)] bg-[#111]">
              <Cropper
                image={value}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) => setPixels(croppedPixels)}
              />
            </div>
            <div className="space-y-4 p-4">
              <label className="block text-xs font-semibold">
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="mt-2 block w-full accent-black"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Wide", value: 16 / 9 },
                  { label: "Portrait", value: 4 / 5 },
                  { label: "Square", value: 1 },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={`h-9 rounded border px-3 text-xs ${aspect === option.value ? "border-black bg-black text-white" : "border-black/15"}`}
                    onClick={() => setAspect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={uploading || !pixels}
                  className="ml-auto h-9 rounded bg-black px-4 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={() => void saveCrop()}
                >
                  {uploading ? "Saving..." : "Save crop"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
