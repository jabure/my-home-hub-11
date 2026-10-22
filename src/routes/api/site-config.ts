import { createFileRoute } from "@tanstack/react-router";
import { getCoupleNames, getWeddingDate } from "@/lib/gallery-fs";

// Öffentliche Basis-Infos für die PIN-Seite (keine Bilder, keine privaten Daten)
export const Route = createFileRoute("/api/site-config")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({ weddingDate: getWeddingDate(), coupleNames: getCoupleNames() }),
          {
            headers: {
              "content-type": "application/json",
              "cache-control": "no-cache",
            },
          },
        );
      },
    },
  },
});
