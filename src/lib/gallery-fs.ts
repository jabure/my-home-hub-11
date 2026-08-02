import path from "node:path";
import { readFile } from "node:fs/promises";

// Ordner, in den einfach Bilder abgelegt werden können (per Docker-Volume gemountet).
// Kann per Umgebungsvariable GALLERY_DIR überschrieben werden.
export const GALLERY_DIR = path.resolve(process.env.GALLERY_DIR ?? "/data/gallery");

export const GALLERY_COOKIE_NAME = "gallery_access";

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
export const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);
export const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

export function mediaTypeFor(filename: string): "image" | "video" {
  return VIDEO_EXTENSIONS.has(path.extname(filename).toLowerCase()) ? "video" : "image";
}

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
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

// --- In-Memory Rate-Limiting für die PIN-Eingabe mit eskalierender IP-Sperre ---
// 5 Fehlversuche -> 60s Sperre. Nach der 3. Sperre -> 24h IP-Bann.
// (Zähler leben im Speicher und werden bei Container-Neustart zurückgesetzt.)
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
const BAN_AFTER_LOCKOUTS = 3;
const BAN_MS = 24 * 60 * 60 * 1000;

type AttemptState = { count: number; lockedUntil: number; lockouts: number };
const attempts = new Map<string, AttemptState>();

// Optional: Benachrichtigung über ntfy.sh bei jeder Sperre (NTFY_URL env setzen)
function notifyLockout(ip: string, banned: boolean): void {
  const url = process.env.NTFY_URL;
  if (!url) return;
  const message = banned
    ? `Galerie: IP ${ip} wurde nach wiederholten Fehlversuchen für 24 Stunden gesperrt.`
    : `Galerie: IP ${ip} wurde nach 5 falschen PIN-Versuchen für 60 Sekunden gesperrt.`;
  fetch(url, {
    method: "POST",
    body: message,
    headers: { Title: "PIN-Fehlversuche", Priority: banned ? "high" : "default" },
  }).catch(() => {});
}

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
  const state = attempts.get(key) ?? { count: 0, lockedUntil: 0, lockouts: 0 };
  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.count = 0;
    state.lockouts += 1;
    const banned = state.lockouts >= BAN_AFTER_LOCKOUTS;
    state.lockedUntil = now + (banned ? BAN_MS : LOCKOUT_MS);
    notifyLockout(key, banned);
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

// --- Optionale Hintergrundmusik ---
// Einfach eine Audiodatei (z. B. "hochzeitsmusik.mp3") in den Galerie-Ordner legen.
const AUDIO_MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
};
export const AUDIO_EXTENSIONS = new Set(Object.keys(AUDIO_MIME_TYPES));

export function audioMimeTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return AUDIO_MIME_TYPES[ext] ?? "application/octet-stream";
}

export async function findMusicFiles(): Promise<string[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(GALLERY_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && AUDIO_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, "de"));
  } catch {
    return [];
  }
}

export async function findMusicFile(): Promise<string | null> {
  const files = await findMusicFiles();
  return files[0] ?? null;
}

// --- Server-seitige Bildverkleinerung mit Disk-Cache ---
// Kamera-Originale (oft 6000px / mehrere MB) sind zu schwer für flüssige
// Browser-Animationen. Wir liefern automatisch passende WebP-Größen aus
// und cachen sie im Galerie-Ordner unter .cache/ (übersteht Container-Neustarts).
const RESIZE_WIDTHS = { display: 1920, thumb: 320 } as const;
export type ResizeSize = keyof typeof RESIZE_WIDTHS;

export function isResizeSize(v: string | null): v is ResizeSize {
  return v === "display" || v === "thumb";
}

export async function getResizedImage(
  filename: string,
  size: ResizeSize,
  album?: "gaeste",
): Promise<Buffer | null> {
  const srcPath = album === "gaeste" ? safeGuestFilePath(filename) : safeGalleryFilePath(filename);
  if (!srcPath) return null;

  const { mkdir, stat, readFile, writeFile } = await import("node:fs/promises");
  const cacheDir = path.join(GALLERY_DIR, ".cache");
  const prefix = album === "gaeste" ? "gaeste-" : "";
  const cachePath = path.join(cacheDir, `${prefix}${size}-${path.basename(filename)}.webp`);

  try {
    const [srcStat, cacheStat] = await Promise.all([stat(srcPath), stat(cachePath)]);
    if (cacheStat.mtimeMs >= srcStat.mtimeMs) {
      return await readFile(cachePath);
    }
  } catch {
    // Kein Cache vorhanden -> neu erzeugen
  }

  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;
    const buf = await sharp(srcPath)
      .rotate() // EXIF-Orientierung anwenden (wichtig bei Handy-Fotos)
      .resize({ width: RESIZE_WIDTHS[size], withoutEnlargement: true })
      .webp({ quality: size === "thumb" ? 70 : 82 })
      .toBuffer();
    try {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cachePath, buf);
    } catch {
      // Cache-Schreiben fehlgeschlagen (z. B. read-only Volume) -> trotzdem ausliefern
    }
    return buf;
  } catch {
    // sharp nicht verfügbar oder Datei nicht dekodierbar -> Aufrufer nutzt Original
    return null;
  }
}

// Hintergrund-Warmup: erzeugt alle Cache-Größen einmalig vorab, damit die
// Diashow nie auf das Verkleinern warten muss. Läuft sequenziell und nur
// einmal gleichzeitig (kein CPU-Burst bei parallelem Zugriff).
let warmupRunning = false;
export function warmResizeCache(filenames: string[]): void {
  if (warmupRunning) return;
  warmupRunning = true;
  (async () => {
    try {
      for (const name of filenames) {
        if (mediaTypeFor(name) !== "image") continue;
        await getResizedImage(name, "thumb");
        await getResizedImage(name, "display");
      }
    } finally {
      warmupRunning = false;
    }
  })().catch(() => {
    warmupRunning = false;
  });
}

// --- Aufnahmedatum für die Sortierung ---
// Für Fotos wird das EXIF-Aufnahmedatum gelesen (das echte Datum aus der Kamera),
// als Fallback (und für Videos) gilt das Datei-Änderungsdatum.
// Ergebnisse werden im Speicher gecacht (ungültig bei geänderter Datei).
const dateCache = new Map<string, { mtimeMs: number; timestamp: number }>();

export async function mediaTimestamp(name: string): Promise<number> {
  const filePath = safeGalleryFilePath(name);
  if (!filePath) return 0;
  const { stat } = await import("node:fs/promises");
  let mtimeMs = 0;
  try {
    mtimeMs = (await stat(filePath)).mtimeMs;
  } catch {
    return 0;
  }
  const cached = dateCache.get(name);
  if (cached && cached.mtimeMs === mtimeMs) return cached.timestamp;

  let timestamp = mtimeMs;
  if (mediaTypeFor(name) === "image") {
    try {
      const sharp = (await import("sharp")).default;
      const exifReader = (await import("exif-reader")).default;
      const meta = await sharp(filePath).metadata();
      if (meta.exif) {
        const parsed = exifReader(meta.exif);
        const taken = parsed?.Photo?.DateTimeOriginal ?? parsed?.Image?.DateTime;
        if (taken instanceof Date && !Number.isNaN(taken.getTime())) {
          timestamp = taken.getTime();
        }
      }
    } catch {
      // Kein/kaputtes EXIF -> Datei-Datum verwenden
    }
  }
  dateCache.set(name, { mtimeMs, timestamp });
  return timestamp;
}

// --- Gäste-Album (eigener Unterordner für hochgeladene Fotos) ---
export const GUEST_DIR_NAME = "gaeste";
export function guestDir(): string {
  return path.join(GALLERY_DIR, GUEST_DIR_NAME);
}

export function safeGuestFilePath(filename: string): string | null {
  const base = path.basename(filename);
  const dir = guestDir();
  const resolved = path.resolve(dir, base);
  if (!resolved.startsWith(dir + path.sep)) return null;
  return resolved;
}

export function sanitizeUploadName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.length > 0 ? base.slice(0, 120) : "upload";
}

export async function listGuestFiles(): Promise<string[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(guestDir(), { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && MEDIA_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, "de")); // Zeitstempel-Präfix = Upload-Reihenfolge
  } catch {
    return [];
  }
}

// --- Bilderrahmen-Modus: Zugriff per Token statt PIN (FRAME_TOKEN env) ---
export function getFrameToken(): string | undefined {
  const t = process.env.FRAME_TOKEN;
  return t && t.length >= 8 ? t : undefined;
}

// --- Hochzeitsdatum für den "Verheiratet seit"-Zähler (WEDDING_DATE env, z. B. 2024-05-12) ---
export function getWeddingDate(): string | null {
  const raw = process.env.WEDDING_DATE;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : raw;
}
