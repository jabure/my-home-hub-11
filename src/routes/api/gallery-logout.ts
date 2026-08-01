import { createFileRoute } from "@tanstack/react-router";
import { GALLERY_COOKIE_NAME } from "@/lib/gallery-fs";

export const Route = createFileRoute("/api/gallery-logout")({
  server: {
    handlers: {
      POST: async () => {
        const headers = new Headers({ "content-type": "application/json" });
        headers.append(
          "Set-Cookie",
          `${GALLERY_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
