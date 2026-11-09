import React, { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteSettingApi } from "@/api/siteSettingApi";
import { useToast } from "@/hooks/useToast";

interface CmsImageUploaderProps {
  label: string;
  description?: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  maxSizeMb?: number;
  previewHeight?: string;
  fallbackDefault?: string;
}

export const CmsImageUploader: React.FC<CmsImageUploaderProps> = ({
  label,
  description,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon",
  maxSizeMb = 3,
  previewHeight = "h-32",
  fallbackDefault,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const displayImage = value || fallbackDefault;

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(
        "Ukuran berkas melebihi batas",
        `Maksimal ukuran berkas adalah ${maxSizeMb} MB.`
      );
      return;
    }

    try {
      setIsUploading(true);
      const res = await siteSettingApi.uploadAsset(file);
      if (res && res.data && res.data.url) {
        onChange(res.data.url);
        toast.success(
          "Berhasil diunggah ke S3",
          `Berkas ${file.name} telah disimpan.`
        );
      }
    } catch (err: any) {
      toast.error(
        "Gagal mengunggah berkas",
        err.message || "Terjadi kesalahan saat mengunggah ke penyimpanan S3."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          {showManualInput ? "Sembunyikan URL" : "Edit URL Manual"}
        </button>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {showManualInput && (
        <div className="mb-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... atau /api/site-settings/assets/..."
            className="text-xs font-mono"
          />
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 transition-all text-center relative ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 bg-muted/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {displayImage ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div
              className={`relative ${previewHeight} w-32 sm:w-40 rounded-lg overflow-hidden border bg-background/80 shrink-0 flex items-center justify-center p-2`}
            >
              <img
                src={displayImage}
                alt={label}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  if (fallbackDefault) {
                    (e.currentTarget as HTMLImageElement).src = fallbackDefault;
                  }
                }}
              />
            </div>

            <div className="flex-1 text-left space-y-2">
              <div className="text-xs text-muted-foreground truncate max-w-md font-mono">
                {value ? value : "(Menggunakan aset baku sistem)"}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {value ? "Ganti Gambar" : "Unggah Gambar"}
                </Button>

                {value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => onChange("")}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Reset ke Baku
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Klik untuk memilih berkas
              </button>{" "}
              <span className="text-xs text-muted-foreground">
                atau drag & drop ke sini
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Maksimal {maxSizeMb} MB (JPG, PNG, WebP, SVG, ICO)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
