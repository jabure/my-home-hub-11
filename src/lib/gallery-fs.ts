import path from "node:path";

// Ordner, in den einfach Bilder abgelegt werden können (per Docker-Volume gemountet).
// Kann per Umgebungsvariable GALLERY_DIR überschrieben werden.
export const GALLERY_DIR = path.resolve(process.env.GALLERY_DIR ?? "/data/gallery");

export const GALLERY_COOKIE_NAME = "gallery_access";

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export function mimeTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

// Erzeugt aus "01-brautpaar-abend.jpg" -> "Brautpaar Abend"
export function titleFromFilename(filename: string): string {
  const base = filename.slice(0, filename.length - path.extname(filename).length);
  const withoutIndex = base.replace(/^\d+[-_.\s]*/, "");
  const cleaned = (withoutIndex.length > 0 ? withoutIndex : base)
    .replace(/[-_]+/g, " ")
    .trim();
  const words = cleaned.length > 0 ? cleaned : base;
  return words
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getGalleryPin(): string | undefined {
  return process.env.GALLERY_PIN;
}

export function hasGalleryAccess(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${GALLERY_COOKIE_NAME}=1`);
}

// Verhindert Path-Traversal (../../etc/passwd etc.)
export function safeGalleryFilePath(filename: string): string | null {
  const base = path.basename(filename);
  const resolved = path.resolve(GALLERY_DIR, base);
  if (!resolved.startsWith(GALLERY_DIR + path.sep) && resolved !== GALLERY_DIR) {
    return null;
  }
  return resolved;
}
