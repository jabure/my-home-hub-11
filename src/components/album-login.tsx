import { useEffect, useRef, useState } from "react";
import { ArrowRight, Heart, Loader2, Lock } from "lucide-react";
import backdrop from "@/assets/hero-1.webp";
import { protectedImgProps } from "@/components/gallery-experience";
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
  onSubmit: (e: React.FormEvent) => void;
};

// Namen mit goldenem "&" darstellen ("Tanja & Christopher")
function CoupleNames({ names }: { names: string }) {
  const parts = names.split(/\s*&\s*/);
  if (parts.length !== 2) return <>{names}</>;
  return (
    <>
      {parts[0]}
      <span className="mx-[0.18em] text-gold not-italic">&amp;</span>
      {parts[1]}
    </>
  );
}

function formatCountdown(seconds: number) {
  if (seconds < 120) return `${seconds} Sekunden`;
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Minuten`;
}

export function AlbumLogin(props: Props) {
  const { config, variant, status, secret, setSecret, error, errorNonce, lockedForSeconds } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const dateLabel = formatWeddingDate(config.weddingDate);
  const days = daysSince(config.weddingDate);
  const locked = lockedForSeconds > 0;
  const isPin = variant === "pin";

  // Bei Fehler: Formular kurz schütteln und Eingabe wieder fokussieren
  useEffect(() => {
    if (errorNonce === 0) return;
    setShakeKey(errorNonce);
    inputRef.current?.focus();
  }, [errorNonce]);

  useEffect(() => {
    if (status === "locked" && !locked) inputRef.current?.focus();
  }, [status, locked]);

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-background text-ivory">
      {/* Hintergrundfoto mit langsamem Zoom, stark abgedunkelt */}
      <div aria-hidden="true" className="absolute inset-0">
        <img
          src={backdrop}
          alt=""
          width={1600}
          height={900}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover opacity-55 animate-ken-burns-slow"
          {...protectedImgProps()}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.15_0.015_45)]/70 via-[oklch(0.15_0.015_45)]/55 to-[oklch(0.13_0.015_40)]/95" />
        <div className="absolute inset-0 wedding-vignette" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="animate-rise-in text-[11px] font-medium uppercase tracking-[0.45em] text-gold/90">
          {isPin ? "Unser Hochzeitsalbum" : "Bilderrahmen"}
        </p>

        <h1
          className="mt-6 animate-rise-in text-[2.75rem] leading-[1.05] italic text-ivory drop-shadow-[0_2px_24px_oklch(0.1_0.02_40/0.6)] sm:text-7xl"
          style={{ animationDelay: "120ms" }}
        >
          <CoupleNames names={config.coupleNames} />
        </h1>

        <div
          className="mt-7 flex w-full max-w-xs animate-rise-in items-center gap-4 text-gold"
          style={{ animationDelay: "240ms" }}
        >
          <span className="gold-rule flex-1" />
          <Heart className="h-3.5 w-3.5 shrink-0" fill="currentColor" />
          <span className="gold-rule flex-1" />
        </div>

        {(dateLabel || days !== null) && (
          <div className="mt-6 animate-rise-in space-y-1.5" style={{ animationDelay: "320ms" }}>
            {dateLabel && (
              <p className="text-xs uppercase tracking-[0.35em] text-ivory/75">{dateLabel}</p>
            )}
            {days !== null && (
              <p className="font-serif text-lg italic text-ivory/65">
                verheiratet seit{" "}
                <span className="tabular-nums text-gold">{days.toLocaleString("de-AT")}</span> Tagen
              </p>
            )}
          </div>
        )}

        <form
          key={shakeKey}
          onSubmit={props.onSubmit}
          className={`glass-dark mt-12 w-full max-w-sm rounded-[1.75rem] px-6 py-7 shadow-[0_30px_80px_-30px_oklch(0.05_0.02_40/0.9)] sm:px-8 ${
            shakeKey > 0 ? "animate-shake" : "animate-rise-in"
          }`}
          style={shakeKey > 0 ? undefined : { animationDelay: "440ms" }}
        >
          {status === "checking" ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-ivory/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Einen Moment…
            </div>
          ) : (
            <>
              <label
                htmlFor="album-secret"
                className="flex items-center justify-center gap-2 text-sm text-ivory/75"
              >
                <Lock className="h-3.5 w-3.5 text-gold" />
                {isPin ? "Bitte gebt eure PIN ein" : "Zugangscode für dieses Gerät"}
              </label>
              <input
                ref={inputRef}
                id="album-secret"
                type="password"
                inputMode={isPin ? "numeric" : "text"}
                autoComplete="off"
                enterKeyHint="go"
                disabled={locked}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={isPin ? "••••" : "Code"}
                aria-invalid={error ? true : undefined}
                aria-describedby="album-secret-msg"
                className="mt-4 w-full border-0 border-b border-ivory/25 bg-transparent px-2 pb-2 text-center font-serif text-3xl tracking-[0.45em] text-ivory outline-none transition placeholder:text-ivory/25 focus:border-gold disabled:opacity-40"
              />
              <p
                id="album-secret-msg"
                role="status"
                aria-live="polite"
                className="mt-3 min-h-5 text-sm text-[oklch(0.8_0.11_35)]"
              >
                {locked
                  ? `Zu viele Versuche – bitte warte ${formatCountdown(lockedForSeconds)}.`
                  : error}
              </p>
              <button
                type="submit"
                disabled={props.submitting || secret.length === 0 || locked}
                className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-medium tracking-wide text-[oklch(0.2_0.02_50)] shadow-[0_10px_30px_-10px_oklch(0.84_0.085_82/0.6)] transition hover:bg-[oklch(0.88_0.08_84)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {props.submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Wird geprüft…
                  </>
                ) : (
                  <>
                    {isPin ? "Album öffnen" : "Gerät freischalten"}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>

      <footer className="relative z-10 pb-6 text-center text-[10px] uppercase tracking-[0.3em] text-ivory/35">
        Privat · nur für Familie &amp; Freunde
      </footer>
    </main>
  );
}
