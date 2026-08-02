import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import {
  GalleryExperience,
  type GalleryItem,
  type MusicTrack,
} from "@/components/gallery-experience";

// Bilderrahmen-Modus: eigene, PIN-freie Adresse für TV/Tablet.
// Zugriff per geheimem Token (FRAME_TOKEN env), danach dauerhaft (Cookie 1 Jahr).
export const Route = createFileRoute("/rahmen")({
  head: () => ({
    meta: [
      { title: "Bilderrahmen" },
      { name: "robots", content: "noindex, nofollow, noimageindex" },
    ],
  }),
  component: FramePage,
});

function FramePage() {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState(false);
  const [lockedForSeconds, setLockedForSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/gallery");
      if (res.status === 401) {
        setStatus("locked");
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
      setMusicTracks(data.musicTracks ?? []);
      setStatus("unlocked");
    } catch {
      setStatus("locked");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (lockedForSeconds <= 0) return;
    const id = window.setInterval(() => setLockedForSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [lockedForSeconds]);

  const submitToken = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setTokenError(false);
      try {
        const res = await fetch("/api/frame-auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          setLockedForSeconds(data.lockedForSeconds ?? 60);
          setSubmitting(false);
          return;
        }
        if (!res.ok) {
          setTokenError(true);
          setSubmitting(false);
          return;
        }
        setToken("");
        await load();
      } catch {
        setTokenError(true);
      } finally {
        setSubmitting(false);
      }
    },
    [token, load],
  );

  if (status === "unlocked") {
    return (
      <GalleryExperience
        items={items}
        musicTracks={musicTracks}
        rememberedHint={false}
        frameMode
        onExit={() => {}}
        onRefresh={load}
      />
    );
  }

  return (
    <div className="wedding-stage flex min-h-screen items-center justify-center px-4">
      {status === "locked" && (
        <form
          onSubmit={submitToken}
          className="flex flex-col items-center gap-4 rounded-3xl bg-white/10 p-10 text-center text-white ring-1 ring-white/15 backdrop-blur-md"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Bilderrahmen</p>
            <p className="mt-1 text-sm text-white/70">Zugangscode für dieses Gerät eingeben.</p>
          </div>
          <input
            type="password"
            autoFocus
            disabled={lockedForSeconds > 0}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setTokenError(false);
            }}
            placeholder="Code"
            className="w-56 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-center tracking-widest text-white outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50"
          />
          {tokenError && lockedForSeconds === 0 && (
            <p className="text-sm text-red-300">Falscher Code.</p>
          )}
          {lockedForSeconds > 0 && (
            <p className="text-sm text-red-300">
              Zu viele Versuche. Bitte warte {lockedForSeconds}s.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || token.length === 0 || lockedForSeconds > 0}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {submitting ? "Prüfe…" : "Entsperren"}
          </button>
        </form>
      )}
    </div>
  );
}
