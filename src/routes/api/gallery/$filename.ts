import { createServerFileRoute } from "@tanstack/react-start/server";
import { readFile } from "node:fs/promises";
import { hasGalleryAccess, mimeTypeFor, safeGalleryFilePath } from "@/lib/gallery-fs";

export const ServerRoute = createServerFileRoute("/api/gallery/$filename").methods({
  GET: async ({ request, params }) => {
    if (!hasGalleryAccess(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const filePath = safeGalleryFilePath(params.filename);
    if (!filePath) {
      return new Response("Invalid path", { status: 400 });
    }

    try {
      const data = await readFile(filePath);
      return new Response(data, {
        headers: {
          "content-type": mimeTypeFor(params.filename),
          "cache-control": "private, max-age=3600",
          // Zusätzlich zur Passwortsperre: Bilder nie in Suchmaschinen indizieren
          "x-robots-tag": "noindex, noimageindex",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
});
