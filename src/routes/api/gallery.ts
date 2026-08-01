import { createFileRoute } from "@tanstack/react-router";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  GALLERY_DIR,
  MEDIA_EXTENSIONS,
  findMusicFiles,
  warmResizeCache,
  hasGalleryAccess,
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
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b, "de"));
        } catch {
          files = [];
        }

        const { order, captions } = await readCaptionsFile();

        if (order && order.length > 0) {
          const known = new Set(files);
          const ordered = order.filter((f) => known.has(f));
          const rest = files.filter((f) => !order.includes(f));
          files = [...ordered, ...rest];
        }

        const items = files.map((name) => ({
          src: `/api/gallery/${encodeURIComponent(name)}`,
          title: captions?.[name] ?? titleFromFilename(name),
          type: mediaTypeFor(name),
        }));

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
