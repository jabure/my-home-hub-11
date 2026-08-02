import { createFileRoute } from "@tanstack/react-router";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  GALLERY_DIR,
  MEDIA_EXTENSIONS,
  findMusicFiles,
  listGuestFiles,
  warmResizeCache,
  hasGalleryAccess,
  mediaTimestamp,
  mediaTypeFor,
  titleFromFilename,
  readCaptionsFile,
} from "@/lib/gallery-fs";

export const Route = createFileRoute("/api/gallery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasGalleryAccess(request)) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let files: string[] = [];
        try {
          const entries = await readdir(GALLERY_DIR, { withFileTypes: true });
          files = entries
            .filter(
              (e) => e.isFile() && MEDIA_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
            )
            .map((e) => e.name);
        } catch {
          files = [];
        }

        // Chronologisch nach Aufnahmedatum sortieren (EXIF, sonst Datei-Datum);
        // bei gleichem Datum alphabetisch als stabiler Tiebreaker
        const timestamps = new Map<string, number>();
        await Promise.all(
          files.map(async (name) => {
            timestamps.set(name, await mediaTimestamp(name));
          }),
        );
        files.sort((a, b) => {
          const diff = (timestamps.get(a) ?? 0) - (timestamps.get(b) ?? 0);
          return diff !== 0 ? diff : a.localeCompare(b, "de");
        });

        const { order, captions } = await readCaptionsFile();

        if (order && order.length > 0) {
          const known = new Set(files);
          const ordered = order.filter((f) => known.has(f));
          const rest = files.filter((f) => !order.includes(f));
          files = [...ordered, ...rest];
        }

        const items: Array<{
          src: string;
          title: string;
          type: "image" | "video";
          album?: "gaeste";
        }> = files.map((name) => ({
          src: `/api/gallery/${encodeURIComponent(name)}`,
          title: captions?.[name] ?? titleFromFilename(name),
          type: mediaTypeFor(name),
        }));

        // Gäste-Album anhängen (eigener Abschnitt, chronologisch nach Upload)
        const guestFiles = await listGuestFiles();
        for (const name of guestFiles) {
          items.push({
            src: `/api/gallery-guest/${encodeURIComponent(name)}`,
            title: titleFromFilename(name.replace(/^\d+-\d+-/, "")),
            type: mediaTypeFor(name),
            album: "gaeste",
          });
        }

        // Verkleinerte Versionen im Hintergrund vorbereiten (blockiert die Antwort nicht)
        warmResizeCache(files);

        const musicFiles = await findMusicFiles();
        const musicTracks = musicFiles.map((name) => ({
          src: `/api/gallery/${encodeURIComponent(name)}`,
          title: titleFromFilename(name),
        }));

        return new Response(JSON.stringify({ items, musicTracks }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
