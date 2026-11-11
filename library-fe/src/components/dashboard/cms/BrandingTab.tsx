import React from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsImageUploader } from "./CmsImageUploader";
import LogoUmc from "@/assets/logo_umc.png";
import type { BrandingSettings } from "@/api/siteSettingApi";

interface BrandingTabProps {
  form: BrandingSettings;
  onChange: (form: BrandingSettings) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const BrandingTab: React.FC<BrandingTabProps> = ({
  form,
  onChange,
  onSave,
  isSaving,
}) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Aset Visual & Metadata Situs</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Unggah logo kampus, favicon peramban, serta kelola informasi metadata SEO.
            </CardDescription>
          </div>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 shrink-0"
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
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Logo dan Favicon ke S3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border bg-muted/20">
          <CmsImageUploader
            label="Logo Perpustakaan (Navbar & Footer)"
            description="Unggah file logo resmi ke S3 (PNG, SVG, atau WebP). Otomatis tampil di seluruh header dan footer."
            value={form.logoUrl}
            onChange={(url) => onChange({ ...form, logoUrl: url })}
            accept="image/png,image/svg+xml,image/webp,image/jpeg"
            maxSizeMb={2}
            previewHeight="h-20"
            fallbackDefault={LogoUmc}
          />

          <CmsImageUploader
            label="Favicon Tab Browser"
            description="Ikon kecil di tab browser pengunjung (format ICO, PNG, atau SVG, max 1MB)."
            value={form.faviconUrl}
            onChange={(url) => onChange({ ...form, faviconUrl: url })}
            accept="image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon"
            maxSizeMb={1}
            previewHeight="h-16"
            fallbackDefault={LogoUmc}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branding-title">Judul Web (Title Tab Browser)</Label>
            <Input
              id="branding-title"
              value={form.siteTitle}
              onChange={(e) => onChange({ ...form, siteTitle: e.target.value })}
              placeholder="Perpustakaan Universitas Muhammadiyah Cirebon"
            />
            <p className="text-xs text-muted-foreground">
              Muncul langsung di tab peramban dan preview hasil pencarian Google.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branding-tagline">Tagline Portal</Label>
            <Input
              id="branding-tagline"
              value={form.siteTagline}
              onChange={(e) => onChange({ ...form, siteTagline: e.target.value })}
              placeholder="Portal Riset & Sumber Belajar Digital"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branding-meta-desc">Meta Deskripsi Ringkas</Label>
            <Input
              id="branding-meta-desc"
              value={form.metaDescription}
              onChange={(e) => onChange({ ...form, metaDescription: e.target.value })}
              placeholder="Layanan perpustakaan digital resmi Universitas Muhammadiyah Cirebon..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
