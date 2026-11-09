import React, { useState, useEffect } from "react";
import { Megaphone, Globe, Layout, MapPin, RefreshCw } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { BannerTab } from "./cms/BannerTab";
import { BrandingTab } from "./cms/BrandingTab";
import { HeroTab } from "./cms/HeroTab";
import { FooterLocationTab } from "./cms/FooterLocationTab";
import type {
  BannerSettings,
  BrandingSettings,
  HeroSettings,
  LocationSettings,
  FooterSettings,
} from "@/api/siteSettingApi";

export type CmsSubPage = "banner" | "branding" | "hero" | "location";

interface CmsSectionProps {
  subPage?: CmsSubPage;
}

const SUBPAGE_METADATA: Record<
  CmsSubPage,
  { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  banner: {
    title: "Bilah Pengumuman (Banner Sticky)",
    subtitle: "Sesuaikan siaran pengumuman penting, teks info, dan status aktif di atas navbar.",
    icon: Megaphone,
  },
  branding: {
    title: "Identitas Portal, Logo & SEO",
    subtitle: "Atur judul web tab browser, slogan, favicon, serta upload logo resmi kampus ke S3.",
    icon: Globe,
  },
  hero: {
    title: "Hero Section (Halaman Utama)",
    subtitle: "Sesuaikan sambutan utama, kotak pencarian, kata kunci cepat, dan upload latar belakang S3.",
    icon: Layout,
  },
  location: {
    title: "Peta Lokasi & Footer Kampus",
    subtitle: "Atur alamat gedung, embed Google Maps, kontak operasional, motto, dan tautan sosial media.",
    icon: MapPin,
  },
};

export const CmsSection: React.FC<CmsSectionProps> = ({ subPage = "banner" }) => {
  const { settings, loading, refetch, updateSetting } = useSiteSettings();
  const toast = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Local state form per tab
  const [bannerForm, setBannerForm] = useState<BannerSettings>(settings.banner);
  const [brandingForm, setBrandingForm] = useState<BrandingSettings>(settings.branding);
  const [heroForm, setHeroForm] = useState<HeroSettings>(settings.hero);
  const [locationForm, setLocationForm] = useState<LocationSettings>(settings.location);
  const [footerForm, setFooterForm] = useState<FooterSettings>(settings.footer);

  // Sync state when remote settings arrive
  useEffect(() => {
    if (settings) {
      setBannerForm(settings.banner);
      setBrandingForm(settings.branding);
      setHeroForm(settings.hero);
      setLocationForm(settings.location);
      setFooterForm(settings.footer);
    }
  }, [settings]);

  const handleSave = async (key: string, data: Record<string, any>, label: string) => {
    try {
      setSavingKey(key);
      await updateSetting(key, data);
      toast.success(
        "Pengaturan Disimpan",
        `Konfigurasi ${label} berhasil diperbarui dan aktif di seluruh portal.`
      );
    } catch (err: any) {
      toast.error(
        "Gagal Menyimpan",
        err?.message || `Terjadi kesalahan saat menyimpan ${label}.`
      );
    } finally {
      setSavingKey(null);
    }
  };

  const meta = SUBPAGE_METADATA[subPage] || SUBPAGE_METADATA.banner;
  const IconComponent = meta.icon;

  return (
    <div className="space-y-6">
      {/* Header Halaman Spesifik Sub-Modul */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <IconComponent className="h-6 w-6 text-primary" />
            {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.subtitle}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={loading || savingKey !== null}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Render langsung sub-halaman tanpa tab horizontal */}
      {subPage === "banner" && (
        <BannerTab
          form={bannerForm}
          onChange={setBannerForm}
          onSave={() => handleSave("banner", bannerForm, "Banner Pengumuman")}
          isSaving={savingKey === "banner"}
        />
      )}

      {subPage === "branding" && (
        <BrandingTab
          form={brandingForm}
          onChange={setBrandingForm}
          onSave={() => handleSave("branding", brandingForm, "Identitas & SEO")}
          isSaving={savingKey === "branding"}
        />
      )}

      {subPage === "hero" && (
        <HeroTab
          form={heroForm}
          onChange={setHeroForm}
          onSave={() => handleSave("hero", heroForm, "Hero Landing Page")}
          isSaving={savingKey === "hero"}
        />
      )}

      {subPage === "location" && (
        <FooterLocationTab
          locationForm={locationForm}
          onLocationChange={setLocationForm}
          onSaveLocation={() => handleSave("location", locationForm, "Lokasi & Peta")}
          isSavingLocation={savingKey === "location"}
          footerForm={footerForm}
          onFooterChange={setFooterForm}
          onSaveFooter={() => handleSave("footer", footerForm, "Footer & Ekosistem")}
          isSavingFooter={savingKey === "footer"}
        />
      )}
    </div>
  );
};

export default CmsSection;
