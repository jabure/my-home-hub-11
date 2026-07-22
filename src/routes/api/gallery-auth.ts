import { createServerFileRoute } from "@tanstack/react-start/server";
import { GALLERY_COOKIE_NAME, getGalleryPin } from "@/lib/gallery-fs";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const ServerRoute = createServerFileRoute("/api/gallery-auth").methods({
  POST: async ({ request }) => {
    let pin = "";
    try {
      const body = await request.json();
      pin = String(body?.pin ?? "");
    } catch {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const expected = getGalleryPin();
    if (!expected) {
      // Kein GALLERY_PIN in der Umgebung gesetzt -> Konfigurationsfehler statt "falsche PIN"
      return new Response(
        JSON.stringify({ ok: false, error: "GALLERY_PIN ist auf dem Server nicht gesetzt" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
    if (pin !== expected) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "Set-Cookie",
      `${GALLERY_COOKIE_NAME}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${THIRTY_DAYS}`,
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  },
});
