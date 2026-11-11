import { API_BASE_URL } from "./api-config";

/**
 * Memeriksa apakah path gambar merupakan URL web, Data URI, atau endpoint API yang valid
 */
export function isValidImageUrl(image: string | null | undefined): boolean {
  if (!image || typeof image !== "string") return false;
  const trimmed = image.trim();
  if (trimmed === "") return false;

  // Data URI base64
  if (trimmed.startsWith("data:image/")) return true;

  // Full HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;

  // Endpoint API Covers
  if (trimmed.startsWith("/api/covers/") || trimmed.startsWith("api/covers/")) return true;

  // Local static public covers (/covers/...)
  if (trimmed.startsWith("/covers/") || trimmed.startsWith("covers/")) return true;

  // S3 Storage Key
  if (trimmed.startsWith("library/covers/")) return true;

  // String mentah nama file lokal lama SLiMS (contoh: cover_xxx.png) bukan URL yang valid
  return false;
}

/**
 * Melakukan resolusi URL sampul buku ke endpoint absolut atau data URI yang valid.
 * Mengembalikan null jika gambar tidak valid sehingga UI langsung me-render mockup cover elegan.
 */
export function resolveCoverUrl(image: string | null | undefined): string | null {
  if (!isValidImageUrl(image)) return null;

  const trimmed = image!.trim();

  if (trimmed.startsWith("data:image/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (cleanPath.startsWith("/covers/")) {
    return cleanPath;
  }
  if (cleanPath.startsWith("/api/covers/")) {
    return `${API_BASE_URL}${cleanPath}`;
  }

  if (trimmed.startsWith("library/covers/")) {
    const filename = trimmed.replace("library/covers/", "");
    return `${API_BASE_URL}/api/covers/${filename}`;
  }

  return null;
}
