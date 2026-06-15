import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Server,
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
  Activity,
  HardDrive,
  Cpu,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homelab — Personal Server & Projects" },
      {
        name: "description",
        content:
          "Mein Homelab in Wels — selbst gehostete Dienste, Projekte, Galerie und Live-Wetter.",
      },
      { property: "og:title", content: "Homelab — Personal Server & Projects" },
      {
        property: "og:description",
        content:
          "Mein Homelab in Wels — selbst gehostete Dienste, Projekte, Galerie und Live-Wetter.",
      },
    ],
  }),
  component: Home,
});

type Service = {
  name: string;
  url: string;
  description: string;
  status?: "online";
};

const services: Service[] = [
  {
    name: "Lemorium",
    url: "https://Lemorium.xsellishimbeerkuchen.com",
    description: "Mein Hauptprojekt — gehostet im Homelab.",
    status: "online",
  },
  {
    name: "Overseerr",
    url: "https://seerr.xsellishimbeerkuchen.com",
    description: "Film- & Serien-Requests für meinen Media-Stack.",
    status: "online",
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
    <div className="relative min-h-screen overflow-hidden">
      <Nav />
      <Hero />
      <main className="mx-auto max-w-6xl px-5 pb-32 sm:px-8">
        <Services />
        <Weather />
        <Gallery />
        <Footer />
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-5 py-3 glass sm:mx-8">
        <a href="#top" className="flex items-center gap-2 font-display font-semibold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary">
            <Server className="h-4 w-4" />
          </span>
          <span className="truncate">homelab.local</span>
        </a>
        <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#services" className="transition hover:text-foreground">Services</a>
          <a href="#weather" className="transition hover:text-foreground">Wetter</a>
          <a href="#gallery" className="transition hover:text-foreground">Galerie</a>
        </nav>
        <span className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          online
        </span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative mx-auto max-w-6xl px-5 pt-12 pb-20 sm:px-8 sm:pt-20">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={heroImg}
          alt=""
          className="h-full w-full object-cover opacity-30"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      </div>
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground backdrop-blur">
          <Activity className="h-3 w-3 text-primary" /> Wels · Oberösterreich
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] sm:text-7xl">
          Mein <span className="glow-text">Homelab</span>.
          <br />
          Stille Server, laute Ideen.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Eine kleine Sammlung von selbst gehosteten Diensten, Experimenten und
          Momentaufnahmen aus dem Maschinenraum.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#services"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Zu den Services
          </a>
          <a
            href="#gallery"
            className="rounded-xl border border-border/60 bg-background/40 px-5 py-3 text-sm font-medium backdrop-blur transition hover:bg-background/70"
          >
            Galerie ansehen
          </a>
        </div>
        <dl className="mt-12 grid max-w-md grid-cols-3 gap-4">
          {[
            { icon: Cpu, label: "Nodes", value: "4" },
            { icon: HardDrive, label: "Storage", value: "18TB" },
            { icon: Activity, label: "Uptime", value: "99.8%" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl px-4 py-3 glass">
              <Icon className="h-4 w-4 text-primary" />
              <dt className="mt-2 text-xs text-muted-foreground">{label}</dt>
              <dd className="font-display text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="pt-20">
      <SectionTitle eyebrow="Self-hosted" title="Meine Services" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group relative overflow-hidden rounded-2xl p-6 glass transition hover:-translate-y-1 hover:border-primary/50"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl transition group-hover:bg-primary/40" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </div>
              <ExternalLink className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <div className="mt-6 flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground">
                {s.url.replace(/^https?:\/\//, "")}
              </span>
              {s.status === "online" && (
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> live
                </span>
              )}
            </div>
          </a>
        ))}
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Mehr Services folgen…
        </div>
      </div>
    </section>
  );
}

type WeatherData = {
  temp: number;
  apparent: number;
  code: number;
  wind: number;
  isDay: boolean;
};

const WMO: Record<number, { label: string; Icon: typeof Sun }> = {
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

function Weather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.1667&longitude=14.0333&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=Europe%2FVienna",
    )
      .then((r) => r.json())
      .then((j) => {
        setData({
          temp: Math.round(j.current.temperature_2m),
          apparent: Math.round(j.current.apparent_temperature),
          code: j.current.weather_code,
          wind: Math.round(j.current.wind_speed_10m),
          isDay: j.current.is_day === 1,
        });
      })
      .catch(() => setError(true));
  }, []);

  const wmo = data ? WMO[data.code] ?? { label: "—", Icon: Cloud } : null;
  const Icon = wmo?.Icon ?? Cloud;

  return (
    <section id="weather" className="pt-20">
      <SectionTitle eyebrow="Live" title="Wetter in Wels" />
      <div className="mt-10 overflow-hidden rounded-3xl glass">
        <div className="grid gap-6 p-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-6">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary animate-float">
              <Icon className="h-10 w-10" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-6xl font-bold tabular-nums">
                  {data ? `${data.temp}°` : error ? "—" : "··"}
                </span>
                <span className="text-sm text-muted-foreground">C</span>
              </div>
              <p className="mt-1 truncate text-muted-foreground">
                {wmo?.label ?? (error ? "Wetter nicht verfügbar" : "Laden…")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:text-right">
            <Stat label="Gefühlt" value={data ? `${data.apparent}°C` : "—"} />
            <Stat
              label="Wind"
              value={data ? `${data.wind} km/h` : "—"}
              icon={<Wind className="h-3 w-3" />}
            />
          </div>
        </div>
        <div className="border-t border-border/60 bg-background/30 px-8 py-3 text-xs text-muted-foreground">
          Daten via open-meteo.com · 48.17°N 14.03°E
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 px-4 py-2">
      <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="font-display text-lg font-semibold">{value}</div>
    </div>
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
    <section id="gallery" className="pt-20">
      <SectionTitle eyebrow="Hochzeit" title="Galerie" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {gallery.map((g, i) => (
          <button
            type="button"
            key={g.title}
            onClick={() => setIndex(i)}
            className={`group relative overflow-hidden rounded-2xl glass text-left ${
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
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 text-xs font-medium opacity-0 transition group-hover:opacity-100">
              {g.title}
            </span>
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl animate-fade-in"
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
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full glass transition hover:text-primary"
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
            className="absolute right-20 top-4 grid h-11 w-11 place-items-center rounded-full glass transition hover:text-primary"
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
            className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass transition hover:text-primary"
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
            className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full glass transition hover:text-primary"
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
            <figcaption className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{gallery[index].title}</span>
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
    <footer className="mt-24 flex flex-col items-center gap-4 border-t border-border/60 pt-10 text-sm text-muted-foreground sm:flex-row sm:justify-between">
      <p>© {new Date().getFullYear()} homelab.local · gebaut mit Liebe & Strom</p>
      <div className="flex gap-3">
        <a
          href="#"
          aria-label="GitHub"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 transition hover:text-foreground"
        >
          <Github className="h-4 w-4" />
        </a>
        <a
          href="#"
          aria-label="Mail"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 transition hover:text-foreground"
        >
          <Mail className="h-4 w-4" />
        </a>
      </div>
    </footer>
  );
}
