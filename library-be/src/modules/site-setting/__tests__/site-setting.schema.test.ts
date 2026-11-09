import { describe, it, expect } from "vitest";
import { siteSettings } from "../../../db/schema";

describe("SiteSettings Schema", () => {
  it("mendefinisikan tabel site_settings dengan kolom yang sesuai", () => {
    expect(siteSettings).toBeDefined();
    expect(siteSettings.key).toBeDefined();
    expect(siteSettings.value).toBeDefined();
    expect(siteSettings.description).toBeDefined();
    expect(siteSettings.updatedBy).toBeDefined();
    expect(siteSettings.createdAt).toBeDefined();
    expect(siteSettings.updatedAt).toBeDefined();
  });
});
