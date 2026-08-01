import { createFileRoute } from "@tanstack/react-router";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import {
  getResizedImage,
  hasGalleryAccess,
  isResizeSize,
  mediaTypeFor,
  mimeTypeFor,
  safeGalleryFilePath,
} from "@/lib/gallery-fs";

export const Route = createFileRoute("/api/gallery/$filename")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!hasGalleryAccess(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const filePath = safeGalleryFilePath(params.filename);
        if (!filePath) {
          return new Response("Invalid path", { status: 400 });
        }

        // Verkleinerte Anzeige-Version für Bilder (?size=display|thumb)
        const sizeParam = new URL(request.url).searchParams.get("size");
        if (isResizeSize(sizeParam) && mediaTypeFor(params.filename) === "image") {
          const resized = await getResizedImage(params.filename, sizeParam);
          if (resized) {
            return new Response(new Uint8Array(resized), {
              headers: {
                "content-type": "image/webp",
                "cache-control": "private, max-age=86400",
                "x-robots-tag": "noindex, noimageindex",
              },
            });
          }
          // Fallback: Original ausliefern, wenn Verkleinern nicht möglich war
        }

        let fileSize: number;
        try {
          const info = await stat(filePath);
          if (!info.isFile()) throw new Error("not a file");
          fileSize = info.size;
        } catch {
          return new Response("Not found", { status: 404 });
        }

        const baseHeaders: Record<string, string> = {
          "content-type": mimeTypeFor(params.filename),
          "cache-control": "private, max-age=3600",
          "x-robots-tag": "noindex, noimageindex",
          "accept-ranges": "bytes",
        };

        // HTTP Range-Support: nötig, damit Browser Videos streamen und spulen können
        const rangeHeader = request.headers.get("range");
        if (rangeHeader) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
          if (match) {
            const start = match[1] ? parseInt(match[1], 10) : 0;
            const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
            if (start >= fileSize || end >= fileSize || start > end) {
              return new Response("Range Not Satisfiable", {
                status: 416,
                headers: { "content-range": `bytes */${fileSize}` },
              });
            }
            const stream = Readable.toWeb(
              // Große Chunks (1 MB) für gleichmäßiges Video-Streaming ohne Aussetzer
              createReadStream(filePath, { start, end, highWaterMark: 1024 * 1024 }),
            ) as ReadableStream;
            return new Response(stream, {
              status: 206,
              headers: {
                ...baseHeaders,
                "content-range": `bytes ${start}-${end}/${fileSize}`,
                "content-length": String(end - start + 1),
              },
            });
          }
        }

        const stream = Readable.toWeb(
          createReadStream(filePath, { highWaterMark: 1024 * 1024 }),
        ) as ReadableStream;
        return new Response(stream, {
          headers: { ...baseHeaders, "content-length": String(fileSize) },
        });
      },
    },
  },
});
