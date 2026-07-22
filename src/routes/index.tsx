import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
};

// Verhindert Rechtsklick / Drag / Referrer-Leak auf Bildern
function protectedImgProps() {
  return {
    draggable: false as const,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    referrerPolicy: "no-referrer" as const,
  };
}

function Home() {
  return (
    <div className="relative min-h-screen">
      <Nav />
      <Hero />
      <main className="mx-auto max-w-6xl px-5 pb-32 sm:px-8">
        <Gallery />
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

function Gallery() {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [lockedForSeconds, setLockedForSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [rememberedHint, setRememberedHint] = useState(false);

  const loadGallery = useCallback(async (isInitialCheck = false) => {
    try {
      const res = await fetch("/api/gallery");
      if (res.status === 401) {
        setStatus("locked");
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
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

  return (
    <section id="gallery" className="pt-10">
      <SectionTitle eyebrow="Album" title="Familie & Hochzeit" />

      {status === "checking" && <GallerySkeleton />}

      {status === "locked" && (
        <form
          onSubmit={submitPin}
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
            disabled={lockedForSeconds > 0}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setPinError(false);
            }}
            placeholder="PIN"
            className="w-40 rounded-full border border-input bg-background px-4 py-2 text-center text-lg tracking-[0.3em] outline-none ring-primary/40 focus:ring-2 disabled:opacity-50"
          />
          {pinError && lockedForSeconds === 0 && (
            <p className="text-sm text-destructive">Falsche PIN, bitte nochmal versuchen.</p>
          )}
          {lockedForSeconds > 0 && (
            <p className="text-sm text-destructive">
              Zu viele Versuche. Bitte warte {lockedForSeconds}s.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || pin.length === 0 || lockedForSeconds > 0}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
          >
            {submitting ? "Prüfe…" : "Entsperren"}
          </button>
        </form>
      )}

      {status === "unlocked" && rememberedHint && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity animate-fade-in">
          <Lock className="h-3 w-3" /> Auf diesem Gerät gemerkt
        </p>
      )}

      {status === "unlocked" && items.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-white p-16 text-center ring-1 ring-border">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Noch keine Bilder im Galerie-Ordner am Server.
          </p>
        </div>
      )}

      {status === "unlocked" && items.length > 0 && <GalleryViewer items={items} />}
    </section>
  );
}

function GalleryViewer({ items }: { items: GalleryItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [preview, setPreview] = useState(0);

  const close = useCallback(() => {
    setIndex(null);
    setPlaying(false);
  }, []);
  const next = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % items.length)),
    [items.length],
  );
  const prev = useCallback(
    () => setIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, next, prev]);

  useEffect(() => {
    if (index === null || !playing) return;
    const id = window.setInterval(next, 3500);
    return () => window.clearInterval(id);
  }, [index, playing, next]);

  useEffect(() => {
    if (index !== null) return;
    const id = window.setInterval(
      () => setPreview((i) => (i + 1) % items.length),
      4000,
    );
    return () => window.clearInterval(id);
  }, [index, items.length]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(preview);
          setPlaying(true);
        }}
        aria-label="Galerie öffnen"
        className="group relative mt-10 block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-border transition hover:shadow-2xl sm:aspect-[16/9]"
      >
        {items.map((g, i) => (
          <img
            key={g.src}
            src={g.src}
            alt={g.title}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
              i === preview ? "opacity-100" : "opacity-0"
            }`}
            {...protectedImgProps()}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5 sm:p-7">
          <div className="text-white">
            <p className="text-[10px] uppercase tracking-[0.25em] opacity-80">
              {preview + 1} / {items.length}
            </p>
            <p className="mt-1 font-display text-lg font-semibold sm:text-2xl">
              {items[preview].title}
            </p>
          </div>
          <span className="hidden rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-foreground shadow-lg transition group-hover:bg-white sm:inline-block">
            Galerie öffnen
          </span>
        </div>
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 gap-1.5">
          {items.map((g, i) => (
            <span
              key={g.src}
              className={`h-1.5 rounded-full transition-all ${
                i === preview ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </button>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {items.map((g, i) => (
          <button
            type="button"
            key={g.src}
            onClick={() => setPreview(i)}
            onDoubleClick={() => {
              setIndex(i);
              setPlaying(true);
            }}
            aria-label={`Bild ${i + 1}: ${g.title}`}
            className={`group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lg ${
              i === preview ? "ring-2 ring-primary" : ""
            }`}
          >
            <img
              src={g.src}
              alt={g.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
              {...protectedImgProps()}
            />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-xl animate-fade-in"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={items[index].title}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Schließen"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-foreground transition hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPlaying((p) => !p);
            }}
            aria-label={playing ? "Pause" : "Slideshow starten"}
            className="absolute right-20 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-foreground transition hover:bg-white"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Vorheriges Bild"
            className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-foreground transition hover:bg-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Nächstes Bild"
            className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-foreground transition hover:bg-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <figure
            className="relative max-h-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={items[index].src}
              src={items[index].src}
              alt={items[index].title}
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl animate-scale-in"
              {...protectedImgProps()}
            />
            <figcaption className="mt-4 flex items-center justify-between gap-4 text-sm text-white/80">
              <span className="font-medium text-white">{items[index].title}</span>
              <span className="tabular-nums">
                {index + 1} / {items.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
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
