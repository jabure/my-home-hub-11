import { createFileRoute } from "@tanstack/react-router";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  GALLERY_DIR,
  IMAGE_EXTENSIONS,
  hasGalleryAccess,
  titleFromFilename,
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
              (e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
            )
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b, "de"));
        } catch {
          files = [];
        }

        const items = files.map((name) => ({
          src: `/api/gallery/${encodeURIComponent(name)}`,
          title: titleFromFilename(name),
        }));

        return new Response(JSON.stringify({ items }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
