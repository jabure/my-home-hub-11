import { useCallback, useEffect, useRef, useState } from "react";
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

const SLIDE_DURATION_MS = 7000;

export function GalleryExperience({
  items,
  rememberedHint,
  musicTracks,
  onExit,
  onRefresh,
  frameMode = false,
}: {
  items: GalleryItem[];
  rememberedHint: boolean;
  musicTracks: MusicTrack[];
  onExit: () => void;
  onRefresh?: () => void;
  frameMode?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(frameMode);
  const [uploading, setUploading] = useState(false);
  const fadeRafRef = useRef<number | null>(null);
  const [volume, setVolume] = useState(0.25);
  const [trackIndex, setTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
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

  const slideshowLength = items.filter((item) => item.album !== "gaeste").length;
  const next = useCallback(() => {
    setIndex((i) => (slideshowLength > 0 ? (i + 1) % slideshowLength : 0));
  }, [slideshowLength]);
  const prev = useCallback(() => {
    setIndex((i) => (slideshowLength > 0 ? (i - 1 + slideshowLength) % slideshowLength : 0));
  }, [slideshowLength]);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Gästefotos laufen nicht automatisch in der Diashow mit - eigenes Album, eigener Abschnitt
  const mainItems = items.filter((item) => item.album !== "gaeste");
  // Videos laufen NICHT automatisch in der Diashow - nur Bilder rotieren automatisch;
  // ein Video wird ausschließlich per Klick geöffnet (siehe viewingVideo unten).
  const slideshowItems = mainItems.filter((item) => item.type === "image");
  const current = slideshowItems[index];
  const hasSlideshow = slideshowItems.length > 0;

  const [viewingVideo, setViewingVideo] = useState<GalleryItem | null>(null);
  const videoOpen = viewingVideo !== null;

  // Diashow läuft automatisch durch - pausiert, solange ein Video per Klick geöffnet ist
  useEffect(() => {
    if (!playing || slideshowItems.length <= 1 || videoOpen) return;
    const id = window.setInterval(next, SLIDE_DURATION_MS);
    return () => window.clearInterval(id);
  }, [playing, next, slideshowItems.length, videoOpen]);

  // Angeklicktes Video: von vorn starten und abspielen
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !viewingVideo) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, [viewingVideo]);

  // Tastatursteuerung
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (videoOpen) {
        if (e.key === "Escape") setViewingVideo(null);
        return;
      }
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "Escape") {
        if (showOverview) setShowOverview(false);
        else onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit, showOverview, videoOpen]);

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

  // Hintergrundmusik: spielt automatisch, blendet bei Videos sanft aus und danach wieder ein
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

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      try {
        const form = new FormData();
        for (const file of Array.from(fileList)) form.append("files", file);
        const res = await fetch("/api/gallery-upload", { method: "POST", body: form });
        if (res.ok) onRefresh?.();
      } catch {
        // Upload fehlgeschlagen -> keine Änderung
      } finally {
        setUploading(false);
      }
    },
    [onRefresh],
  );

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
          src={sizedSrc(current.src, "thumb")}
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
      {playing && !videoOpen && slideshowItems.length > 1 && (
        <div className="absolute left-0 right-0 top-0 z-10 h-[3px] bg-white/10">
          <div
            key={index}
            className="h-full bg-gradient-to-r from-[oklch(0.85_0.09_85)] to-[oklch(0.78_0.1_50)]"
            style={{ animation: `gallery-progress ${SLIDE_DURATION_MS}ms linear forwards` }}
          />
        </div>
      )}

      {/* Kopfzeile */}
      <div className="relative z-30 flex items-center justify-between gap-3 px-4 pt-5 sm:px-8">
        {frameMode ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[oklch(0.94_0.02_85)] ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" /> Verlassen
          </button>
        )}

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
                            i === trackIndex ? "text-[oklch(0.85_0.09_85)]" : "text-white/75"
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
            aria-label="Bilderübersicht"
            className={`grid h-9 w-9 place-items-center rounded-full ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 ${
              showOverview ? "bg-white/25 text-white" : "bg-white/10 text-[oklch(0.94_0.02_85)]"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
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

      {rememberedHint && !frameMode && (
        <p className="relative z-10 mt-3 flex items-center justify-center gap-1.5 text-xs text-[oklch(0.9_0.02_85)]/60 animate-fade-in">
          <Lock className="h-3 w-3" /> Auf diesem Gerät gemerkt
        </p>
      )}

      {/* Bühne */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-hidden px-4 py-4 sm:px-12">
        {!hasSlideshow && (
          <div className="flex flex-col items-center gap-3 text-center text-white/60">
            <ImageOff className="h-8 w-8 opacity-50" />
            <p className="text-sm">Noch keine Bilder im Hauptalbum.</p>
          </div>
        )}
        {slideshowItems.map((item, i) => {
          // Nur Nachbarbilder im DOM halten - bei vielen Fotos sonst massiver Rendering-Aufwand
          const distance = Math.min(
            Math.abs(i - index),
            slideshowItems.length - Math.abs(i - index),
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
                <img
                  src={sizedSrc(item.src, "display")}
                  alt={item.title}
                  loading="eager"
                  decoding="async"
                  className="max-h-[62vh] w-auto max-w-[90vw] object-contain animate-ken-burns-inout sm:max-h-[66vh]"
                  {...protectedImgProps()}
                />
              </div>
            </figure>
          );
        })}

        {!videoOpen && slideshowItems.length > 1 && (
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

      {/* Video-Ansicht: öffnet sich nur nach Klick, läuft nie automatisch in der Diashow mit */}
      {viewingVideo && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 px-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setViewingVideo(null)}
            aria-label="Video schließen"
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20 sm:right-8 sm:top-8"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="wedding-frame overflow-hidden rounded-[4px]">
            <video
              ref={videoRef}
              src={viewingVideo.src}
              playsInline
              preload="auto"
              controls
              controlsList="nodownload noremoteplayback"
              onEnded={() => setViewingVideo(null)}
              onContextMenu={(e) => e.preventDefault()}
              className="max-h-[62vh] w-auto max-w-[90vw] object-contain sm:max-h-[66vh]"
            />
          </div>
          <p className="wedding-caption mt-5 text-xl text-[oklch(0.96_0.015_85)]">
            {viewingVideo.title}
          </p>
        </div>
      )}

      {/* Titel mit Herz-Ornament */}
      {hasSlideshow && (
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
            {index + 1} · {slideshowItems.length}
          </p>
        </div>
      )}

      {/* Übersicht: alle Bilder als Raster, Videos als eigener Abschnitt */}
      {showOverview && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-[oklch(0.16_0.015_40)]/95 backdrop-blur-md">
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-8">
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[oklch(0.85_0.09_85)]">
              Bilder
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
              {slideshowItems.map((item, i) => (
                <button
                  type="button"
                  key={item.src}
                  onClick={() => {
                    setIndex(i);
                    setShowOverview(false);
                  }}
                  aria-label={`Bild anzeigen: ${item.title}`}
                  className={`group aspect-square overflow-hidden rounded-xl border transition hover:-translate-y-0.5 ${
                    i === index
                      ? "border-[oklch(0.85_0.09_85)] shadow-[0_0_18px_-4px_oklch(0.85_0.09_85)]"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <img
                    src={sizedSrc(item.src, "thumb")}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    {...protectedImgProps()}
                  />
                </button>
              ))}
            </div>

            {mainItems.some((item) => item.type === "video") && (
              <>
                <p className="mb-3 mt-10 text-[10px] uppercase tracking-[0.3em] text-[oklch(0.85_0.09_85)]">
                  Videos
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {mainItems
                    .filter((item) => item.type === "video")
                    .map((item) => (
                      <button
                        type="button"
                        key={item.src}
                        onClick={() => {
                          setViewingVideo(item);
                          setShowOverview(false);
                        }}
                        aria-label={`Video abspielen: ${item.title}`}
                        className="group overflow-hidden rounded-xl border border-white/10 text-left transition hover:-translate-y-0.5 hover:border-white/30"
                      >
                        <span className="relative block aspect-video bg-black/40">
                          <video
                            src={`${item.src}#t=0.1`}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/15">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/90">
                              <Play className="ml-0.5 h-4 w-4 text-black" fill="currentColor" />
                            </span>
                          </span>
                        </span>
                        <span className="block truncate px-3 py-2 text-xs text-white/80">
                          {item.title}
                        </span>
                      </button>
                    ))}
                </div>
              </>
            )}

            <div className="mb-3 mt-10 flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[oklch(0.85_0.09_85)]">
                Gästefotos
              </p>
              {!frameMode && (
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-white/85 ring-1 ring-white/20 transition hover:bg-white/20 ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Lädt hoch…" : "Fotos hochladen"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {items.some((item) => item.album === "gaeste") ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
                {items.map((item, i) =>
                  item.album === "gaeste" ? (
                    <button
                      type="button"
                      key={item.src}
                      onClick={() => {
                        setIndex(i);
                        setShowOverview(false);
                      }}
                      aria-label={`Anzeigen: ${item.title}`}
                      className={`group relative aspect-square overflow-hidden rounded-xl border transition hover:-translate-y-0.5 ${
                        i === index
                          ? "border-[oklch(0.85_0.09_85)] shadow-[0_0_18px_-4px_oklch(0.85_0.09_85)]"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {item.type === "video" ? (
                        <span className="relative block h-full w-full bg-black/40">
                          {i !== index && (
                            <video
                              src={`${item.src}#t=0.1`}
                              preload="metadata"
                              muted
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          )}
                          <span className="absolute inset-0 grid place-items-center bg-black/30">
                            <Play className="h-4 w-4 text-white" fill="currentColor" />
                          </span>
                        </span>
                      ) : (
                        <img
                          src={sizedSrc(item.src, "thumb")}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          {...protectedImgProps()}
                        />
                      )}
                    </button>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-xs text-white/40">
                Noch keine Gästefotos – ladet gern eure schönsten Momente hoch!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filmstreifen */}
      {mainItems.length > 0 && (
        <div className="relative z-10 mt-4 flex justify-start gap-2.5 overflow-x-auto px-4 pb-6 sm:justify-center sm:px-8">
          {mainItems.map((item) => (
            <button
              type="button"
              key={item.src}
              onClick={() => {
                if (item.type === "video") {
                  setViewingVideo(item);
                } else {
                  const imgIndex = slideshowItems.findIndex((s) => s.src === item.src);
                  if (imgIndex >= 0) setIndex(imgIndex);
                }
              }}
              aria-label={item.type === "video" ? `Video abspielen: ${item.title}` : item.title}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition sm:h-16 sm:w-16 ${
                item.type === "image" && current?.src === item.src
                  ? "border-[oklch(0.85_0.09_85)] shadow-[0_0_18px_-4px_oklch(0.85_0.09_85)] opacity-100"
                  : "border-white/15 opacity-45 hover:opacity-80"
              }`}
            >
              {item.type === "video" ? (
                <span className="relative block h-full w-full bg-black/40">
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
                  src={sizedSrc(item.src, "thumb")}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  {...protectedImgProps()}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
