import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Globe,
  Layout,
  MapPin,
  Save,
  Loader2,
  ExternalLink,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BannerAnnouncementSticky } from "@/components/blocks/BannerAnnouncementSticky";
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

  // Sync state when settings fetched
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
            Sesuaikan siaran pengumuman, identitas web, tampilan hero, dan informasi kampus langsung tanpa deploy ulang.
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

        {/* TAB 1: BANNER PENGUMUMAN */}
        <TabsContent value="banner" className="space-y-6">
          {/* Live Preview */}
          <Card className="border-primary/20 bg-muted/30 overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/50 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Pratinjau Banner Langsung (Live Preview)
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bannerForm.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                {bannerForm.isActive ? "Status: AKTIF" : "Status: NONAKTIF"}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {bannerForm.isActive ? (
                <BannerAnnouncementSticky
                  isActive={true}
                  badgeText={bannerForm.badgeText}
                  message={bannerForm.message}
                  linkText={bannerForm.linkText}
                  linkUrl={bannerForm.linkUrl}
                  dismissible={bannerForm.dismissible}
                  storageKey="cms_preview_banner"
                />
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground bg-muted/20">
                  Banner sedang dinonaktifkan. Pengunjung tidak akan melihat bilah pengumuman di atas navbar.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Banner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pengaturan Bilah Pengumuman Sticky</CardTitle>
              <CardDescription>
                Bilah pengumuman muncul di posisi paling atas halaman web sebelum navbar utama.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center space-x-2 p-3 bg-muted/40 rounded-lg border">
                <Checkbox
                  id="banner-isActive"
                  checked={bannerForm.isActive}
                  onCheckedChange={(checked) =>
                    setBannerForm({ ...bannerForm, isActive: checked === true })
                  }
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="banner-isActive" className="text-sm font-semibold cursor-pointer">
                    Aktifkan Penayangan Banner Pengumuman
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Jika tidak dicentang, banner disembunyikan sepenuhnya dari seluruh pengunjung portal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-badgeText">Label Badge / Tag</Label>
                  <Input
                    id="banner-badgeText"
                    placeholder="Contoh: PENGUMUMAN / INFO PENTING"
                    value={bannerForm.badgeText}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, badgeText: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Teks badge tebal di sebelah kiri siaran.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-dismissible">Izin Penutupan (Dismissible)</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="banner-dismissible"
                      checked={bannerForm.dismissible}
                      onCheckedChange={(checked) =>
                        setBannerForm({ ...bannerForm, dismissible: checked === true })
                      }
                    />
                    <Label htmlFor="banner-dismissible" className="text-xs text-muted-foreground cursor-pointer">
                      Izinkan pengguna menutup banner sementara menggunakan tombol silang (X)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banner-message">Isi Pesan Pengumuman</Label>
                <textarea
                  id="banner-message"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ketik isi pengumuman ringkas yang akan dibaca pengunjung..."
                  value={bannerForm.message}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, message: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banner-linkText">Teks Tautan (Link Text)</Label>
                  <Input
                    id="banner-linkText"
                    placeholder="Contoh: Lihat Katalog / Selengkapnya"
                    value={bannerForm.linkText}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, linkText: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-linkUrl">URL Tujuan (Link URL)</Label>
                  <Input
                    id="banner-linkUrl"
                    placeholder="Contoh: /katalog atau https://umc.ac.id"
                    value={bannerForm.linkUrl}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, linkUrl: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => handleSave("banner", bannerForm, "Banner Pengumuman")}
                  disabled={savingKey === "banner"}
                  className="gap-2"
                >
                  {savingKey === "banner" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Pengaturan Banner
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: IDENTITAS & BRANDING */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identitas Portal, Favicon & Meta SEO</CardTitle>
              <CardDescription>
                Konfigurasi judul tab browser, icon shortcut (favicon), dan metadata mesin pencari.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branding-siteTitle">Judul Situs (Site Title)</Label>
                  <Input
                    id="branding-siteTitle"
                    placeholder="Perpustakaan Universitas Muhammadiyah Cirebon"
                    value={brandingForm.siteTitle}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, siteTitle: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Muncul pada tab browser dan hasil pencarian Google.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branding-siteTagline">Slogan / Tagline</Label>
                  <Input
                    id="branding-siteTagline"
                    placeholder="Portal Riset & Sumber Belajar Digital"
                    value={brandingForm.siteTagline}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, siteTagline: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Dipasangkan setelah judul situs pada tab browser.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branding-faviconUrl">URL Favicon (.ico / .png / .svg)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="branding-faviconUrl"
                      placeholder="/favicon.ico atau https://domain/icon.png"
                      value={brandingForm.faviconUrl}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, faviconUrl: e.target.value })
                      }
                    />
                    {brandingForm.faviconUrl && (
                      <div className="h-9 w-9 shrink-0 border rounded flex items-center justify-center bg-muted/40 p-1">
                        <img
                          src={brandingForm.faviconUrl}
                          alt="Favicon Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Ikon kecil di samping judul tab browser pengunjung.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branding-logoUrl">URL Logo Perpustakaan</Label>
                  <Input
                    id="branding-logoUrl"
                    placeholder="/assets/logo_umc.png"
                    value={brandingForm.logoUrl}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, logoUrl: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Logo institusi pada navbar dan dokumen resmi.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branding-metaDescription">Deskripsi Meta SEO</Label>
                <textarea
                  id="branding-metaDescription"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ringkasan singkat peran dan koleksi perpustakaan untuk mesin pencari..."
                  value={brandingForm.metaDescription}
                  onChange={(e) =>
                    setBrandingForm({ ...brandingForm, metaDescription: e.target.value })
                  }
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => handleSave("branding", brandingForm, "Identitas & Branding")}
                  disabled={savingKey === "branding"}
                  className="gap-2"
                >
                  {savingKey === "branding" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Identitas Situs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: HERO LANDING */}
        <TabsContent value="hero" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kustomisasi Bagian Utama (Hero Section)</CardTitle>
              <CardDescription>
                Teks sambutan, latar belakang, dan kata kunci cepat pada halaman beranda utama.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="hero-title">Judul Utama Hero (Hero Heading)</Label>
                <Input
                  id="hero-title"
                  placeholder="Perpustakaan Universitas Muhammadiyah Cirebon"
                  value={heroForm.title}
                  onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-subtitle">Subjudul / Sambutan Ringkas</Label>
                <Input
                  id="hero-subtitle"
                  placeholder="Akses Koleksi buku, jurnal, dan e-book resmi UMC"
                  value={heroForm.subtitle}
                  onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-backgroundImage">URL Gambar Latar Belakang</Label>
                  <Input
                    id="hero-backgroundImage"
                    placeholder="/assets/bg1-BOtzP3_E.jpeg"
                    value={heroForm.backgroundImage}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, backgroundImage: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Gambar lanskap gedung kampus atau interior perpustakaan.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero-searchPlaceholder">Placeholder Kotak Pencarian</Label>
                  <Input
                    id="hero-searchPlaceholder"
                    placeholder="Cari judul, penulis, ISBN..."
                    value={heroForm.searchPlaceholder}
                    onChange={(e) =>
                      setHeroForm({ ...heroForm, searchPlaceholder: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Teks panduan di dalam kotak input pencarian katalog.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-quickChips">Kata Kunci Populer Cepat (Dipisahkan Koma)</Label>
                <Input
                  id="hero-quickChips"
                  placeholder="Pemrograman, Manajemen, Algoritma, Jurnal, Kesehatan"
                  value={heroForm.quickChips.join(", ")}
                  onChange={(e) =>
                    setHeroForm({
                      ...heroForm,
                      quickChips: e.target.value
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Tombol chip pencarian instan di bawah input pencarian utama hero.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => handleSave("hero", heroForm, "Hero Section")}
                  disabled={savingKey === "hero"}
                  className="gap-2"
                >
                  {savingKey === "hero" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Pengaturan Hero
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: PETA & FOOTER */}
        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Peta Lokasi & Kontak Operasional</CardTitle>
              <CardDescription>
                Alamat gedung, jam pelayanan, nomor telepon, dan embed peta digital Google Maps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="location-embedUrl">Google Maps Embed Iframe URL</Label>
                <Input
                  id="location-embedUrl"
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  value={locationForm.embedUrl}
                  onChange={(e) =>
                    setLocationForm({ ...locationForm, embedUrl: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  URL dari menu Google Maps: Bagikan - Sematkan Peta (ambil atribut src).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location-directUrl">Tautan Google Maps Langsung</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location-directUrl"
                      placeholder="https://maps.app.goo.gl/..."
                      value={locationForm.directUrl}
                      onChange={(e) =>
                        setLocationForm({ ...locationForm, directUrl: e.target.value })
                      }
                    />
                    {locationForm.directUrl && (
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="shrink-0"
                      >
                        <a
                          href={locationForm.directUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka Peta di Tab Baru"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-building">Lokasi Ruangan & Gedung</Label>
                  <Input
                    id="location-building"
                    placeholder="Gedung Perpustakaan Pusat Kampus 1, Lantai 2"
                    value={locationForm.building}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, building: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location-operationalHours">Jam Operasional Pelayanan</Label>
                  <Input
                    id="location-operationalHours"
                    placeholder="Senin - Jumat: 08.00 - 16.00 WIB"
                    value={locationForm.operationalHours}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, operationalHours: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-phone">Nomor Telepon / WhatsApp</Label>
                  <Input
                    id="location-phone"
                    placeholder="+62 231 209608"
                    value={locationForm.phone}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-email">Alamat Email Resmi</Label>
                  <Input
                    id="location-email"
                    placeholder="perpustakaan@umc.ac.id"
                    value={locationForm.email}
                    onChange={(e) =>
                      setLocationForm({ ...locationForm, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => handleSave("location", locationForm, "Peta & Kontak Lokasi")}
                  disabled={savingKey === "location"}
                  className="gap-2"
                >
                  {savingKey === "location" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Informasi Lokasi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer Motto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Footer & Motto Institusi</CardTitle>
              <CardDescription>
                Motto dan tautan ekosistem kampus yang tampil pada kaki halaman publik.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="footer-motto">Motto Perpustakaan & Universitas</Label>
                <Input
                  id="footer-motto"
                  placeholder="Unggul, Islami, Mandiri & Profesional"
                  value={footerForm.motto}
                  onChange={(e) => setFooterForm({ ...footerForm, motto: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => handleSave("footer", footerForm, "Footer & Motto")}
                  disabled={savingKey === "footer"}
                  className="gap-2"
                >
                  {savingKey === "footer" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Footer & Motto
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CmsSection;
