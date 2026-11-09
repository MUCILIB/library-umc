import { db } from "../../../db";
import { siteSettings } from "../../../db/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_SITE_SETTINGS,
  type AllSiteSettings,
  type ValidSettingKey,
  VALID_SETTING_KEYS,
} from "../site-setting.constants";

export class SiteSettingService {
  /**
   * Mengambil semua konfigurasi site settings.
   * Menggabungkan baris dari database dengan default fallback terstruktur.
   */
  static async getAllSettings(): Promise<AllSiteSettings> {
    const rows = await db.select().from(siteSettings);

    const result: AllSiteSettings = {
      branding: { ...DEFAULT_SITE_SETTINGS.branding },
      banner: { ...DEFAULT_SITE_SETTINGS.banner },
      hero: { ...DEFAULT_SITE_SETTINGS.hero },
      location: { ...DEFAULT_SITE_SETTINGS.location },
      footer: { ...DEFAULT_SITE_SETTINGS.footer },
    };

    for (const row of rows) {
      const key = row.key as ValidSettingKey;
      if (VALID_SETTING_KEYS.includes(key) && row.value && typeof row.value === "object") {
        (result as any)[key] = {
          ...(result as any)[key],
          ...(row.value as Record<string, any>),
        };
      }
    }

    return result;
  }

  /**
   * Mengambil satu konfigurasi site settings berdasarkan kunci.
   */
  static async getSettingByKey<T = Record<string, any>>(key: string): Promise<T> {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key));

    const defaultVal =
      (DEFAULT_SITE_SETTINGS as Record<string, any>)[key] || {};

    if (rows.length === 0 || !rows[0].value) {
      return defaultVal as T;
    }

    return {
      ...defaultVal,
      ...(rows[0].value as Record<string, any>),
    } as T;
  }

  /**
   * Melakukan upsert satu pengaturan site settings ke database.
   */
  static async updateSetting(
    key: string,
    value: Record<string, any>,
    userId?: string
  ) {
    if (!key || typeof key !== "string") {
      throw new Error("Key pengaturan tidak valid");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Payload pengaturan harus berupa objek JSON");
    }

    const now = new Date();

    const [updated] = await db
      .insert(siteSettings)
      .values({
        key,
        value,
        description: `Pengaturan untuk ${key}`,
        updatedBy: userId || null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value,
          updatedBy: userId || null,
          updatedAt: now,
        },
      })
      .returning();

    return updated;
  }
}
