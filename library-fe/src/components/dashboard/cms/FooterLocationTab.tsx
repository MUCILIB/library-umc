import React from "react";
import { MapPin, Save, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationSettings, FooterSettings } from "@/api/siteSettingApi";

interface FooterLocationTabProps {
  locationForm: LocationSettings;
  onLocationChange: (form: LocationSettings) => void;
  onSaveLocation: () => void;
  isSavingLocation: boolean;
  footerForm: FooterSettings;
  onFooterChange: (form: FooterSettings) => void;
  onSaveFooter: () => void;
  isSavingFooter: boolean;
}

export const FooterLocationTab: React.FC<FooterLocationTabProps> = ({
  locationForm,
  onLocationChange,
  onSaveLocation,
  isSavingLocation,
  footerForm,
  onFooterChange,
  onSaveFooter,
  isSavingFooter,
}) => {
  return (
    <div className="space-y-6">
      {/* KARTU 1: PETA DAN INFORMASI LOKASI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Lokasi Fisik & Peta Digital</CardTitle>
            </div>
            <Button
              onClick={onSaveLocation}
              disabled={isSavingLocation}
              className="gap-2"
              size="sm"
            >
              {isSavingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Lokasi
            </Button>
          </div>
          <CardDescription>
            Informasi alamat gedung dan sematan Google Maps pada halaman "Tentang Kami".
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-building">Nama Gedung & Lantai</Label>
              <Input
                id="loc-building"
                value={locationForm.building}
                onChange={(e) =>
                  onLocationChange({ ...locationForm, building: e.target.value })
                }
                placeholder="Gedung Perpustakaan Pusat Kampus 1, Lantai 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-hours">Jam Operasional Layanan</Label>
              <Input
                id="loc-hours"
                value={locationForm.operationalHours}
                onChange={(e) =>
                  onLocationChange({
                    ...locationForm,
                    operationalHours: e.target.value,
                  })
                }
                placeholder="Senin - Jumat: 08.00 - 16.00 WIB"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="loc-embed">URL Iframe Sematan Google Maps</Label>
              {locationForm.directUrl && (
                <a
                  href={locationForm.directUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Buka Peta Langsung
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Input
              id="loc-embed"
              value={locationForm.embedUrl}
              onChange={(e) =>
                onLocationChange({ ...locationForm, embedUrl: e.target.value })
              }
              placeholder="https://www.google.com/maps/embed?pb=..."
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc-direct">Tautan Langsung Google Maps</Label>
              <Input
                id="loc-direct"
                value={locationForm.directUrl}
                onChange={(e) =>
                  onLocationChange({ ...locationForm, directUrl: e.target.value })
                }
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-phone">Telepon Layanan</Label>
              <Input
                id="loc-phone"
                value={locationForm.phone}
                onChange={(e) =>
                  onLocationChange({ ...locationForm, phone: e.target.value })
                }
                placeholder="+62 231 209608"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-email">Email Resmi Perpustakaan</Label>
              <Input
                id="loc-email"
                value={locationForm.email}
                onChange={(e) =>
                  onLocationChange({ ...locationForm, email: e.target.value })
                }
                placeholder="perpustakaan@umc.ac.id"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KARTU 2: FOOTER DAN EKOSISTEM KAMPUS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Footer & Jejaring Kampus</CardTitle>
            </div>
            <Button
              onClick={onSaveFooter}
              disabled={isSavingFooter}
              className="gap-2"
              size="sm"
            >
              {isSavingFooter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Footer
            </Button>
          </div>
          <CardDescription>
            Motto universitas dan tautan media sosial resmi yang tampil di bagian bawah setiap halaman.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footer-motto">Motto Universitas / Perpustakaan</Label>
            <Input
              id="footer-motto"
              value={footerForm.motto}
              onChange={(e) =>
                onFooterChange({ ...footerForm, motto: e.target.value })
              }
              placeholder="Unggul, Islami, Mandiri & Profesional"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="soc-ig">Instagram URL</Label>
              <Input
                id="soc-ig"
                value={footerForm.socialMedia?.instagram || ""}
                onChange={(e) =>
                  onFooterChange({
                    ...footerForm,
                    socialMedia: {
                      ...footerForm.socialMedia,
                      instagram: e.target.value,
                    },
                  })
                }
                placeholder="https://instagram.com/perpustakaan_umc"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="soc-fb">Facebook URL</Label>
              <Input
                id="soc-fb"
                value={footerForm.socialMedia?.facebook || ""}
                onChange={(e) =>
                  onFooterChange({
                    ...footerForm,
                    socialMedia: {
                      ...footerForm.socialMedia,
                      facebook: e.target.value,
                    },
                  })
                }
                placeholder="https://facebook.com/umcirebon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="soc-wa">WhatsApp Layanan</Label>
              <Input
                id="soc-wa"
                value={footerForm.socialMedia?.whatsapp || ""}
                onChange={(e) =>
                  onFooterChange({
                    ...footerForm,
                    socialMedia: {
                      ...footerForm.socialMedia,
                      whatsapp: e.target.value,
                    },
                  })
                }
                placeholder="https://wa.me/6281234567890"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
