import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StorageService } from "../service/storage.service";
import fs from "fs";
import path from "path";

describe("StorageService (TDD Seam)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should detect local storage mode when S3 credentials are missing", () => {
    delete process.env.ENDPOINT_URL;
    delete process.env.ACCESS_KEY;
    delete process.env.SECRET_KEY;

    const storage = new StorageService();
    expect(storage.isS3Enabled()).toBe(false);
  });

  it("should detect S3 mode when credentials and endpoint are provided", () => {
    process.env.ENDPOINT_URL = "https://s3.dahono.com";
    process.env.ACCESS_KEY = "test-access-key";
    process.env.SECRET_KEY = "test-secret-key";
    process.env.S3_BUCKET = "test-bucket";

    const storage = new StorageService();
    expect(storage.isS3Enabled()).toBe(true);
  });

  it("should generate proper S3 object key with /library/ prefix", () => {
    process.env.ENDPOINT_URL = "https://s3.dahono.com";
    process.env.ACCESS_KEY = "test-access-key";
    process.env.SECRET_KEY = "test-secret-key";

    const storage = new StorageService();
    const key = storage.resolveKey("document.pdf");
    expect(key).toBe("library/proposals/document.pdf");
  });

  it("should fall back to local disk storage when S3 is disabled", async () => {
    delete process.env.ENDPOINT_URL;
    delete process.env.ACCESS_KEY;
    delete process.env.SECRET_KEY;

    const storage = new StorageService();
    const dummyBuffer = Buffer.from("%PDF-1.4 dummy content");
    const filename = `test-${Date.now()}.pdf`;

    const savedPath = await storage.save(filename, dummyBuffer);
    expect(savedPath).toContain(filename);
    expect(fs.existsSync(savedPath)).toBe(true);

    const readBuffer = await storage.read(savedPath);
    expect(readBuffer.toString()).toBe(dummyBuffer.toString());

    await storage.delete(savedPath);
    expect(fs.existsSync(savedPath)).toBe(false);
  });
});
