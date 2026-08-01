import { createFileRoute } from "@tanstack/react-router";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GALLERY_DIR, audioMimeTypeFor, findMusicFile, hasGalleryAccess } from "@/lib/gallery-fs";

export const Route = createFileRoute("/api/gallery-music")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!hasGalleryAccess(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const filename = await findMusicFile();
        if (!filename) {
          return new Response("No music file found", { status: 404 });
        }

        try {
          const data = await readFile(path.join(GALLERY_DIR, filename));
          return new Response(data, {
            headers: {
              "content-type": audioMimeTypeFor(filename),
              "cache-control": "private, max-age=3600",
              "x-robots-tag": "noindex",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
