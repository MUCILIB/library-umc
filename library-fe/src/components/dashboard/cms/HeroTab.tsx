import React from "react";
import { Layout, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsImageUploader } from "./CmsImageUploader";
import type { HeroSettings } from "@/api/siteSettingApi";

interface HeroTabProps {
  form: HeroSettings;
  onChange: (form: HeroSettings) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const HeroTab: React.FC<HeroTabProps> = ({
  form,
  onChange,
  onSave,
  isSaving,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tampilan Hero Beranda Publik</CardTitle>
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
          Kustomisasi teks sambutan utama, gambar latar banner beranda (S3), dan rekomendasi topik cepat.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Gambar Latar Hero ke S3 */}
        <div className="p-4 rounded-xl border bg-muted/20">
          <CmsImageUploader
            label="Gambar Latar Hero (Hero Background Image)"
            description="Unggah foto gedung atau suasana perpustakaan beresolusi tinggi ke penyimpanan S3 (maksimal 5 MB)."
            value={form.backgroundImage}
            onChange={(url) => onChange({ ...form, backgroundImage: url })}
            accept="image/jpeg,image/png,image/webp"
            maxSizeMb={5}
            previewHeight="h-32"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Judul Utama Hero (Heading 1)</Label>
            <Input
              id="hero-title"
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              placeholder="Perpustakaan Universitas Muhammadiyah Cirebon"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subjudul / Deskripsi Sambutan</Label>
            <Input
              id="hero-subtitle"
              value={form.subtitle}
              onChange={(e) => onChange({ ...form, subtitle: e.target.value })}
              placeholder="Akses koleksi buku, jurnal, dan e-book resmi UMC"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hero-placeholder">Placeholder Kolom Pencarian</Label>
              <Input
                id="hero-placeholder"
                value={form.searchPlaceholder}
                onChange={(e) => onChange({ ...form, searchPlaceholder: e.target.value })}
                placeholder="Cari judul, penulis, ISBN..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-chips">Topik Pencarian Cepat (Pisahkan dengan koma)</Label>
              <Input
                id="hero-chips"
                value={form.quickChips.join(", ")}
                onChange={(e) =>
                  onChange({
                    ...form,
                    quickChips: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Pemrograman, Manajemen, Jurnal, Kesehatan"
              />
              <p className="text-xs text-muted-foreground">
                Muncul sebagai tombol filter interaktif di bawah kolom pencarian utama.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
