import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import backdrop from "@/assets/hero-1.webp";
import { protectedImgProps } from "@/components/gallery-experience";
import { GoldDust } from "@/components/gold-dust";
import { WaxSeal } from "@/components/wax-seal";
import { daysSince, formatWeddingDate, type SiteConfig } from "@/lib/use-album-access";

type Props = {
  config: SiteConfig;
  variant: "pin" | "frame";
  status: "checking" | "locked" | "unlocked";
  secret: string;
  setSecret: (v: string) => void;
  error: string | null;
  errorNonce: number;
  lockedForSeconds: number;
  submitting: boolean;
  opening: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

function formatCountdown(seconds: number) {
  if (seconds < 120) return `${seconds} Sekunden`;
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Minuten`;
}

function marriedLabel(days: number) {
  if (days === 0) return "Heute ist unser Hochzeitstag";
  return `Seit ${days.toLocaleString("de-AT")} ${days === 1 ? "Tag" : "Tagen"} verheiratet`;
}

// Geschwungenes Ornament unter den Namen, zeichnet sich beim Laden selbst
function Flourish() {
  return (
    <svg viewBox="0 0 240 24" aria-hidden="true" className="h-6 w-56 text-[#b98a3e]">
      <path
        className="animate-draw"
        style={{ ["--len" as string]: 260 }}
        d="M4 12c22 0 30-8 46-8s20 12 36 12 18-10 34-10 18 10 34 10 20-12 36-12 24 8 46 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="120" cy="6" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function AlbumLogin(props: Props) {
  const { config, variant, status, secret, setSecret, error, errorNonce, lockedForSeconds } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const dateLabel = formatWeddingDate(config.weddingDate);
  const days = daysSince(config.weddingDate);
  const locked = lockedForSeconds > 0;
  const isPin = variant === "pin";
  const opening = props.opening;
  const names = config.coupleNames.split(/\s*&\s*/);

  // Bei Fehler: Karte kurz schütteln und Eingabe wieder fokussieren
  useEffect(() => {
    if (errorNonce === 0) return;
    setShakeKey(errorNonce);
    inputRef.current?.focus();
  }, [errorNonce]);

  useEffect(() => {
    if (status === "locked" && !locked) inputRef.current?.focus();
  }, [status, locked]);

  const cardAnimation = opening
    ? "animate-card-open"
    : shakeKey > 0
      ? "animate-shake"
      : "animate-card-arrive";

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-velvet text-ivory">
      {/* Samtiger Hintergrund: euer Foto, stark gedämpft, mit Goldstaub und Körnung */}
      <div aria-hidden="true" className="absolute inset-0">
        <img
          src={backdrop}
          alt=""
          width={1600}
          height={900}
          fetchPriority="high"
          decoding="async"
          className={`h-full w-full object-cover opacity-40 saturate-[0.85] ${
            opening ? "animate-backdrop-open" : "animate-ken-burns-slow"
          }`}
          {...protectedImgProps()}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(23_18_14/0.35)_0%,rgb(23_18_14/0.85)_70%,rgb(23_18_14/0.97)_100%)]" />
        <GoldDust className="absolute inset-0 h-full w-full" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-20 sm:px-6">
        <div className="relative w-full max-w-[25rem]">
          {/* Wachssiegel, ragt über die Oberkante der Karte */}
          <div
            className={`absolute left-1/2 top-0 z-20 -ml-11 -mt-11 h-22 w-22 ${
              opening ? "animate-seal-open" : "animate-seal-arrive"
            }`}
          >
            <WaxSeal
              names={config.coupleNames}
              className="h-full w-full drop-shadow-[0_6px_6px_rgb(26_6_8/0.55)]"
            />
          </div>

          <section
            key={shakeKey}
            aria-labelledby="couple-names"
            className={`invitation-paper relative overflow-hidden rounded-[4px] px-7 pb-9 pt-16 text-center text-ink sm:px-10 ${cardAnimation}`}
          >
            {/* Doppelte Goldlinie wie bei gedruckten Einladungen */}
            <div className="pointer-events-none absolute inset-3 rounded-[2px] border border-[#b98a3e]/45" />
            <div className="pointer-events-none absolute inset-[17px] rounded-[1px] border border-[#b98a3e]/25" />
            <div className="grain pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-multiply" />

            <p className="relative font-serif text-[1.05rem] italic text-ink/70">
              {isPin
                ? "Willkommen in unserem Hochzeitsalbum"
                : "Dieses Gerät wird zum Bilderrahmen"}
            </p>

            <h1
              id="couple-names"
              className="relative mt-5 font-serif italic leading-[0.95] drop-shadow-[0_1px_0_rgb(255_255_255/0.6)]"
            >
              {names.length === 2 ? (
                <>
                  <span className="gold-foil-deep block pb-1 text-[3.25rem] sm:text-6xl">
                    {names[0]}
                  </span>
                  <span className="gold-foil-deep block py-1 text-[2.4rem] not-italic">&amp;</span>
                  <span className="gold-foil-deep block pb-2 text-[3.25rem] sm:text-6xl">
                    {names[1]}
                  </span>
                </>
              ) : (
                <span className="gold-foil-deep block text-5xl">{config.coupleNames}</span>
              )}
            </h1>

            <div className="relative mt-4 flex justify-center">
              <Flourish />
            </div>

            {dateLabel && (
              <p className="small-caps relative mt-4 font-serif text-xl text-ink">{dateLabel}</p>
            )}
            {days !== null && (
              <p className="relative mt-1 font-serif text-base italic text-ink/60">
                {marriedLabel(days)}
              </p>
            )}

            <form onSubmit={props.onSubmit} className="relative mt-8">
              {status === "checking" ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink/55">
                  <Loader2 className="h-4 w-4 animate-spin" /> Album wird geladen
                </div>
              ) : (
                <>
                  <label htmlFor="album-secret" className="block text-sm text-ink/65">
                    {isPin ? "PIN eingeben" : "Zugangscode eingeben"}
                  </label>
                  <input
                    ref={inputRef}
                    id="album-secret"
                    type="password"
                    inputMode={isPin ? "numeric" : "text"}
                    autoComplete="off"
                    enterKeyHint="go"
                    disabled={locked || opening}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    aria-invalid={error ? true : undefined}
                    aria-describedby="album-secret-msg"
                    className="mx-auto mt-2 block w-full max-w-[14rem] border-0 border-b border-ink/25 bg-transparent px-2 pb-1.5 text-center font-serif text-3xl tracking-[0.4em] text-ink caret-[#b98a3e] outline-none transition focus:border-[#b98a3e] disabled:opacity-40"
                  />
                  <p
                    id="album-secret-msg"
                    role="status"
                    aria-live="polite"
                    className="mt-2.5 min-h-5 text-sm text-wax"
                  >
                    {locked
                      ? `Zu viele Versuche. Neuer Versuch in ${formatCountdown(lockedForSeconds)}.`
                      : error}
                  </p>
                  <button
                    type="submit"
                    disabled={props.submitting || opening || secret.length === 0 || locked}
                    className="mt-3 inline-flex min-w-[12rem] items-center justify-center gap-2 rounded-full bg-ink px-7 py-3 text-sm font-medium text-paper shadow-[0_10px_24px_-12px_rgb(58_44_34/0.9)] transition hover:bg-[#2a1f17] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b98a3e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {props.submitting || opening ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {opening ? "Album wird geöffnet" : "Wird geprüft"}
                      </>
                    ) : isPin ? (
                      "Album öffnen"
                    ) : (
                      "Gerät freischalten"
                    )}
                  </button>
                </>
              )}
            </form>
          </section>
        </div>
      </div>

      <footer className="relative z-10 pb-6 text-center font-serif text-sm italic text-ivory/40">
        Privat – nur für Familie und Freunde
      </footer>
    </main>
  );
}
