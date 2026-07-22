import { createServerFileRoute } from "@tanstack/react-start/server";
import { json } from "@tanstack/react-start";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  GALLERY_DIR,
  IMAGE_EXTENSIONS,
  hasGalleryAccess,
  titleFromFilename,
} from "@/lib/gallery-fs";

export const ServerRoute = createServerFileRoute("/api/gallery").methods({
  GET: async ({ request }) => {
    if (!hasGalleryAccess(request)) {
      return json({ error: "unauthorized" }, { status: 401 });
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

    return json({ items });
  },
});
