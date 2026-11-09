import React, { useState, useEffect } from "react";
import { Megaphone, Globe, Layout, MapPin, RefreshCw } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const CmsSection: React.FC = () => {
  const { settings, loading, refetch, updateSetting } = useSiteSettings();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<string>("banner");
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

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            Manajemen Konten (CMS)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sesuaikan siaran pengumuman, identitas web, logo resmi kampus (S3), hero, dan peta tanpa deploy ulang.
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full h-auto p-1 bg-muted/60">
          <TabsTrigger value="banner" className="gap-2 py-2.5">
            <Megaphone className="h-4 w-4" />
            <span>Banner Siaran</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2 py-2.5">
            <Globe className="h-4 w-4" />
            <span>Identitas & SEO</span>
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-2 py-2.5">
            <Layout className="h-4 w-4" />
            <span>Hero Landing</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="gap-2 py-2.5">
            <MapPin className="h-4 w-4" />
            <span>Peta & Footer</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: BANNER SIARAN */}
        <TabsContent value="banner" className="space-y-6">
          <BannerTab
            form={bannerForm}
            onChange={setBannerForm}
            onSave={() => handleSave("banner", bannerForm, "Banner Pengumuman")}
            isSaving={savingKey === "banner"}
          />
        </TabsContent>

        {/* TAB 2: IDENTITAS, LOGO & SEO */}
        <TabsContent value="branding" className="space-y-6">
          <BrandingTab
            form={brandingForm}
            onChange={setBrandingForm}
            onSave={() => handleSave("branding", brandingForm, "Identitas & SEO")}
            isSaving={savingKey === "branding"}
          />
        </TabsContent>

        {/* TAB 3: HERO LANDING PAGE */}
        <TabsContent value="hero" className="space-y-6">
          <HeroTab
            form={heroForm}
            onChange={setHeroForm}
            onSave={() => handleSave("hero", heroForm, "Hero Landing Page")}
            isSaving={savingKey === "hero"}
          />
        </TabsContent>

        {/* TAB 4: PETA & FOOTER */}
        <TabsContent value="location" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CmsSection;
