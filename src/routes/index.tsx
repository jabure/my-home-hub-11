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
  Github,
  Mail,
  Sparkles,
  Film,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  type LucideIcon,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Familienmomente — unsere Galerie" },
      {
        name: "description",
        content:
          "Eine warme Sammlung unserer schönsten Familien- und Hochzeitsbilder, mit Live-Wetter aus Wels.",
      },
      { property: "og:title", content: "Familienmomente — unsere Galerie" },
      {
        property: "og:description",
        content:
          "Eine warme Sammlung unserer schönsten Familien- und Hochzeitsbilder, mit Live-Wetter aus Wels.",
      },
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
    name: "Lemorium",
    url: "https://Lemorium.xsellishimbeerkuchen.com",
    description: "Unsere Hauptseite",
    icon: Sparkles,
  },
  {
    name: "Overseerr",
    url: "https://seerr.xsellishimbeerkuchen.com",
    description: "Film- & Serien-Wünsche",
    icon: Film,
  },
];

const gallery = [
  { src: g1, title: "Trauung" },
  { src: g2, title: "Brautpaar" },
  { src: g3, title: "Feier" },
  { src: g4, title: "Erinnerung" },
];

function Home() {
  return (
    <div className="relative min-h-screen">
      <Nav />
      <Hero />
      <main className="mx-auto max-w-6xl px-5 pb-32 sm:px-8">
        <Gallery />
        <Footer />
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-full px-5 py-2.5 glass sm:mx-8">
        <a href="#top" className="flex items-center gap-2 font-display font-semibold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <Heart className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="truncate">unsere Erinnerungen</span>
        </a>
        <QuickDock />
      </div>
    </header>
  );
}

function QuickDock() {
  return (
    <div className="flex items-center gap-1.5">
      <WeatherButton />
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
      {services.map((s) => (
        <ServiceButton key={s.name} service={s} />
      ))}
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
        className="grid h-10 w-10 place-items-center rounded-full bg-white/60 text-foreground/70 ring-1 ring-border transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-lg"
      >
        <Icon className="h-4 w-4" />
      </a>
      <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 origin-top-right scale-95 rounded-2xl p-3 opacity-0 transition-all duration-200 glass group-hover:scale-100 group-hover:opacity-100">
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

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.1667&longitude=14.0333&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe%2FVienna",
    )
      .then((r) => r.json())
      .then((j) => {
        setData({
          temp: Math.round(j.current.temperature_2m),
          apparent: Math.round(j.current.apparent_temperature),
          code: j.current.weather_code,
          wind: Math.round(j.current.wind_speed_10m),
        });
      })
      .catch(() => setError(true));
  }, []);

  const wmo = data ? WMO[data.code] ?? { label: "—", Icon: Cloud } : null;
  const Icon = wmo?.Icon ?? Cloud;

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label="Wetter in Wels"
        className="flex h-10 items-center gap-1.5 rounded-full bg-white/60 px-3 text-sm font-medium text-foreground/80 ring-1 ring-border transition hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-lg"
      >
        <Icon className="h-4 w-4" />
        <span className="tabular-nums">
          {data ? `${data.temp}°` : error ? "—" : "··"}
        </span>
      </button>
      <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 origin-top-right scale-95 rounded-2xl p-4 opacity-0 transition-all duration-200 glass group-hover:scale-100 group-hover:opacity-100">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {data ? `${data.temp}°C` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {wmo?.label ?? (error ? "nicht verfügbar" : "lädt…")}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/60 px-3 py-2 ring-1 ring-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Gefühlt
            </p>
            <p className="font-display font-semibold">
              {data ? `${data.apparent}°` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-white/60 px-3 py-2 ring-1 ring-border">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Wind className="h-3 w-3" /> Wind
            </p>
            <p className="font-display font-semibold">
              {data ? `${data.wind} km/h` : "—"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Wels · open-meteo.com
        </p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section id="top" className="relative mx-auto max-w-6xl px-5 pt-12 pb-16 sm:px-8 sm:pt-20">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImg}
          alt=""
          className="h-full w-full object-cover opacity-25"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
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

function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const close = useCallback(() => {
    setIndex(null);
    setPlaying(false);
  }, []);
  const next = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % gallery.length)),
    [],
  );
  const prev = useCallback(
    () =>
      setIndex((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length)),
    [],
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

  return (
    <section id="gallery" className="pt-10">
      <SectionTitle eyebrow="Album" title="Familie & Hochzeit" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {gallery.map((g, i) => (
          <button
            type="button"
            key={g.title}
            onClick={() => setIndex(i)}
            className={`group relative overflow-hidden rounded-3xl bg-white text-left shadow-md ring-1 ring-border transition hover:-translate-y-1 hover:shadow-xl ${
              i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-[4/5]" : "aspect-square"
            }`}
          >
            <img
              src={g.src}
              alt={g.title}
              loading="lazy"
              width={1024}
              height={1024}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
              {g.title}
            </span>
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-xl animate-fade-in"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={gallery[index].title}
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
              key={gallery[index].src}
              src={gallery[index].src}
              alt={gallery[index].title}
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl animate-scale-in"
            />
            <figcaption className="mt-4 flex items-center justify-between gap-4 text-sm text-white/80">
              <span className="font-medium text-white">{gallery[index].title}</span>
              <span className="tabular-nums">
                {index + 1} / {gallery.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
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

function Footer() {
  return (
    <footer className="mt-24 flex flex-col items-center gap-4 border-t border-border pt-10 text-sm text-muted-foreground sm:flex-row sm:justify-between">
      <p>© {new Date().getFullYear()} unsere Erinnerungen · mit Liebe gemacht</p>
      <div className="flex gap-3">
        <a
          href="#"
          aria-label="GitHub"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/70 ring-1 ring-border transition hover:text-primary"
        >
          <Github className="h-4 w-4" />
        </a>
        <a
          href="#"
          aria-label="Mail"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/70 ring-1 ring-border transition hover:text-primary"
        >
          <Mail className="h-4 w-4" />
        </a>
      </div>
    </footer>
  );
}
