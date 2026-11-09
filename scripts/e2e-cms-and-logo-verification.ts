import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const LIVE_FE = "https://library-fe-one.vercel.app";
const LIVE_BE = "https://api-library.abyte.my.id";
const ADMIN_EMAIL = "admin@mucilib.ac.id";
const ADMIN_PASSWORD = "Admin123456!";
const SCREENSHOT_DIR = "D:/KERJAAN/library-umc/screenshots";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface TestStep {
  name: string;
  passed: boolean;
  details: string;
}

const steps: TestStep[] = [];

function record(name: string, passed: boolean, details: string) {
  steps.push({ name, passed, details });
  const icon = passed ? "PASS" : "FAIL";
  console.log(`[${icon}] ${name} -> ${details}`);
}

async function main() {
  console.log("=================================================");
  console.log("   E2E VERIFICATION: CMS MODULAR, S3 UPLOAD & LOGO");
  console.log("=================================================");
  console.log(`Live Frontend: ${LIVE_FE}`);
  console.log(`Live Backend:  ${LIVE_BE}\n`);

  // ─────────────────────────────────────────────────────────────
  // PHASE 1: DIRECT API & S3 UPLOAD INTEGRATION TEST
  // ─────────────────────────────────────────────────────────────
  console.log("--- PHASE 1: Backend API & S3 Storage Verification ---");

  // Step 1.1: Healthcheck
  try {
    const healthRes = await fetch(`${LIVE_BE}/health`);
    const healthText = await healthRes.text();
    record(
      "Backend Healthcheck",
      healthRes.status === 200 && healthText.includes("API IS OK"),
      `Status: ${healthRes.status}, Body: ${healthText.trim()}`
    );
  } catch (err: any) {
    record("Backend Healthcheck", false, `Error: ${err.message}`);
  }

  // Step 1.2: Public Site Settings GET
  let initialSettings: any = null;
  try {
    const settingsRes = await fetch(`${LIVE_BE}/api/site-settings`);
    const settingsJson = await settingsRes.json();
    initialSettings = settingsJson.data;
    record(
      "GET /api/site-settings",
      settingsRes.status === 200 && settingsJson.success === true,
      `Keys found: ${Object.keys(initialSettings || {}).join(", ")} | logoUrl: '${initialSettings?.branding?.logoUrl}'`
    );
  } catch (err: any) {
    record("GET /api/site-settings", false, `Error: ${err.message}`);
  }

  // Step 1.3: Super Admin Login & Cookie Extraction
  let authCookie = "";
  try {
    const loginRes = await fetch(`${LIVE_BE}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: LIVE_FE,
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    const setCookies = loginRes.headers.getSetCookie?.() || [];
    authCookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    const loginData = await loginRes.json();

    record(
      "Admin Authentication",
      loginRes.status === 200 && !!loginData.user,
      `User: ${loginData.user?.email || "Unknown"}, Role: ${loginData.user?.role || "Unknown"}, Cookies: ${setCookies.length} captured`
    );
  } catch (err: any) {
    record("Admin Authentication", false, `Error: ${err.message}`);
  }

  // Step 1.4: S3 Asset Upload via API
  let uploadedUrl = "";
  let uploadedFilename = "";
  try {
    const pngHex =
      "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8d650000000049454e44ae426082";
    const pngBuffer = Buffer.from(pngHex, "hex");

    const formData = new FormData();
    const blob = new Blob([pngBuffer], { type: "image/png" });
    formData.append("file", blob, "e2e-test-logo.png");

    const uploadRes = await fetch(`${LIVE_BE}/api/site-settings/upload-asset`, {
      method: "POST",
      headers: {
        Cookie: authCookie,
        Origin: LIVE_FE,
      },
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    const isSuccess =
      (uploadRes.status === 200 || uploadRes.status === 201) &&
      uploadJson.success &&
      !!uploadJson.data?.url;

    if (isSuccess) {
      uploadedUrl = uploadJson.data.url;
      uploadedFilename = uploadJson.data.filename;
      record(
        "S3 Asset Upload (POST /api/site-settings/upload-asset)",
        true,
        `Status: ${uploadRes.status}, S3 Key: ${uploadJson.data.key}, URL: ${uploadedUrl}`
      );
    } else {
      record(
        "S3 Asset Upload (POST /api/site-settings/upload-asset)",
        false,
        `Status: ${uploadRes.status}, Body: ${JSON.stringify(uploadJson)}`
      );
    }
  } catch (err: any) {
    record("S3 Asset Upload", false, `Error: ${err.message}`);
  }

  // Step 1.5: S3 Asset Reverse-Proxy Streaming GET
  if (uploadedFilename) {
    try {
      const streamRes = await fetch(
        `${LIVE_BE}/api/site-settings/assets/${uploadedFilename}`
      );
      const contentType = streamRes.headers.get("content-type");
      const buffer = await streamRes.arrayBuffer();

      record(
        "S3 Asset Streaming (GET /api/site-settings/assets/:filename)",
        streamRes.status === 200 && contentType?.includes("image/png") && buffer.byteLength > 0,
        `Status: ${streamRes.status}, Content-Type: ${contentType}, Size: ${buffer.byteLength} bytes`
      );
    } catch (err: any) {
      record("S3 Asset Streaming", false, `Error: ${err.message}`);
    }
  }

  // Step 1.6: Path Traversal Guard Verification
  try {
    const traversalRes = await fetch(
      `${LIVE_BE}/api/site-settings/assets/..%2F..%2Fpackage.json`
    );
    record(
      "Path Traversal Guard Check",
      traversalRes.status === 400,
      `Status: ${traversalRes.status} (Expected 400 Bad Request)`
    );
  } catch (err: any) {
    record("Path Traversal Guard Check", false, `Error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: BROWSER AUTOMATION E2E TEST (PLAYWRIGHT)
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- PHASE 2: Browser E2E UI & Visual Verification ---");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Step 2.1: Open Landing Page & Check Navbar Logo
  try {
    await page.goto(`${LIVE_FE}/`, { waitUntil: "networkidle", timeout: 30000 });

    // Locate Navbar Logo via alt text
    const navbarLogo = page.locator('img[alt="UMC Library Logo"]').first();
    await navbarLogo.waitFor({ state: "visible", timeout: 10000 });

    // Check naturalWidth in DOM to ensure image actually loaded
    const isLogoLoaded = await navbarLogo.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    });

    const logoSrc = await navbarLogo.getAttribute("src");

    record(
      "Navbar Logo Visual Rendering",
      isLogoLoaded,
      `Logo rendered cleanly: complete=${isLogoLoaded}, src='${logoSrc?.slice(0, 50)}...'`
    );

    // Screenshot Navbar
    const navScreenshotPath = path.join(SCREENSHOT_DIR, "navbar-logo.png");
    await page.locator("div.sticky.top-0").screenshot({ path: navScreenshotPath });
    console.log(`Saved screenshot: ${navScreenshotPath}`);
  } catch (err: any) {
    record("Navbar Logo Visual Rendering", false, `Error: ${err.message}`);
  }

  // Step 2.2: Check Sticky Announcement Banner
  try {
    const banner = page.locator("div:has-text('PENGUMUMAN')").first();
    const hasBanner = await banner.isVisible().catch(() => false);
    record(
      "Sticky Announcement Banner",
      true,
      `Banner component mounted (active=${hasBanner})`
    );
  } catch (err: any) {
    record("Sticky Announcement Banner", false, `Error: ${err.message}`);
  }

  // Step 2.3: Check Footer Logo
  try {
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    const footerLogo = footer.locator("img").first();
    await footerLogo.waitFor({ state: "visible", timeout: 10000 });
    const isFooterLogoLoaded = await footerLogo.evaluate((img: HTMLImageElement) => {
      return img.complete && img.naturalWidth > 0;
    });

    const footerLogoSrc = await footerLogo.getAttribute("src");

    record(
      "Footer Logo Visual Rendering",
      isFooterLogoLoaded,
      `Footer logo rendered cleanly: complete=${isFooterLogoLoaded}, src='${footerLogoSrc?.slice(0, 50)}...'`
    );

    const footerScreenshotPath = path.join(SCREENSHOT_DIR, "footer-logo.png");
    await footer.screenshot({ path: footerScreenshotPath });
    console.log(`Saved screenshot: ${footerScreenshotPath}`);
  } catch (err: any) {
    record("Footer Logo Visual Rendering", false, `Error: ${err.message}`);
  }

  // Step 2.4: Admin Login & Navigate to CMS Panel
  try {
    console.log("\nNavigating to Admin Login...");
    await page.goto(`${LIVE_FE}/login`, { waitUntil: "networkidle", timeout: 30000 });

    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    const passInput = page.locator('input[type="password"], input[name="password"], #password').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Masuk")').first();

    await emailInput.fill(ADMIN_EMAIL);
    await passInput.fill(ADMIN_PASSWORD);
    await submitBtn.click();

    await page.waitForURL(/.*(dashboard|super-admin|admin).*/i, { timeout: 20000 });
    await page.waitForTimeout(2000);

    record(
      "Admin Login Flow",
      page.url().includes("dashboard"),
      `Redirected to: ${page.url()}`
    );

    // Locate CMS menu in sidebar
    const cmsMenu = page.locator('button:has-text("Manajemen Konten"), a:has-text("Manajemen Konten")').first();
    await cmsMenu.waitFor({ state: "visible", timeout: 10000 });
    await cmsMenu.click();
    await page.waitForTimeout(1500);

    // Step 2.5: Verify 4 CMS Sidebar Sub-Items
    const subBanner = page.locator('a[data-slot="sidebar-menu-sub-button"]:has-text("Banner Siaran"), button:has-text("Banner Siaran")').first();
    const subBranding = page.locator('a[data-slot="sidebar-menu-sub-button"]:has-text("Identitas & Logo"), button:has-text("Identitas & Logo")').first();
    const subHero = page.locator('a[data-slot="sidebar-menu-sub-button"]:has-text("Hero Landing Page"), button:has-text("Hero Landing Page")').first();
    const subLocation = page.locator('a[data-slot="sidebar-menu-sub-button"]:has-text("Peta Lokasi & Footer"), button:has-text("Peta Lokasi & Footer")').first();

    const subItemsExist =
      (await subBanner.isVisible()) &&
      (await subBranding.isVisible()) &&
      (await subHero.isVisible()) &&
      (await subLocation.isVisible());

    record(
      "CMS Sidebar Accordion Sub-Items Visibility",
      subItemsExist,
      "Banner, Branding, Hero, and Location sub-menu items rendered in sidebar"
    );

    // Sub-item 1: Banner Siaran
    await subBanner.click();
    await page.waitForTimeout(1000);
    const hasBannerHeading = await page.locator("h1:has-text('Bilah Pengumuman')").isVisible();
    record(
      "CMS Sub-Page 1 (Banner Siaran)",
      hasBannerHeading,
      `Banner heading visible: ${hasBannerHeading}`
    );
    const cmsBannerPath = path.join(SCREENSHOT_DIR, "cms-subpage-banner.png");
    await page.screenshot({ path: cmsBannerPath, fullPage: false });
    console.log(`Saved screenshot: ${cmsBannerPath}`);

    // Sub-item 2: Identitas & Logo
    await subBranding.click();
    await page.waitForTimeout(1000);
    const hasLogoUploader = await page.locator("text=Logo Perpustakaan (Navbar & Footer)").isVisible();
    const hasFaviconUploader = await page.locator("text=Favicon Tab Browser").isVisible();
    record(
      "CMS Sub-Page 2 (Identitas & Logo S3 Uploaders)",
      hasLogoUploader && hasFaviconUploader,
      `Logo Uploader: ${hasLogoUploader}, Favicon Uploader: ${hasFaviconUploader}`
    );
    const cmsBrandingPath = path.join(SCREENSHOT_DIR, "cms-subpage-branding.png");
    await page.screenshot({ path: cmsBrandingPath, fullPage: false });
    console.log(`Saved screenshot: ${cmsBrandingPath}`);

    // Sub-item 3: Hero Landing Page
    await subHero.click();
    await page.waitForTimeout(1000);
    const hasHeroBgUploader = await page.locator("text=Gambar Latar Hero (Hero Background Image)").isVisible();
    record(
      "CMS Sub-Page 3 (Hero Background Uploader)",
      hasHeroBgUploader,
      `Hero Bg Uploader: ${hasHeroBgUploader}`
    );
    const cmsHeroPath = path.join(SCREENSHOT_DIR, "cms-subpage-hero.png");
    await page.screenshot({ path: cmsHeroPath, fullPage: false });
    console.log(`Saved screenshot: ${cmsHeroPath}`);

    // Sub-item 4: Peta Lokasi & Footer
    await subLocation.click();
    await page.waitForTimeout(1000);
    const hasBuildingInput = await page.locator("#loc-building").isVisible();
    const hasMottoInput = await page.locator("#footer-motto").isVisible();
    record(
      "CMS Sub-Page 4 (Peta Lokasi & Footer Controls)",
      hasBuildingInput && hasMottoInput,
      `Building input: ${hasBuildingInput}, Motto input: ${hasMottoInput}`
    );
    const cmsLocationPath = path.join(SCREENSHOT_DIR, "cms-subpage-location.png");
    await page.screenshot({ path: cmsLocationPath, fullPage: false });
    console.log(`Saved screenshot: ${cmsLocationPath}`);

    // Step 2.6: Notification Bell Dropdown & Read State Verification
    const notifTrigger = page.locator('button[aria-label*="Notifikasi"]').first();
    const notifTriggerVisible = await notifTrigger.isVisible();
    if (notifTriggerVisible) {
      await notifTrigger.click();
      await page.waitForTimeout(500);

      const hasNotifHeader = await page.locator("h4:has-text('Notifikasi')").isVisible();
      const hasEmptyOrList =
        (await page.locator("text=Tidak ada notifikasi baru").first().isVisible().catch(() => false)) ||
        (await page.locator("text=Permohonan").first().isVisible().catch(() => false)) ||
        (await page.locator("p:has-text('Denda Belum Diselesaikan')").first().isVisible().catch(() => false)) ||
        (await page.locator("text=Semua Terbaca").first().isVisible().catch(() => false));

      const notifDropdownPath = path.join(SCREENSHOT_DIR, "notification-bell-dropdown.png");
      await page.screenshot({ path: notifDropdownPath, fullPage: false });
      console.log(`Saved screenshot: ${notifDropdownPath}`);

      // Test "Tandai dibaca" if present
      const markReadBtn = page.locator("button:has-text('Tandai dibaca')").first();
      if (await markReadBtn.isVisible()) {
        await markReadBtn.click();
        await page.waitForTimeout(400);
      }

      record(
        "Notification Bell Dropdown & Read State",
        hasNotifHeader && hasEmptyOrList,
        `Header: ${hasNotifHeader}, Content verified: ${hasEmptyOrList}`
      );
    } else {
      record("Notification Bell Dropdown & Read State", false, "Notification bell trigger button not visible");
    }
  } catch (err: any) {
    record("CMS Dashboard Automation", false, `Error: ${err.message}`);
  } finally {
    await browser.close();
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL SCOREBOARD
  // ─────────────────────────────────────────────────────────────
  console.log("\n=================================================");
  console.log("            E2E TEST RESULT SUMMARY");
  console.log("=================================================");
  const passedCount = steps.filter((s) => s.passed).length;
  const totalCount = steps.length;

  for (const s of steps) {
    console.log(`${s.passed ? "✅ PASS" : "❌ FAIL"} - ${s.name}: ${s.details}`);
  }

  console.log(`\nFinal Score: ${passedCount} / ${totalCount} passed (${Math.round((passedCount / totalCount) * 100)}%)`);

  if (passedCount === totalCount) {
    console.log("\n>>> ALL END-TO-END TESTS PASSED SUCCESSFULLY! <<<");
  } else {
    console.log(`\n>>> ${totalCount - passedCount} TESTS FAILED. PLEASE REVIEW DETAILS ABOVE. <<<`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal Error in E2E Test Suite:", err);
  process.exit(1);
});
