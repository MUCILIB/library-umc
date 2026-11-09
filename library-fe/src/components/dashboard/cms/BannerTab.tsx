import React from "react";
import { Megaphone, Save, Loader2, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BannerAnnouncementSticky } from "@/components/blocks/BannerAnnouncementSticky";
import type { BannerSettings } from "@/api/siteSettingApi";

interface BannerTabProps {
  form: BannerSettings;
  onChange: (form: BannerSettings) => void;
  onSave: () => void;
  isSaving: boolean;
}

const PREVIEW_STORAGE_KEY = "mucilib_banner_preview_temp";

export const BannerTab: React.FC<BannerTabProps> = ({
  form,
  onChange,
  onSave,
  isSaving,
}) => {
  const [previewKey, setPreviewKey] = React.useState(0);
  const [isPreviewDismissed, setIsPreviewDismissed] = React.useState(false);

  const handleRestorePreview = React.useCallback(() => {
    try {
      localStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {
      // Ignore localStorage error
    }
    setIsPreviewDismissed(false);
    setPreviewKey((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    if (form.isActive) {
      handleRestorePreview();
    }
  }, [form.isActive, handleRestorePreview]);

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <Card className="border border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Pratinjau Langsung (Live Preview)
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isPreviewDismissed && form.isActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestorePreview}
                  className="h-7 text-xs px-2.5 gap-1.5 font-medium"
                >
                  <RotateCcw className="h-3 w-3 text-primary" />
                  Munculkan Banner
                </Button>
              )}
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  form.isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {form.isActive ? "Status: AKTIF" : "Status: NONAKTIF"}
              </span>
            </div>
          </div>
          <CardDescription>
            Tampilan persis yang dilihat civitas akademika di atas bilah navigasi utama portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {!form.isActive ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground font-medium">
                Bilah banner pengumuman sedang dinonaktifkan. Aktifkan sakelar di bawah untuk menampilkan banner ini di portal.
              </p>
            </div>
          ) : isPreviewDismissed ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center bg-muted/30 flex flex-col items-center justify-center gap-3">
              <p className="text-xs text-muted-foreground font-medium">
                Pratinjau banner disembunyikan sementara (simulasi klik tombol 'X' oleh pengunjung).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestorePreview}
                className="gap-2 text-xs font-semibold"
              >
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                Munculkan Kembali Pratinjau
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden bg-background">
              <BannerAnnouncementSticky
                key={previewKey}
                storageKey={PREVIEW_STORAGE_KEY}
                isActive={form.isActive}
                badgeText={form.badgeText}
                message={form.message}
                linkText={form.linkText}
                linkUrl={form.linkUrl}
                dismissible={form.dismissible}
                onDismiss={() => setIsPreviewDismissed(true)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Konfigurasi Banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Konfigurasi Pengumuman Siaran</CardTitle>
            </div>
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="gap-2"
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Perubahan
            </Button>
          </div>
          <CardDescription>
            Atur pesan pemberitahuan penting yang muncul melintang di puncak portal web.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40 border">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="banner-is-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  onChange({ ...form, isActive: checked === true })
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="banner-is-active" className="text-sm font-medium cursor-pointer">
                  Tampilkan Banner (On/Off)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Jika dimatikan, bilah banner akan sepenuhnya disembunyikan dari navbar.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="banner-dismissible"
                checked={form.dismissible}
                onCheckedChange={(checked) =>
                  onChange({ ...form, dismissible: checked === true })
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="banner-dismissible" className="text-sm font-medium cursor-pointer">
                  Bisa Ditutup Pengunjung (Dismissible)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pengunjung dapat mengklik tombol silang untuk menyembunyikan sementara.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-badge">Teks Label Badge</Label>
              <Input
                id="banner-badge"
                value={form.badgeText}
                onChange={(e) => onChange({ ...form, badgeText: e.target.value })}
                placeholder="PENGUMUMAN"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="banner-message">Isi Pesan Siaran</Label>
              <Input
                id="banner-message"
                value={form.message}
                onChange={(e) => onChange({ ...form, message: e.target.value })}
                placeholder="Pemberitahuan layanan perpustakaan..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-link-text">Teks Tombol Aksi (CTA)</Label>
              <Input
                id="banner-link-text"
                value={form.linkText}
                onChange={(e) => onChange({ ...form, linkText: e.target.value })}
                placeholder="Lihat Selengkapnya"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-link-url">Tautan URL Tujuan</Label>
              <Input
                id="banner-link-url"
                value={form.linkUrl}
                onChange={(e) => onChange({ ...form, linkUrl: e.target.value })}
                placeholder="/katalog atau https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
