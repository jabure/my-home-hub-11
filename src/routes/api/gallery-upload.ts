import { createFileRoute } from "@tanstack/react-router";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MEDIA_EXTENSIONS,
  guestDir,
  hasGalleryAccess,
  sanitizeUploadName,
} from "@/lib/gallery-fs";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB pro Datei
const MAX_FILES_PER_REQUEST = 20;

// Gäste-Upload: Fotos/Videos landen im eigenen Album (Unterordner "gaeste").
export const Route = createFileRoute("/api/gallery-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasGalleryAccess(request)) {
          return new Response(JSON.stringify({ ok: false }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "Ungültiger Upload" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const files = form
          .getAll("files")
          .filter((f): f is File => f instanceof File)
          .slice(0, MAX_FILES_PER_REQUEST);

        if (files.length === 0) {
          return new Response(JSON.stringify({ ok: false, error: "Keine Dateien" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        await mkdir(guestDir(), { recursive: true });

        const saved: string[] = [];
        const rejected: string[] = [];
        for (const file of files) {
          const ext = path.extname(file.name).toLowerCase();
          if (!MEDIA_EXTENSIONS.has(ext) || file.size === 0 || file.size > MAX_FILE_BYTES) {
            rejected.push(file.name);
            continue;
          }
          const name = `${Date.now()}-${saved.length}-${sanitizeUploadName(file.name)}`;
          const buf = Buffer.from(await file.arrayBuffer());
          await writeFile(path.join(guestDir(), name), buf);
          saved.push(name);
        }

        return new Response(JSON.stringify({ ok: true, saved: saved.length, rejected }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
