import { createFileRoute } from "@tanstack/react-router";
import { getWeddingDate } from "@/lib/gallery-fs";

export const Route = createFileRoute("/api/site-config")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ weddingDate: getWeddingDate() }), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
