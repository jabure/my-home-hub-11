import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  ExternalLink,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Table2,
  Droplets,
  Gauge,
  Thermometer,
  Youtube,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Lock,
  ImageOff,
  Volume2,
  VolumeX,
  Music,
  SkipForward,
  ListMusic,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";
import hero1 from "@/assets/hero-1.webp";
import hero2 from "@/assets/hero-2.webp";
import hero3 from "@/assets/hero-3.webp";

const heroImages = [hero1, hero2, hero3];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Xsellishimbeerkuchen — Familienmomente" },
      {
        name: "description",
        content:
          "Xsellishimbeerkuchen: unsere Familien- und Hochzeitsgalerie mit Live-Wetter aus Wels und schnellen Links zu unseren Diensten.",
      },
      { property: "og:title", content: "Xsellishimbeerkuchen" },
      {
        property: "og:description",
        content:
          "Familien- und Hochzeitsgalerie mit Live-Wetter aus Wels und Links zu unseren Diensten.",
      },
      // Verhindert, dass Google Bilder die Fotos indiziert
      { name: "robots", content: "noimageindex, nosnippet" },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

type Service = {
  name: string;
  url: string;
  description: string;
  icon: LucideIcon;
};

const services: Service[] = [
  {
    name: "Neverwinter Stats",
    url: "https://xsellinwstats.com",
    description: "Stats Berechnen",
    icon: Table2,
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@Xsellisecj",
    description: "Unser YouTube-Kanal",
    icon: Youtube,
  },
];

type GalleryItem = {
  src: string;
  title: string;
  type: "image" | "video";
};

type MusicTrack = {
  src: string;
  title: string;
};

// Verhindert Rechtsklick / Drag / Referrer-Leak auf Bildern
function protectedImgProps() {
  return {
    draggable: false as const,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    referrerPolicy: "no-referrer" as const,
  };
}

function useGalleryAccess() {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [lockedForSeconds, setLockedForSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedHint, setRememberedHint] = useState(false);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);

  const loadGallery = useCallback(async (isInitialCheck = false) => {
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
    loadGallery(true);
  }, [loadGallery]);

  // Countdown für die Sperre nach zu vielen Fehlversuchen
  useEffect(() => {
    if (lockedForSeconds <= 0) return;
    const id = window.setInterval(() => {
      setLockedForSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockedForSeconds]);

  const submitPin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setPinError(false);
      try {
        const res = await fetch("/api/gallery-auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          setLockedForSeconds(data.lockedForSeconds ?? 60);
          setSubmitting(false);
          return;
        }
        if (!res.ok) {
          setPinError(true);
          setSubmitting(false);
          return;
        }
        setPin("");
        await loadGallery(false);
      } catch {
        setPinError(true);
      } finally {
        setSubmitting(false);
      }
    },
    [pin, loadGallery],
  );

  const exitGallery = useCallback(async () => {
    try {
      await fetch("/api/gallery-logout", { method: "POST" });
    } catch {
      // Egal, wir setzen den Zustand clientseitig trotzdem zurück
    }
    setItems([]);
    setStatus("locked");
  }, []);

  return {
    status,
    items,
    pin,
    setPin,
    pinError,
    setPinError,
    lockedForSeconds,
    submitting,
    submitPin,
    rememberedHint,
    musicTracks,
    exitGallery,
  };
}

function Home() {
  const gallery = useGalleryAccess();

  // Sobald entsperrt: die ganze Seite dreht sich nur noch um die Galerie.
  if (gallery.status === "unlocked") {
    return (
      <GalleryExperience
        items={gallery.items}
        rememberedHint={gallery.rememberedHint}
        musicTracks={gallery.musicTracks}
        onExit={gallery.exitGallery}
      />
    );
  }

  return (
    <div className="relative min-h-screen">
      <Nav />
      <Hero />
      <main className="mx-auto max-w-6xl px-5 pb-32 sm:px-8">
        <section id="gallery" className="pt-10">
          <SectionTitle eyebrow="Album" title="Familie & Hochzeit" />

          {gallery.status === "checking" && <GallerySkeleton />}

          {gallery.status === "locked" && (
            <form
              onSubmit={gallery.submitPin}
              className="mt-10 flex flex-col items-center gap-4 rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-border"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Geschützter Bereich</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bitte PIN eingeben, um die Familienfotos zu sehen.
                </p>
              </div>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                disabled={gallery.lockedForSeconds > 0}
                value={gallery.pin}
                onChange={(e) => {
                  gallery.setPin(e.target.value);
                  gallery.setPinError(false);
                }}
                placeholder="PIN"
                className="w-40 rounded-full border border-input bg-background px-4 py-2 text-center text-lg tracking-[0.3em] outline-none ring-primary/40 focus:ring-2 disabled:opacity-50"
              />
              {gallery.pinError && gallery.lockedForSeconds === 0 && (
                <p className="text-sm text-destructive">Falsche PIN, bitte nochmal versuchen.</p>
              )}
              {gallery.lockedForSeconds > 0 && (
                <p className="text-sm text-destructive">
                  Zu viele Versuche. Bitte warte {gallery.lockedForSeconds}s.
                </p>
              )}
              <button
                type="submit"
                disabled={
                  gallery.submitting || gallery.pin.length === 0 || gallery.lockedForSeconds > 0
                }
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
              >
                {gallery.submitting ? "Prüfe…" : "Entsperren"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-4 mt-4 flex items-center justify-between gap-4 rounded-full px-4 py-2 glass sm:mx-auto sm:max-w-6xl sm:px-5">
        <a href="#top" className="flex items-center gap-3 font-display font-semibold">
          <img
            src={logo}
            alt="Xsellishimbeerkuchen Logo"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 drop-shadow-sm"
            {...protectedImgProps()}
          />
          <span className="hidden text-lg leading-none tracking-tight sm:inline">
            Xsellishimbeerkuchen
          </span>
          <span className="text-base leading-none tracking-tight sm:hidden">
            Xsellis…
          </span>
        </a>
        <QuickDock />
      </div>
    </header>
  );
}

function QuickDock() {
  return (
    <div className="flex items-center gap-2">
      <WeatherButton />
      <span className="mx-0.5 hidden h-7 w-px bg-border sm:block" />
      <nav aria-label="Dienste" className="flex items-center gap-1.5">
        {services.map((s) => (
          <ServiceButton key={s.name} service={s} />
        ))}
      </nav>
    </div>
  );
}

function ServiceButton({ service }: { service: Service }) {
  const { icon: Icon, name, description, url } = service;
  return (
    <div className="group relative">
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={name}
        className="flex h-10 items-center gap-2 rounded-full bg-primary/10 px-2.5 text-sm font-medium text-primary ring-1 ring-primary/30 transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/30 sm:px-3.5"
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{name}</span>
      </a>
      <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-60 origin-top-right scale-95 rounded-2xl p-3 opacity-0 transition-all duration-200 glass group-hover:scale-100 group-hover:opacity-100">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold">{name}</p>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        <p className="mt-2 truncate text-[10px] uppercase tracking-widest text-primary">
          {url.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}

type WeatherData = {
  temp: number;
  apparent: number;
  code: number;
  wind: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  high: number;
  low: number;
  sunrise: string;
  sunset: string;
};

const WMO: Record<number, { label: string; Icon: LucideIcon }> = {
  0: { label: "Klar", Icon: Sun },
  1: { label: "Heiter", Icon: Sun },
  2: { label: "Teilw. bewölkt", Icon: Cloud },
  3: { label: "Bedeckt", Icon: Cloud },
  45: { label: "Nebel", Icon: CloudFog },
  48: { label: "Reifnebel", Icon: CloudFog },
  51: { label: "Nieselregen", Icon: CloudRain },
  53: { label: "Nieselregen", Icon: CloudRain },
  55: { label: "Nieselregen", Icon: CloudRain },
  61: { label: "Regen", Icon: CloudRain },
  63: { label: "Regen", Icon: CloudRain },
  65: { label: "Starker Regen", Icon: CloudRain },
  71: { label: "Schneefall", Icon: CloudSnow },
  73: { label: "Schneefall", Icon: CloudSnow },
  75: { label: "Starker Schnee", Icon: CloudSnow },
  80: { label: "Regenschauer", Icon: CloudRain },
  81: { label: "Regenschauer", Icon: CloudRain },
  82: { label: "Heftige Schauer", Icon: CloudRain },
  95: { label: "Gewitter", Icon: CloudLightning },
  96: { label: "Gewitter", Icon: CloudLightning },
  99: { label: "Gewitter", Icon: CloudLightning },
};

function WeatherButton() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [locationName, setLocationName] = useState("Wels");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/weather-config")
      .then((r) => r.json())
      .then((cfg: { lat: number; lon: number; name: string }) => {
        if (cancelled) return;
        setLocationName(cfg.name);
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,surface_pressure,precipitation&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FVienna`,
        );
      })
      .then((r) => r?.json())
      .then((j) => {
        if (!j || cancelled) return;
        const fmt = (s: string) =>
          new Date(s).toLocaleTimeString("de-AT", {
            hour: "2-digit",
            minute: "2-digit",
          });
        setData({
          temp: Math.round(j.current.temperature_2m),
          apparent: Math.round(j.current.apparent_temperature),
          code: j.current.weather_code,
          wind: Math.round(j.current.wind_speed_10m),
          humidity: Math.round(j.current.relative_humidity_2m),
          pressure: Math.round(j.current.surface_pressure),
          precipitation: j.current.precipitation ?? 0,
          high: Math.round(j.daily.temperature_2m_max[0]),
          low: Math.round(j.daily.temperature_2m_min[0]),
          sunrise: fmt(j.daily.sunrise[0]),
          sunset: fmt(j.daily.sunset[0]),
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const wmo = data ? WMO[data.code] ?? { label: "—", Icon: Cloud } : null;
  const Icon = wmo?.Icon ?? Cloud;

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`Wetter in ${locationName}`}
        className="flex h-10 items-center gap-2 rounded-full bg-white/70 px-3.5 text-sm font-medium text-foreground/80 ring-1 ring-border transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-lg"
      >
        <Icon className="h-4 w-4" />
        <span className="tabular-nums">
          {data ? `${data.temp}°` : error ? "—" : "··"}
        </span>
        <span className="hidden text-[11px] uppercase tracking-widest opacity-70 sm:inline">
          {locationName}
        </span>
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 origin-top scale-95 rounded-2xl p-4 opacity-0 transition-all duration-200 glass group-hover:scale-100 group-hover:opacity-100 sm:left-auto sm:right-0 sm:translate-x-0 sm:origin-top-right">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="font-display text-3xl font-semibold tabular-nums leading-none">
              {data ? `${data.temp}°C` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {wmo?.label ?? (error ? "nicht verfügbar" : "lädt…")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
              H: {data ? `${data.high}°` : "—"} · T: {data ? `${data.low}°` : "—"}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Stat
            icon={Thermometer}
            label="Gefühlt"
            value={data ? `${data.apparent}°` : "—"}
          />
          <Stat
            icon={Wind}
            label="Wind"
            value={data ? `${data.wind} km/h` : "—"}
          />
          <Stat
            icon={Droplets}
            label="Luftfeuchte"
            value={data ? `${data.humidity}%` : "—"}
          />
          <Stat
            icon={Gauge}
            label="Druck"
            value={data ? `${data.pressure} hPa` : "—"}
          />
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 text-[11px] text-muted-foreground ring-1 ring-border">
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3 text-primary" />
            {data ? data.sunrise : "—"}
          </span>
          <span className="flex items-center gap-1">
            <CloudRain className="h-3 w-3 text-primary" />
            {data ? `${data.precipitation} mm` : "—"}
          </span>
          <span className="flex items-center gap-1">
            <Sun className="h-3 w-3 opacity-50" />
            {data ? data.sunset : "—"}
          </span>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          {locationName} · open-meteo.com
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-2 ring-1 ring-border">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="font-display font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Hero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % heroImages.length),
      5000,
    );
    return () => window.clearInterval(id);
  }, []);
  return (
    <section
      id="top"
      className="relative mx-auto max-w-6xl px-5 pt-12 pb-16 sm:px-8 sm:pt-20"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {heroImages.map((src, i) => (
          <img
            key={`${src}-${active}`}
            src={src}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${
              i === active ? "opacity-60 animate-ken-burns" : "opacity-0"
            }`}
            {...protectedImgProps()}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground ring-1 ring-border backdrop-blur">
          <Heart className="h-3 w-3 text-primary" fill="currentColor" /> Wels · Familie
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] sm:text-7xl">
          Unsere <span className="glow-text">liebsten</span>
          <br />
          Momente.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Hochzeit, Familie und kleine Augenblicke, die wir nicht vergessen
          wollen. Klick auf ein Bild für die Diashow.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#gallery"
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Galerie öffnen
          </a>
        </div>
      </div>
    </section>
  );
}

function GallerySkeleton() {
  return (
    <div className="mt-10">
      <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-muted sm:aspect-[16/9]" />
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

const SLIDE_DURATION_MS = 7000;

function GalleryExperience({
  items,
  rememberedHint,
  musicTracks,
  onExit,
}: {
  items: GalleryItem[];
  rememberedHint: boolean;
  musicTracks: MusicTrack[];
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [trackIndex, setTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const failedTracksRef = useRef(0);
  const hasMusic = musicTracks.length > 0 && !audioFailed;
  const currentTrack = musicTracks[trackIndex] ?? null;

  const nextTrack = useCallback(() => {
    if (musicTracks.length <= 1) return;
    setTrackIndex((i) => (i + 1) % musicTracks.length);
  }, [musicTracks.length]);

  const next = useCallback(() => {
    setIndex((i) => (items.length > 0 ? (i + 1) % items.length : 0));
  }, [items.length]);
  const prev = useCallback(() => {
    setIndex((i) => (items.length > 0 ? (i - 1 + items.length) % items.length : 0));
  }, [items.length]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const current = items[index];
  const isVideo = current?.type === "video";

  // Diashow läuft automatisch durch — bei Videos wartet sie stattdessen aufs Videoende
  useEffect(() => {
    if (!playing || items.length <= 1 || isVideo) return;
    const id = window.setInterval(next, SLIDE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [playing, next, items.length, isVideo]);

  // Video beim Anzeigen starten, beim Verlassen stoppen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isVideo && playing) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else if (!playing) {
      video.pause();
    }
  }, [isVideo, playing, index]);

  // Tastatursteuerung
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit]);

  // Hintergrundmusik: spielt automatisch, pausiert bei Videos, wechselt Tracks
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasMusic) return;
    if (isVideo || !playing) {
      audio.pause();
      return;
    }
    audio
      .play()
      .then(() => {
        setMusicBlocked(false);
        failedTracksRef.current = 0;
      })
      .catch(() => {
        // Browser blockiert Autoplay ohne Nutzer-Geste -> Hinweis zeigen
        setMusicBlocked(true);
      });
  }, [hasMusic, isVideo, playing, trackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    audio.volume = volume;
  }, [muted, volume]);

  const startMusicManually = useCallback(() => {
    audioRef.current
      ?.play()
      .then(() => setMusicBlocked(false))
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="wedding-stage fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 px-4 text-center text-[oklch(0.96_0.01_80)]">
        <ImageOff className="h-10 w-10 opacity-50" />
        <p className="text-sm opacity-70">Noch keine Bilder im Galerie-Ordner am Server.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
        >
          Zur Startseite
        </button>
      </div>
    );
  }

  return (
    <div className="wedding-stage fixed inset-0 z-40 flex flex-col overflow-hidden">
      {hasMusic && (
        <audio
          ref={audioRef}
          src={currentTrack?.src}
          loop={musicTracks.length === 1}
          preload="auto"
          onEnded={() => nextTrack()}
          onError={() => {
            failedTracksRef.current += 1;
            if (failedTracksRef.current >= musicTracks.length) {
              setAudioFailed(true);
            } else {
              nextTrack();
            }
          }}
        />
      )}

      {/* Weich verschwommener Foto-Hintergrund (nur das aktive Bild, für flüssiges Rendering) */}
      {current?.type === "image" && (
        <img
          key={`bg-${current.src}`}
          src={current.src}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-xl animate-fade-in"
          {...protectedImgProps()}
        />
      )}
      {/* Warmer Champagner-Schleier + Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[oklch(0.24_0.02_50)]/60" />
      <div className="pointer-events-none absolute inset-0 wedding-vignette" />

      {/* Fortschrittsbalken bis zum nächsten Bild */}
      {playing && items.length > 1 && (
        <div className="absolute left-0 right-0 top-0 z-10 h-[3px] bg-white/10">
          <div
            key={index}
            className="h-full bg-gradient-to-r from-[oklch(0.85_0.09_85)] to-[oklch(0.78_0.1_50)]"
            style={{ animation: `gallery-progress ${SLIDE_DURATION_MS}ms linear forwards` }}
          />
        </div>
      )}

      {/* Kopfzeile */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-5 sm:px-8">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[oklch(0.94_0.02_85)] ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
        >
          <X className="h-3.5 w-3.5" /> Verlassen
        </button>

        <div className="flex items-center gap-2">
          {hasMusic && (
            <div className="relative flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-3.5 pr-2 text-[oklch(0.94_0.02_85)] ring-1 ring-white/20 backdrop-blur-md">
              <Music className="h-3.5 w-3.5 shrink-0 text-[oklch(0.85_0.09_85)]" />
              <span
                className="hidden max-w-36 truncate text-xs sm:inline"
                title={currentTrack?.title}
              >
                {currentTrack?.title}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => {
                  setVolume(Number(e.target.value) / 100);
                  setMuted(false);
                }}
                aria-label="Musik-Lautstärke"
                className="hidden w-20 accent-[oklch(0.85_0.09_85)] sm:block"
              />
              <button
                type="button"
                onClick={() => (musicBlocked ? startMusicManually() : setMuted((m) => !m))}
                aria-label={musicBlocked ? "Musik starten" : muted ? "Musik an" : "Musik aus"}
                className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/20"
              >
                {musicBlocked || muted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              {musicTracks.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={nextTrack}
                    aria-label="Nächster Titel"
                    className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/20"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlaylist((s) => !s)}
                    aria-label="Titelübersicht"
                    className={`grid h-7 w-7 place-items-center rounded-full transition hover:bg-white/20 ${
                      showPlaylist ? "bg-white/20" : ""
                    }`}
                  >
                    <ListMusic className="h-4 w-4" />
                  </button>
                  {showPlaylist && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl bg-[oklch(0.2_0.02_50)]/95 p-2 ring-1 ring-white/15 backdrop-blur-md">
                      <p className="px-3 pb-1.5 pt-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
                        Titelübersicht
                      </p>
                      {musicTracks.map((track, i) => (
                        <button
                          type="button"
                          key={track.src}
                          onClick={() => {
                            setTrackIndex(i);
                            setShowPlaylist(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition hover:bg-white/10 ${
                            i === trackIndex
                              ? "text-[oklch(0.85_0.09_85)]"
                              : "text-white/75"
                          }`}
                        >
                          {i === trackIndex ? (
                            <Music className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0 text-center text-[10px] tabular-nums text-white/40">
                              {i + 1}
                            </span>
                          )}
                          <span className="truncate">{track.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Diashow starten"}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[oklch(0.94_0.02_85)] ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {rememberedHint && (
        <p className="relative z-10 mt-3 flex items-center justify-center gap-1.5 text-xs text-[oklch(0.9_0.02_85)]/60 animate-fade-in">
          <Lock className="h-3 w-3" /> Auf diesem Gerät gemerkt
        </p>
      )}

      {/* Bühne */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-12">
        {items.map((item, i) => {
          // Nur Nachbarbilder im DOM halten - bei vielen Fotos sonst massiver Rendering-Aufwand
          const distance = Math.min(
            Math.abs(i - index),
            items.length - Math.abs(i - index),
          );
          if (distance > 1) return null;
          return (
          <figure
            key={item.src}
            className={`absolute transition-opacity duration-[1600ms] ease-in-out ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="wedding-frame overflow-hidden rounded-[4px]">
              {item.type === "video" ? (
                i === index ? (
                  <video
                    ref={videoRef}
                    src={item.src}
                    playsInline
                    preload="auto"
                    controls={false}
                    onEnded={() => {
                      if (playing) next();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="max-h-[62vh] w-auto max-w-[90vw] object-contain sm:max-h-[66vh]"
                  />
                ) : null
              ) : (
                <img
                  src={item.src}
                  alt={item.title}
                  loading="eager"
                  decoding="async"
                  className="max-h-[62vh] w-auto max-w-[90vw] object-contain animate-ken-burns-inout sm:max-h-[66vh]"
                  {...protectedImgProps()}
                />
              )}
            </div>
          </figure>
          );
        })}

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Vorheriges Bild"
              className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-[oklch(0.94_0.02_85)] ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/25 sm:left-6"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Nächstes Bild"
              className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-[oklch(0.94_0.02_85)] ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/25 sm:right-6"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Titel mit Herz-Ornament */}
      <div className="relative z-10 px-4 text-center sm:px-8">
        <div className="mx-auto mb-2 flex items-center justify-center gap-3 text-[oklch(0.85_0.09_85)]">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[oklch(0.85_0.09_85)]/70 sm:w-16" />
          <Heart className="h-3.5 w-3.5" fill="currentColor" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-[oklch(0.85_0.09_85)]/70 sm:w-16" />
        </div>
        <p className="wedding-caption text-2xl text-[oklch(0.96_0.015_85)] sm:text-3xl">
          Hochzeit Tanja &amp; Christopher
        </p>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.35em] text-[oklch(0.88_0.03_85)]/50">
          {index + 1} · {items.length}
        </p>
      </div>

      {/* Filmstreifen */}
      <div className="relative z-10 mt-4 flex justify-start gap-2.5 overflow-x-auto px-4 pb-6 sm:justify-center sm:px-8">
        {items.map((item, i) => (
          <button
            type="button"
            key={item.src}
            onClick={() => setIndex(i)}
            aria-label={`Bild ${i + 1}: ${item.title}`}
            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-16 ${
              i === index
                ? "border-[oklch(0.85_0.09_85)] shadow-[0_0_18px_-4px_oklch(0.85_0.09_85)] opacity-100"
                : "border-white/15 opacity-45 hover:opacity-80"
            }`}
          >
            {item.type === "video" ? (
              <span className="relative block h-full w-full">
                <video
                  src={`${item.src}#t=0.1`}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/30">
                  <Play className="h-4 w-4 text-white" fill="currentColor" />
                </span>
              </span>
            ) : (
              <img
                src={item.src}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover"
                {...protectedImgProps()}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-[0.25em] text-primary">{eyebrow}</span>
      <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
    </div>
  );
}
