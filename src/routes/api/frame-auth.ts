import { createFileRoute } from "@tanstack/react-router";
import {
  GALLERY_COOKIE_NAME,
  getClientKey,
  getFrameToken,
  isLockedOut,
  registerFailedAttempt,
  clearAttempts,
} from "@/lib/gallery-fs";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Bilderrahmen-Modus: Zugriff per geheimem Token statt PIN (für TV/Tablet).
export const Route = createFileRoute("/api/frame-auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const clientKey = getClientKey(request);
        const remaining = isLockedOut(clientKey);
        if (remaining > 0) {
          return new Response(
            JSON.stringify({ ok: false, lockedForSeconds: Math.ceil(remaining / 1000) }),
            { status: 429, headers: { "content-type": "application/json" } },
          );
        }

        let token = "";
        try {
          const body = await request.json();
          token = String(body?.token ?? "");
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const expected = getFrameToken();
        if (!expected) {
          return new Response(
            JSON.stringify({ ok: false, error: "FRAME_TOKEN ist nicht gesetzt (min. 8 Zeichen)" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
        if (token !== expected) {
          registerFailedAttempt(clientKey);
          return new Response(JSON.stringify({ ok: false }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        clearAttempts(clientKey);
        const headers = new Headers({ "content-type": "application/json" });
        headers.append(
          "Set-Cookie",
          `${GALLERY_COOKIE_NAME}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR}`,
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
