import { useState, useEffect, useCallback } from "react";
import {
  siteSettingApi,
  DEFAULT_SITE_SETTINGS,
  type AllSiteSettings,
} from "@/api/siteSettingApi";

// In-memory module cache agar tidak fetch berulang saat komponen berganti
let cachedSettings: AllSiteSettings | null = null;
let isFetching = false;
const listeners = new Set<(settings: AllSiteSettings) => void>();

export function useSiteSettings() {
  const [settings, setSettings] = useState<AllSiteSettings>(
    () => cachedSettings || DEFAULT_SITE_SETTINGS
  );
  const [loading, setLoading] = useState<boolean>(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  // Sinkronisasi subscriber listeners
  useEffect(() => {
    const handleUpdate = (newSettings: AllSiteSettings) => {
      setSettings(newSettings);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    if (isFetching) return;
    try {
      isFetching = true;
      setLoading(true);
      setError(null);
      const res = await siteSettingApi.getAll();
      if (res && res.data) {
        cachedSettings = res.data;
        setSettings(res.data);
        listeners.forEach((listener) => listener(res.data));
      }
    } catch (err: any) {
      console.warn("[SiteSettings] Gagal memuat pengaturan, menggunakan default:", err?.message);
      setError(err?.message || "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
      isFetching = false;
    }
  }, []);

  useEffect(() => {
    if (!cachedSettings) {
      void fetchSettings();
    }
  }, [fetchSettings]);

  // DOM Injections: document.title & favicon
  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Update Document Title
    const { siteTitle, siteTagline } = settings.branding;
    if (siteTitle) {
      document.title = siteTagline ? `${siteTitle} | ${siteTagline}` : siteTitle;
    }

    // 2. Update Favicon Link
    const { faviconUrl } = settings.branding;
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [settings.branding]);

  const updateSetting = useCallback(
    async (key: string, value: Record<string, any>) => {
      const res = await siteSettingApi.update(key, value);
      // Optimistic update ke cache & listeners
      const updated: AllSiteSettings = {
        ...settings,
        [key]: {
          ...(settings as any)[key],
          ...value,
        },
      };
      cachedSettings = updated;
      setSettings(updated);
      listeners.forEach((listener) => listener(updated));
      return res;
    },
    [settings]
  );

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSetting,
  };
}

export function _resetSiteSettingsCacheForTesting() {
  cachedSettings = null;
  isFetching = false;
  listeners.clear();
}

export default useSiteSettings;
