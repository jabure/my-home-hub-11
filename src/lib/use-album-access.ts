import { useCallback, useEffect, useState } from "react";
import type { GalleryItem, MusicTrack } from "@/components/gallery-experience";

export type SiteConfig = { weddingDate: string | null; coupleNames: string };

const DEFAULT_CONFIG: SiteConfig = { weddingDate: null, coupleNames: "Tanja & Christopher" };

// Öffentliche Basis-Infos (Namen, Hochzeitsdatum) für PIN-Seite und Diashow
export function useSiteConfig(): SiteConfig {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((cfg: Partial<SiteConfig>) => {
        if (cancelled) return;
        setConfig({
          weddingDate: cfg.weddingDate ?? null,
          coupleNames: cfg.coupleNames || DEFAULT_CONFIG.coupleNames,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return config;
}

// Gemeinsame Zugangslogik für PIN (Startseite) und Token (Bilderrahmen)
export function useAlbumAccess({
  authEndpoint,
  bodyKey,
}: {
  authEndpoint: "/api/gallery-auth" | "/api/frame-auth";
  bodyKey: "pin" | "token";
}) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);
  const [lockedForSeconds, setLockedForSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedHint, setRememberedHint] = useState(false);

  const load = useCallback(async (isInitialCheck = false) => {
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
      // War schon beim allerersten Laden entsperrt -> Cookie war noch gültig
      if (isInitialCheck) {
        setRememberedHint(true);
        window.setTimeout(() => setRememberedHint(false), 4000);
      }
    } catch {
      setStatus("locked");
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  // Countdown für die Sperre nach zu vielen Fehlversuchen
  useEffect(() => {
    if (lockedForSeconds <= 0) return;
    const id = window.setInterval(() => setLockedForSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [lockedForSeconds]);

  const fail = (message: string) => {
    setError(message);
    setErrorNonce((n) => n + 1);
  };

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting || secret.length === 0 || lockedForSeconds > 0) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(authEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ [bodyKey]: secret }),
        });
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          setLockedForSeconds(data.lockedForSeconds ?? 60);
          setSecret("");
          return;
        }
        if (res.status === 500) {
          fail("Der Zugang ist am Server noch nicht eingerichtet.");
          return;
        }
        if (!res.ok) {
          fail(
            bodyKey === "pin" ? "Die PIN stimmt leider nicht." : "Der Code stimmt leider nicht.",
          );
          setSecret("");
          return;
        }
        setSecret("");
        await load(false);
      } catch {
        fail("Keine Verbindung zum Server. Bitte nochmal versuchen.");
      } finally {
        setSubmitting(false);
      }
    },
    [authEndpoint, bodyKey, secret, submitting, lockedForSeconds, load],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/gallery-logout", { method: "POST" });
    } catch {
      // Egal, wir setzen den Zustand clientseitig trotzdem zurück
    }
    setItems([]);
    setMusicTracks([]);
    setStatus("locked");
  }, []);

  return {
    status,
    items,
    musicTracks,
    secret,
    setSecret: (v: string) => {
      setSecret(v);
      setError(null);
    },
    error,
    errorNonce,
    lockedForSeconds,
    submitting,
    submit,
    rememberedHint,
    logout,
    reload: () => load(false),
  };
}

// "2024-05-12" -> "12. Mai 2024" (als UTC formatiert, damit kein Tag verrutscht)
export function formatWeddingDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-AT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}
