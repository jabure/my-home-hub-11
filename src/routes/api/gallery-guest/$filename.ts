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
  safeGuestFilePath,
} from "@/lib/gallery-fs";

// Liefert Medien aus dem Gäste-Album (PIN-geschützt, mit Range-Streaming und Resize).
export const Route = createFileRoute("/api/gallery-guest/$filename")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!hasGalleryAccess(request)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const filePath = safeGuestFilePath(params.filename);
        if (!filePath) {
          return new Response("Invalid path", { status: 400 });
        }

        const sizeParam = new URL(request.url).searchParams.get("size");
        if (isResizeSize(sizeParam) && mediaTypeFor(params.filename) === "image") {
          const resized = await getResizedImage(params.filename, sizeParam, "gaeste");
          if (resized) {
            return new Response(new Uint8Array(resized), {
              headers: {
                "content-type": "image/webp",
                "cache-control": "private, max-age=86400",
                "x-robots-tag": "noindex, noimageindex",
              },
            });
          }
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
