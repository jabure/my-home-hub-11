// Bordeauxrotes Wachssiegel mit eingeprägten Initialen ("T & C")
export function initialsFrom(names: string): [string, string] | null {
  const parts = names.split(/\s*&\s*/).map((p) => p.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0].charAt(0).toUpperCase(), parts[1].charAt(0).toUpperCase()];
}

export function WaxSeal({ names, className = "" }: { names: string; className?: string }) {
  const initials = initialsFrom(names);
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={initials ? `Siegel ${initials[0]} und ${initials[1]}` : "Siegel"}
      className={className}
    >
      <defs>
        <radialGradient id="wax-body" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#B4404E" />
          <stop offset="45%" stopColor="#8A2A37" />
          <stop offset="100%" stopColor="#4E1219" />
        </radialGradient>
        <radialGradient id="wax-press" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#6E1F2A" />
          <stop offset="100%" stopColor="#8E2C39" />
        </radialGradient>
      </defs>
      {/* Unregelmäßiger Wachsrand */}
      <path
        fill="url(#wax-body)"
        d="M60 6c8 0 11 5 18 7s13 0 17 6 2 12 6 18 10 9 10 17-6 10-7 17 3 13-2 19-12 4-18 9-7 13-15 14-11-5-18-5-12 6-19 2-6-12-12-17-14-5-16-12 4-12 2-19-8-11-4-18 12-6 15-12 1-14 7-18 12 2 19-1S52 6 60 6z"
      />
      {/* Eingeprägte Fläche */}
      <circle cx="60" cy="61" r="37" fill="url(#wax-press)" />
      <circle
        cx="60"
        cy="61"
        r="37"
        fill="none"
        stroke="#C25563"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <circle
        cx="60"
        cy="61"
        r="32"
        fill="none"
        stroke="#3F0E14"
        strokeOpacity="0.55"
        strokeWidth="0.8"
        strokeDasharray="1.2 2.4"
      />
      {initials ? (
        <text
          x="60"
          y="70"
          textAnchor="middle"
          fontFamily="'Cormorant Garamond', Georgia, serif"
          fontStyle="italic"
          fontSize="27"
          fill="#E9C9B0"
          fillOpacity="0.9"
          style={{ paintOrder: "stroke" }}
          stroke="#3F0E14"
          strokeOpacity="0.45"
          strokeWidth="1.4"
        >
          {initials[0]}
          <tspan dx="2" dy="-1" fontSize="17" fillOpacity="0.75">
            &amp;
          </tspan>
          <tspan dx="2" dy="1">
            {initials[1]}
          </tspan>
        </text>
      ) : (
        <path
          d="M60 76s-14-8.5-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 9.5-14 18-14 18z"
          fill="#E9C9B0"
          fillOpacity="0.85"
        />
      )}
    </svg>
  );
}
