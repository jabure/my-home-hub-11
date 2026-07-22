import path from "node:path";
import { readFile } from "node:fs/promises";

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

// Optional: eine "captions.json" im Galerie-Ordner erlaubt eigene Titel/Reihenfolge,
// ohne Dateien umbenennen zu müssen.
// Format: { "order": ["b.jpg", "a.jpg"], "captions": { "a.jpg": "Mein Titel" } }
type CaptionsFile = {
  order?: string[];
  captions?: Record<string, string>;
};

export async function readCaptionsFile(): Promise<CaptionsFile> {
  try {
    const raw = await readFile(path.join(GALLERY_DIR, "captions.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed.order) ? parsed.order.filter((x: unknown) => typeof x === "string") : undefined,
      captions:
        parsed.captions && typeof parsed.captions === "object" ? parsed.captions : undefined,
    };
  } catch {
    return {};
  }
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

// --- Einfaches In-Memory Rate-Limiting für die PIN-Eingabe ---
// Schützt vor Durchprobieren; reicht für einen einzelnen Server-Prozess.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

type AttemptState = { count: number; lockedUntil: number };
const attempts = new Map<string, AttemptState>();

export function getClientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function isLockedOut(key: string): number {
  const state = attempts.get(key);
  if (!state) return 0;
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function registerFailedAttempt(key: string): void {
  const now = Date.now();
  const state = attempts.get(key) ?? { count: 0, lockedUntil: 0 };
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
    state.count = 0;
  }
  attempts.set(key, state);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

// --- Wetter-Standort (per Umgebungsvariable überschreibbar) ---
export function getWeatherConfig() {
  return {
    lat: Number(process.env.WEATHER_LAT ?? "48.1667"),
    lon: Number(process.env.WEATHER_LON ?? "14.0333"),
    name: process.env.WEATHER_LOCATION_NAME ?? "Wels",
  };
}
