import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
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
  LayoutGrid,
  Upload,
  Loader2,
  Maximize,
  Minimize,
  LogOut,
  Check,
} from "lucide-react";

export type GalleryItem = {
  src: string;
  title: string;
  type: "image" | "video";
  album?: "gaeste";
};

export type MusicTrack = {
  src: string;
  title: string;
};

// Angepasste Bildgröße vom Server anfordern (Original bleibt geschützt auf dem Server)
export function sizedSrc(src: string, size: "display" | "thumb") {
  return `${src}?size=${size}`;
}

// Verhindert Rechtsklick / Drag / Referrer-Leak auf Bildern
export function protectedImgProps() {
  return {
    draggable: false as const,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    referrerPolicy: "no-referrer" as const,
  };
}

const SLIDE_DURATION_MS = 7000;
const SWIPE_THRESHOLD_PX = 50;

// Einheitliche Optik für die runden Bedienknöpfe
const ICON_BTN =
  "grid h-10 w-10 place-items-center rounded-full bg-white/10 text-ivory ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-gold";

function formatDate(iso: string | null | undefined): string | null {
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

// Einzelansicht (Lightbox) für Videos und Gästefotos, mit Blättern innerhalb der Liste
type Viewer = { list: GalleryItem[]; index: number };

export function GalleryExperience({
  items,
  rememberedHint,
  musicTracks,
  coupleNames = "Tanja & Christopher",
  weddingDate = null,
  onExit,
  onRefresh,
  frameMode = false,
}: {
  items: GalleryItem[];
  rememberedHint: boolean;
  musicTracks: MusicTrack[];
  coupleNames?: string;
  weddingDate?: string | null;
  onExit: () => void;
  onRefresh?: () => void;
  frameMode?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(frameMode);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const [volume, setVolume] = useState(0.25);
  const [trackIndex, setTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const failedTracksRef = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Listen ---
  // Gästefotos laufen nicht automatisch in der Diashow mit - eigenes Album, eigener Abschnitt.
  // Videos laufen ebenfalls nicht automatisch - nur Bilder rotieren in der Diashow.
  const mainItems = useMemo(() => items.filter((item) => item.album !== "gaeste"), [items]);
  const slideshowItems = useMemo(
    () => mainItems.filter((item) => item.type === "image"),
    [mainItems],
  );
  const mainVideos = useMemo(() => mainItems.filter((item) => item.type === "video"), [mainItems]);
  const guestItems = useMemo(() => items.filter((item) => item.album === "gaeste"), [items]);

  const slideCount = slideshowItems.length;
  const hasSlideshow = slideCount > 0;
  const current = slideshowItems[index] ?? slideshowItems[0];
  const viewing = viewer ? viewer.list[viewer.index] : null;
  const viewerOpen = viewing != null;
  const videoOpen = viewing?.type === "video";
  const dateLabel = formatDate(weddingDate);

  // Index gültig halten, falls sich die Liste ändert (z. B. nach Neuladen)
  useEffect(() => {
    if (index >= slideCount && slideCount > 0) setIndex(0);
  }, [index, slideCount]);

  const next = useCallback(() => {
    setIndex((i) => (slideCount > 0 ? (i + 1) % slideCount : 0));
  }, [slideCount]);
  const prev = useCallback(() => {
    setIndex((i) => (slideCount > 0 ? (i - 1 + slideCount) % slideCount : 0));
  }, [slideCount]);

  const openViewer = useCallback((list: GalleryItem[], item: GalleryItem) => {
    const i = list.findIndex((x) => x.src === item.src);
    setViewer({ list, index: Math.max(0, i) });
    setShowOverview(false);
  }, []);
  const closeViewer = useCallback(() => setViewer(null), []);
  const stepViewer = useCallback((dir: 1 | -1) => {
    setViewer((v) =>
      v && v.list.length > 1 ? { ...v, index: (v.index + dir + v.list.length) % v.list.length } : v,
    );
  }, []);

  // --- Vollbild ---
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  // Im Vollbild: nur das Bild zeigen, Bedienelemente bei Inaktivität ausblenden
  // (bei Maus-/Touch-Aktivität kurz wieder einblenden)
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeHideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!isFullscreen) {
      setChromeVisible(true);
      return;
    }
    const resetTimer = () => {
      setChromeVisible(true);
      if (chromeHideTimer.current !== null) window.clearTimeout(chromeHideTimer.current);
      chromeHideTimer.current = window.setTimeout(() => setChromeVisible(false), 3000);
    };
    resetTimer();
    const el = containerRef.current;
    el?.addEventListener("mousemove", resetTimer);
    el?.addEventListener("touchstart", resetTimer);
    el?.addEventListener("click", resetTimer);
    return () => {
      if (chromeHideTimer.current !== null) window.clearTimeout(chromeHideTimer.current);
      el?.removeEventListener("mousemove", resetTimer);
      el?.removeEventListener("touchstart", resetTimer);
      el?.removeEventListener("click", resetTimer);
    };
  }, [isFullscreen]);

  // Übersicht und Einzelansicht haben eigene Bedienelemente -> Kopfzeile dafür nicht ausblenden
  const showChrome = chromeVisible || showOverview || viewerOpen;

  // --- Diashow läuft automatisch durch (pausiert, solange Übersicht oder Einzelansicht offen ist) ---
  useEffect(() => {
    if (!playing || slideCount <= 1 || viewerOpen || showOverview) return;
    const id = window.setInterval(next, SLIDE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [playing, next, slideCount, viewerOpen, showOverview]);

  // Geöffnetes Video: von vorn starten und abspielen
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoOpen) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, [viewing, videoOpen]);

  // Aktives Vorschaubild im Filmstreifen in die Mitte scrollen
  useEffect(() => {
    const strip = filmstripRef.current;
    if (!strip || !current) return;
    const el = strip.querySelector<HTMLElement>(`[data-src="${CSS.escape(current.src)}"]`);
    if (!el) return;
    const target = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
    strip.scrollTo({ left: target, behavior: "smooth" });
  }, [current]);

  // --- Tastatursteuerung ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (viewerOpen) {
        if (e.key === "Escape") closeViewer();
        else if (e.key === "ArrowRight") stepViewer(1);
        else if (e.key === "ArrowLeft") stepViewer(-1);
        return;
      }
      if (showOverview) {
        if (e.key === "Escape") setShowOverview(false);
        return;
      }
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "Escape" && !document.fullscreenElement && !frameMode) {
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit, showOverview, viewerOpen, closeViewer, stepViewer, frameMode]);

  // --- Wischgesten (Handy/Tablet) ---
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (onLeft: () => void, onRight: () => void) => (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onLeft();
    else onRight();
  };

  // --- Hintergrundmusik ---
  const hasMusic = musicTracks.length > 0 && !audioFailed;
  const currentTrack = musicTracks[trackIndex] ?? null;

  const nextTrack = useCallback(() => {
    if (musicTracks.length <= 1) return;
    setTrackIndex((i) => (i + 1) % musicTracks.length);
  }, [musicTracks.length]);

  // Sanftes Ein-/Ausblenden der Musik (statt hartem Stopp beim Video)
  const fadeTo = useCallback((target: number, onDone?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRafRef.current !== null) cancelAnimationFrame(fadeRafRef.current);
    const start = audio.volume;
    const t0 = performance.now();
    const duration = 1400;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * k));
      if (k < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        fadeRafRef.current = null;
        onDone?.();
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(
    () => () => {
      if (fadeRafRef.current !== null) cancelAnimationFrame(fadeRafRef.current);
    },
    [],
  );

  // Spielt automatisch, blendet bei Videos sanft aus und danach wieder ein
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasMusic) return;
    if (videoOpen || !playing) {
      fadeTo(0, () => audio.pause());
      return;
    }
    if (audio.paused) audio.volume = 0;
    audio
      .play()
      .then(() => {
        setMusicBlocked(false);
        failedTracksRef.current = 0;
        fadeTo(volume);
      })
      .catch(() => {
        // Browser blockiert Autoplay ohne Nutzer-Geste -> Hinweis zeigen
        setMusicBlocked(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMusic, videoOpen, playing, trackIndex, fadeTo]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (fadeRafRef.current === null) audio.volume = volume;
  }, [muted, volume]);

  const startMusicManually = useCallback(() => {
    audioRef.current
      ?.play()
      .then(() => setMusicBlocked(false))
      .catch(() => {});
  }, []);

  // --- Gäste-Upload mit Rückmeldung ---
  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      try {
        const form = new FormData();
        for (const file of Array.from(fileList)) form.append("files", file);
        const res = await fetch("/api/gallery-upload", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          const saved = Number(data.saved ?? 0);
          const rejected: string[] = Array.isArray(data.rejected) ? data.rejected : [];
          showToast(
            saved > 0
              ? `Danke! ${saved} ${saved === 1 ? "Datei" : "Dateien"} hochgeladen${
                  rejected.length > 0 ? ` – ${rejected.length} übersprungen` : ""
                }.`
              : "Keine passende Datei dabei (Fotos/Videos bis 50 MB).",
          );
          onRefresh?.();
        } else {
          showToast("Upload hat nicht geklappt. Bitte nochmal versuchen.");
        }
      } catch {
        showToast("Upload hat nicht geklappt. Bitte nochmal versuchen.");
      } finally {
        setUploading(false);
      }
    },
    [onRefresh, showToast],
  );

  // --- Leerer Zustand ---
  if (items.length === 0) {
    return (
      <div className="wedding-stage fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center text-ivory">
        <ImageOff className="h-10 w-10 text-gold/70" />
        <p className="wedding-caption text-2xl">Hier entstehen bald unsere Erinnerungen</p>
        <p className="max-w-sm text-sm text-ivory/55">
          Im Galerie-Ordner am Server liegen noch keine Fotos oder Videos.
        </p>
        {!frameMode && (
          <button
            type="button"
            onClick={onExit}
            className="mt-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
          >
            Abmelden
          </button>
        )}
      </div>
    );
  }

  const fade = (visible: boolean) =>
    `transition-opacity duration-500 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`;

  return (
    <div
      ref={containerRef}
      className="wedding-stage fixed inset-0 z-40 flex flex-col overflow-hidden text-ivory animate-gallery-in"
    >
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
      {current && (
        <img
          key={`bg-${current.src}`}
          src={sizedSrc(current.src, "thumb")}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl animate-fade-in"
          {...protectedImgProps()}
        />
      )}
      {/* Warmer Champagner-Schleier + Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[oklch(0.22_0.02_50)]/60" />
      <div className="pointer-events-none absolute inset-0 wedding-vignette" />
      <div className="grain absolute inset-0 z-[1]" />

      {/* Fortschrittsbalken bis zum nächsten Bild */}
      {playing && !viewerOpen && !showOverview && slideCount > 1 && (
        <div
          className={`absolute left-0 right-0 top-0 z-30 h-[2px] bg-white/10 ${fade(showChrome)}`}
        >
          <div
            key={index}
            className="h-full bg-gradient-to-r from-gold to-[oklch(0.78_0.1_50)]"
            style={{ animation: `gallery-progress ${SLIDE_DURATION_MS}ms linear forwards` }}
          />
        </div>
      )}

      {/* Kopfzeile */}
      <header
        className={`relative z-30 flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6 ${fade(showChrome)}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {!frameMode && (
            <button
              type="button"
              onClick={onExit}
              aria-label="Abmelden"
              title="Abmelden"
              className={ICON_BTN}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
          {/* Namen nur in der Übersicht, in der Diashow stehen sie schon unter dem Foto */}
          <div className={`min-w-0 animate-fade-in ${showOverview ? "hidden sm:block" : "hidden"}`}>
            <p className="gold-foil truncate font-serif text-2xl italic leading-tight">
              {coupleNames}
            </p>
            {dateLabel && (
              <p className="small-caps font-serif text-sm text-ivory/55">{dateLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasMusic && (
            <div className="relative flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-3.5 pr-1 ring-1 ring-white/15 backdrop-blur-md">
              <Music className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span
                className="hidden max-w-36 truncate text-xs text-ivory/85 md:inline"
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
                className="mx-1 hidden w-20 accent-gold sm:block"
              />
              <button
                type="button"
                onClick={() => (musicBlocked ? startMusicManually() : setMuted((m) => !m))}
                aria-label={musicBlocked ? "Musik starten" : muted ? "Musik an" : "Musik aus"}
                className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/20"
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
                    className="hidden h-8 w-8 place-items-center rounded-full transition hover:bg-white/20 sm:grid"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlaylist((s) => !s)}
                    aria-label="Titelübersicht"
                    aria-expanded={showPlaylist}
                    className={`grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/20 ${
                      showPlaylist ? "bg-white/20" : ""
                    }`}
                  >
                    <ListMusic className="h-4 w-4" />
                  </button>
                  {showPlaylist && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl bg-[oklch(0.2_0.02_50)]/95 p-2 ring-1 ring-white/15 backdrop-blur-md animate-fade-in">
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
                            i === trackIndex ? "text-gold" : "text-white/75"
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
            onClick={() => setShowOverview((s) => !s)}
            aria-label="Alle Fotos"
            title="Alle Fotos"
            aria-pressed={showOverview}
            className={`${ICON_BTN} ${showOverview ? "bg-white/25" : ""}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Diashow pausieren" : "Diashow starten"}
            title={playing ? "Pause" : "Abspielen"}
            className={ICON_BTN}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
            title={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
            className={`${ICON_BTN} hidden sm:grid`}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {rememberedHint && !frameMode && (
        <p className="relative z-10 mt-3 flex items-center justify-center gap-1.5 text-xs text-ivory/55 animate-fade-in">
          <Lock className="h-3 w-3" /> Auf diesem Gerät gemerkt
        </p>
      )}

      {/* Bühne */}
      <div
        className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-3 py-4 sm:px-16"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd(next, prev)}
      >
        {!hasSlideshow && (
          <div className="flex flex-col items-center gap-3 text-center text-ivory/60">
            <ImageOff className="h-8 w-8 opacity-50" />
            <p className="text-sm">Noch keine Fotos im Hauptalbum.</p>
          </div>
        )}
        {slideshowItems.map((item, i) => {
          // Nur Nachbarbilder im DOM halten - bei vielen Fotos sonst massiver Rendering-Aufwand
          const distance = Math.min(Math.abs(i - index), slideCount - Math.abs(i - index));
          if (distance > 1) return null;
          return (
            <figure
              key={item.src}
              aria-hidden={i !== index}
              className={`absolute transition-[opacity,transform] duration-[1800ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                i === index
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-[1.025] opacity-0"
              }`}
            >
              <div className="wedding-frame rounded-[3px]">
                {/* Eigenes "Fenster": der Zoom bleibt innen, Passepartout und Goldlinie stehen still */}
                <div className="frame-window overflow-hidden">
                  <img
                    src={sizedSrc(item.src, "display")}
                    alt={item.title}
                    loading="eager"
                    decoding="async"
                    className="block max-h-[60vh] w-auto max-w-[calc(92vw-28px)] object-contain animate-ken-burns-inout sm:max-h-[64vh]"
                    {...protectedImgProps()}
                  />
                </div>
              </div>
            </figure>
          );
        })}

        {slideCount > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Vorheriges Foto"
              className={`absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-ivory ring-1 ring-white/15 backdrop-blur-md hover:bg-white/25 sm:left-6 sm:grid ${fade(showChrome)}`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Nächstes Foto"
              className={`absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-ivory ring-1 ring-white/15 backdrop-blur-md hover:bg-white/25 sm:right-6 sm:grid ${fade(showChrome)}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Bildunterschrift mit Herz-Ornament */}
      {hasSlideshow && (
        <div className={`relative z-10 px-4 text-center sm:px-8 ${fade(showChrome)}`}>
          <div className="mx-auto mb-2 flex items-center justify-center gap-3 text-gold">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/70 sm:w-16" />
            <Heart className="h-3 w-3" fill="currentColor" />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/70 sm:w-16" />
          </div>
          <p className="wedding-caption gold-foil pb-1 text-3xl sm:text-4xl">{coupleNames}</p>
          {dateLabel && (
            <p className="small-caps font-serif text-base text-ivory/60">{dateLabel}</p>
          )}
          <p className="mt-0.5 font-serif text-sm italic text-ivory/40 tabular-nums">
            Foto {index + 1} von {slideCount}
          </p>
        </div>
      )}

      {/* Filmstreifen */}
      {mainItems.length > 1 && (
        <div
          ref={filmstripRef}
          className={`thin-scrollbar relative z-10 mt-4 flex gap-2 overflow-x-auto scroll-px-4 px-4 pb-5 pt-1 sm:px-8 ${
            mainItems.length <= 12 ? "sm:justify-center" : ""
          } ${fade(showChrome)}`}
        >
          {mainItems.map((item) => {
            const active = item.type === "image" && current?.src === item.src;
            return (
              <button
                type="button"
                key={item.src}
                data-src={item.src}
                onClick={() => {
                  if (item.type === "video") {
                    openViewer(mainVideos, item);
                  } else {
                    const imgIndex = slideshowItems.findIndex((s) => s.src === item.src);
                    if (imgIndex >= 0) setIndex(imgIndex);
                  }
                }}
                aria-label={item.type === "video" ? `Video abspielen: ${item.title}` : item.title}
                aria-current={active ? "true" : undefined}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg transition sm:h-16 sm:w-16 ${
                  active
                    ? "opacity-100 ring-2 ring-gold shadow-[0_0_18px_-4px_var(--gold)]"
                    : "opacity-45 ring-1 ring-white/15 hover:opacity-85"
                }`}
              >
                {item.type === "video" ? (
                  <VideoThumb src={item.src} small />
                ) : (
                  <img
                    src={sizedSrc(item.src, "thumb")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    {...protectedImgProps()}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
      {mainItems.length <= 1 && <div className="h-6" />}

      {/* Übersicht: alle Fotos als Raster, Videos und Gästefotos als eigene Abschnitte */}
      {showOverview && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-[oklch(0.15_0.015_40)]/96 backdrop-blur-md animate-fade-in">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-8">
            <OverviewHeading title="Fotos" count={slideCount} />
            {hasSlideshow ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2.5 lg:grid-cols-6">
                {slideshowItems.map((item, i) => (
                  <button
                    type="button"
                    key={item.src}
                    onClick={() => {
                      setIndex(i);
                      setShowOverview(false);
                    }}
                    aria-label={`Foto anzeigen: ${item.title}`}
                    className={`group aspect-square overflow-hidden rounded-lg transition ${
                      i === index ? "ring-2 ring-gold" : "ring-1 ring-white/10 hover:ring-white/35"
                    }`}
                  >
                    <img
                      src={sizedSrc(item.src, "thumb")}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      {...protectedImgProps()}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ivory/45">Noch keine Fotos im Hauptalbum.</p>
            )}

            {mainVideos.length > 0 && (
              <>
                <OverviewHeading title="Videos" count={mainVideos.length} spaced />
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {mainVideos.map((item) => (
                    <button
                      type="button"
                      key={item.src}
                      onClick={() => openViewer(mainVideos, item)}
                      aria-label={`Video abspielen: ${item.title}`}
                      className="group overflow-hidden rounded-lg text-left ring-1 ring-white/10 transition hover:ring-white/35"
                    >
                      <span className="relative block aspect-video">
                        <VideoThumb src={item.src} />
                      </span>
                      <span className="block truncate bg-white/5 px-3 py-2 text-xs text-ivory/80">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mb-4 mt-12 flex flex-wrap items-end justify-between gap-3">
              <OverviewHeading title="Gästefotos" count={guestItems.length} inline />
              {!frameMode && (
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-medium text-[oklch(0.2_0.02_50)] transition hover:bg-[oklch(0.88_0.08_84)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Lädt hoch…" : "Eigene Fotos hochladen"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {guestItems.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2.5 lg:grid-cols-6">
                {guestItems.map((item) => (
                  <button
                    type="button"
                    key={item.src}
                    onClick={() => openViewer(guestItems, item)}
                    aria-label={`Anzeigen: ${item.title}`}
                    className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-white/35"
                  >
                    {item.type === "video" ? (
                      <VideoThumb src={item.src} small />
                    ) : (
                      <img
                        src={sizedSrc(item.src, "thumb")}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        {...protectedImgProps()}
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-ivory/50">
                Noch keine Gästefotos – ladet gern eure schönsten Momente hoch!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Einzelansicht: Videos und Gästefotos (öffnet sich nur nach Klick) */}
      {viewing && viewer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewing.title}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 px-4 backdrop-blur-sm animate-fade-in"
          onTouchStart={viewing.type === "image" ? onTouchStart : undefined}
          onTouchEnd={
            viewing.type === "image"
              ? onTouchEnd(
                  () => stepViewer(1),
                  () => stepViewer(-1),
                )
              : undefined
          }
        >
          <button
            type="button"
            onClick={closeViewer}
            aria-label="Schließen"
            className={`absolute right-4 top-4 z-10 sm:right-8 sm:top-6 ${ICON_BTN}`}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="wedding-frame overflow-hidden rounded-[3px]">
            {viewing.type === "video" ? (
              <video
                key={viewing.src}
                ref={videoRef}
                src={viewing.src}
                playsInline
                preload="auto"
                controls
                controlsList="nodownload noremoteplayback"
                onEnded={() => (viewer.list.length > 1 ? stepViewer(1) : closeViewer())}
                onContextMenu={(e) => e.preventDefault()}
                className="max-h-[70vh] w-auto max-w-[90vw] object-contain"
              />
            ) : (
              <img
                key={viewing.src}
                src={sizedSrc(viewing.src, "display")}
                alt={viewing.title}
                decoding="async"
                className="max-h-[72vh] w-auto max-w-[90vw] object-contain animate-fade-in"
                {...protectedImgProps()}
              />
            )}
          </div>
          <p className="wedding-caption mt-5 max-w-[90vw] truncate text-xl">{viewing.title}</p>
          {viewer.list.length > 1 && (
            <>
              <p className="mt-1 font-serif text-sm italic text-ivory/45 tabular-nums">
                {viewer.index + 1} von {viewer.list.length}
              </p>
              <button
                type="button"
                onClick={() => stepViewer(-1)}
                aria-label="Vorheriges"
                className={`absolute left-2 top-1/2 -translate-y-1/2 sm:left-6 ${ICON_BTN} h-12 w-12`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => stepViewer(1)}
                aria-label="Nächstes"
                className={`absolute right-2 top-1/2 -translate-y-1/2 sm:right-6 ${ICON_BTN} h-12 w-12`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Rückmeldung nach dem Upload */}
      {toast && (
        <div
          role="status"
          className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[oklch(0.24_0.02_50)]/95 px-5 py-2.5 text-sm text-ivory shadow-2xl ring-1 ring-gold/40 animate-fade-in"
        >
          <Check className="h-4 w-4 text-gold" />
          {toast}
        </div>
      )}
    </div>
  );
}

function OverviewHeading({
  title,
  count,
  spaced = false,
  inline = false,
}: {
  title: string;
  count: number;
  spaced?: boolean;
  inline?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-3 ${inline ? "" : "mb-4"} ${spaced ? "mt-12" : ""}`}>
      <h2 className="gold-foil pb-1 font-serif text-4xl italic">{title}</h2>
      <span className="font-serif text-lg italic text-ivory/45 tabular-nums">{count}</span>
    </div>
  );
}

function VideoThumb({ src, small = false }: { src: string; small?: boolean }) {
  return (
    <span className="relative block h-full w-full bg-black/40">
      <video
        src={`${src}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        tabIndex={-1}
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/15">
        <span
          className={`grid place-items-center rounded-full bg-white/90 ${small ? "h-6 w-6" : "h-10 w-10"}`}
        >
          <Play
            className={`ml-0.5 text-black ${small ? "h-3 w-3" : "h-4 w-4"}`}
            fill="currentColor"
          />
        </span>
      </span>
    </span>
  );
}
