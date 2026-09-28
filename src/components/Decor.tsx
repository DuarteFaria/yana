import { useState, type CSSProperties, type ReactNode } from "react";

// Little things that live on the bookshelf. Each piece stands on y = h
// (the shelf top) and may overflow below it (vines, tails, moss).

export type DecorKey =
  | "fern"
  | "succulent"
  | "ivy"
  | "globe"
  | "bookstack"
  | "minibooks"
  | "jar"
  | "teacup"
  | "pumpkin"
  | "candle"
  | "cat";

type Spec = { w: number; h: number; label: string; art: (v: number) => ReactNode };

const d = (s: number): CSSProperties => ({ "--d": `${s}s` }) as CSSProperties;
const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

const POT = (x: number, y: number, w: number, h: number, color = "#c8734a") => (
  <g>
    <path d={`M${x} ${y} h${w} l-${w * 0.1} ${h} h-${w * 0.8} z`} fill={color} />
    <rect x={x - 3} y={y - 2} width={w + 6} height={h * 0.26} rx="3" fill={shadeHex(color, 0.12)} />
    <path d={`M${x + w * 0.16} ${y + h * 0.4} v${h * 0.46}`} stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
  </g>
);

function frond(len: number, color: string) {
  const leaves: ReactNode[] = [];
  for (let i = 1; i <= 9; i++) {
    const y = -(len * i) / 10;
    const s = (1 - i / 11) * 10 + 2.5;
    leaves.push(
      <ellipse key={`l${i}`} cx={-s * 0.8} cy={y} rx={s} ry={s * 0.36} transform={`rotate(28 ${-s * 0.8} ${y})`} fill={color} />,
      <ellipse key={`r${i}`} cx={s * 0.8} cy={y} rx={s} ry={s * 0.36} transform={`rotate(-28 ${s * 0.8} ${y})`} fill={color} />,
    );
  }
  return (
    <>
      <path d={`M0 0 L0 ${-len}`} stroke={shadeHex(color, -0.2)} strokeWidth="2" />
      {leaves}
    </>
  );
}

export const DECOR: Record<DecorKey, Spec> = {
  fern: {
    w: 110,
    h: 130,
    label: "fern",
    art: (v) => {
      const green = v % 2 ? "#6fa96b" : "#5f9e63";
      return (
        <>
          {[-58, -30, -8, 14, 36, 60].map((a, i) => (
            <g key={a} transform={`translate(55 92) rotate(${a})`}>
              <g className="dc-sway" style={d(3.2 + i * 0.45)}>
                {frond(62 + ((i * 7) % 18), i % 2 ? green : shadeHex(green, 0.1))}
              </g>
            </g>
          ))}
          {POT(33, 92, 44, 38, v % 2 ? "#e9e2d4" : "#c8734a")}
        </>
      );
    },
  },
  succulent: {
    w: 70,
    h: 70,
    label: "succulent",
    art: () => (
      <>
        <g transform="translate(35 42)" className="dc-breathe">
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M0 0 C-7 -8 -5 -22 0 -26 C5 -22 7 -8 0 0Z" fill={i % 2 ? "#8fc8a4" : "#7ab896"} transform={`rotate(${i * 45})`} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <path key={`i${i}`} d="M0 0 C-5 -6 -4 -14 0 -17 C4 -14 5 -6 0 0Z" fill="#a8dcb9" transform={`rotate(${i * 60 + 30})`} />
          ))}
          <circle r="3" fill="#f7b6c2" />
        </g>
        {POT(17, 44, 36, 26, "#9ec3ea")}
      </>
    ),
  },
  ivy: {
    w: 90,
    h: 64,
    label: "ivy",
    art: () => (
      <>
        {[
          { x: 22, len: 150, dur: 4.2 },
          { x: 46, len: 110, dur: 3.6 },
          { x: 68, len: 175, dur: 4.8 },
        ].map((vine, i) => (
          <g key={i} transform={`translate(${vine.x} 32)`}>
            <g className="dc-hang" style={d(vine.dur)}>
              <path d={`M0 0 C${i % 2 ? 14 : -14} ${vine.len * 0.3} ${i % 2 ? -10 : 12} ${vine.len * 0.65} 0 ${vine.len}`} stroke="#5f8f55" strokeWidth="2" fill="none" />
              {Array.from({ length: Math.floor(vine.len / 18) }, (_, k) => {
                const y = 14 + k * 18;
                const x = Math.sin(k * 1.3 + i) * 6;
                return <path key={k} d={`M${x} ${y} c-8 -6 -10 4 -2 8 c-2 -8 8 -10 2 -8z`} fill={k % 2 ? "#7fbf73" : "#6aae62"} transform={`rotate(${k % 2 ? 30 : -30} ${x} ${y})`} />;
              })}
            </g>
          </g>
        ))}
        {POT(18, 30, 54, 34, "#e9a37f")}
      </>
    ),
  },
  globe: {
    w: 96,
    h: 136,
    label: "globe",
    art: () => (
      <>
        <defs>
          <clipPath id="globe-clip">
            <circle cx="48" cy="60" r="34" />
          </clipPath>
          <radialGradient id="globe-shade" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#1d3557" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <ellipse cx="48" cy="132" rx="28" ry="5" fill="#b08948" />
        <rect x="44" y="100" width="8" height="30" rx="3" fill="#c9a15a" />
        <g transform="rotate(-18 48 60)">
          <circle cx="48" cy="60" r="34" fill="#8fc3e6" />
          <g clipPath="url(#globe-clip)">
            <g className="dc-spin">
              {[0, 136].map((ox) => (
                <g key={ox} transform={`translate(${ox} 0)`} fill="#9bcf86">
                  <path d="M20 40 q14 -10 24 2 q6 12 -6 18 q-12 4 -10 16 q-10 -4 -12 -16 q-6 -12 4 -20z" />
                  <path d="M60 30 q16 -4 22 8 q-4 10 -14 8 q-12 -2 -8 -16z" />
                  <path d="M74 66 q14 -2 18 12 q-2 14 -14 14 q-8 -12 -4 -26z" />
                  <path d="M110 44 q16 4 16 18 q-10 10 -20 4 q-8 -12 4 -22z" />
                  <path d="M36 84 q10 0 12 8 q-6 6 -14 2z" />
                </g>
              ))}
            </g>
          </g>
          <circle cx="48" cy="60" r="34" fill="url(#globe-shade)" />
          <path d="M48 18 A42 42 0 0 1 48 102" stroke="#c9a15a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      </>
    ),
  },
  bookstack: {
    w: 104,
    h: 66,
    label: "books",
    art: (v) => {
      const palettes = [
        ["#e76f51", "#2a9d8f", "#e9c46a"],
        ["#8e6fd8", "#f4a7b9", "#5f9e63"],
      ];
      const [a, b, c] = palettes[v % 2];
      const book = (x: number, y: number, w: number, col: string) => (
        <g>
          <rect x={x} y={y} width={w} height="18" rx="3" fill={col} />
          <rect x={x + w - 8} y={y + 2} width="6" height="14" fill="#fbf4e4" />
          <path d={`M${x + 10} ${y + 5} h${w * 0.4} M${x + 10} ${y + 13} h${w * 0.4}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="2" />
        </g>
      );
      return (
        <>
          {book(6, 48, 92, a)}
          {book(14, 30, 80, b)}
          {book(4, 12, 84, c)}
          <g className="dc-bob" style={d(4)}>
            <path d="M62 12 q6 -8 12 0" stroke="#e76f51" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        </>
      );
    },
  },
  minibooks: {
    w: 84,
    h: 100,
    label: "little books",
    art: (v) => {
      const cols = v % 2 ? ["#3d5a80", "#ee6c4d", "#98c1d9", "#293241", "#e0a458"] : ["#6b2d4a", "#2f5d3a", "#c9a15a", "#8e6fd8", "#e76f51"];
      const hs = [86, 96, 78, 92, 70];
      let x = 4;
      return (
        <>
          {hs.map((h, i) => {
            const w = i === 2 ? 16 : 13;
            const el = (
              <g key={i} transform={i === 4 ? `rotate(14 ${x} 100)` : undefined}>
                <rect x={x} y={100 - h} width={w} height={h} rx="2" fill={cols[i]} />
                <rect x={x} y={100 - h + 10} width={w} height="3" fill="#f2d98d" />
                <rect x={x} y={100 - 14} width={w} height="3" fill="#f2d98d" />
              </g>
            );
            x += w + 1.5;
            return el;
          })}
        </>
      );
    },
  },
  jar: {
    w: 62,
    h: 98,
    label: "firefly jar",
    art: () => (
      <>
        <rect x="8" y="24" width="46" height="72" rx="14" fill="#dff0ff" fillOpacity="0.35" stroke="#fff" strokeOpacity="0.9" strokeWidth="2.5" />
        <path d="M14 84 q8 -10 16 -2 q8 -8 18 0 v6 q-17 6 -34 0z" fill="#7fae6b" />
        {[
          [22, 60, 0],
          [38, 46, 0.7],
          [30, 74, 1.4],
          [42, 68, 2.1],
          [20, 40, 2.8],
        ].map(([x, y, t], i) => (
          <g key={i} className="dc-firefly" style={{ ...delay(t), "--dx": `${i % 2 ? 4 : -4}px` } as CSSProperties}>
            <circle cx={x} cy={y} r="7" fill="#ffe97a" opacity="0.35" />
            <circle cx={x} cy={y} r="2.4" fill="#fffbd0" />
          </g>
        ))}
        <rect x="12" y="12" width="38" height="14" rx="4" fill="#b98352" />
        <path d="M16 16 h30" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
        <path d="M18 36 v34" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  teacup: {
    w: 84,
    h: 58,
    label: "tea",
    art: () => (
      <>
        {[22, 38, 54].map((x, i) => (
          <path key={x} className="dc-steam" style={delay(i * 0.9)} d={`M${x} 22 q-6 -8 0 -14 q6 -6 0 -14`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        ))}
        <ellipse cx="42" cy="54" rx="36" ry="5" fill="#bfe0d2" />
        <path d="M12 26 h56 q-2 26 -28 26 q-26 0 -28 -26z" fill="#a8d8c4" />
        <ellipse cx="40" cy="26" rx="28" ry="5" fill="#9b6b43" />
        <path d="M66 32 q12 0 10 9 q-2 7 -12 5" stroke="#a8d8c4" strokeWidth="5" fill="none" />
        <path d="M22 34 q4 10 12 12" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  pumpkin: {
    w: 72,
    h: 58,
    label: "pumpkin",
    art: (v) => {
      const c = v % 2 ? "#f2a65a" : "#e8863a";
      return (
        <>
          <ellipse cx="22" cy="36" rx="16" ry="20" fill={shadeHex(c, -0.08)} />
          <ellipse cx="50" cy="36" rx="16" ry="20" fill={shadeHex(c, -0.08)} />
          <ellipse cx="36" cy="36" rx="18" ry="22" fill={c} />
          <path d="M36 16 v40 M24 18 q-6 18 0 38 M48 18 q6 18 0 38" stroke={shadeHex(c, -0.22)} strokeWidth="1.5" fill="none" />
          <path d="M35 16 q-2 -10 4 -14" stroke="#6b4a2b" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M40 10 q10 -8 16 2 q-8 2 -16 -2z" fill="#7cc36b" />
          <path d="M44 6 q8 -8 12 -2" stroke="#7cc36b" strokeWidth="1.5" fill="none" />
        </>
      );
    },
  },
  candle: {
    w: 46,
    h: 106,
    label: "candle",
    art: () => (
      <>
        <defs>
          <radialGradient id="candle-glow">
            <stop offset="0" stopColor="#ffd97a" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffd97a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff8a3d" />
            <stop offset="0.6" stopColor="#ffd35a" />
            <stop offset="1" stopColor="#fff6c2" />
          </linearGradient>
        </defs>
        <circle className="dc-glow" cx="23" cy="24" r="28" fill="url(#candle-glow)" />
        <ellipse cx="23" cy="102" rx="20" ry="4.5" fill="#c9a15a" />
        <rect x="13" y="40" width="20" height="60" rx="3" fill="#fbf1dc" />
        <path d="M13 44 q3 10 0 14 M28 42 q2 6 0 10" stroke="#f1e2bf" strokeWidth="4" strokeLinecap="round" />
        <path d="M23 40 v-6" stroke="#3b2f2f" strokeWidth="2" />
        <g className="dc-flame">
          <path d="M23 36 C14 28 20 18 23 8 C26 18 32 28 23 36Z" fill="url(#flame)" />
        </g>
      </>
    ),
  },
  cat: {
    w: 150,
    h: 72,
    label: "cat",
    art: () => <Cat />,
  },
};

function Cat() {
  const [mrrp, setMrrp] = useState(0);
  return (
    <g className="dc-cat" onClick={() => setMrrp((m) => m + 1)} style={{ cursor: "pointer", pointerEvents: "auto" }}>
      <g className="dc-tail">
        <path d="M122 60 C144 62 146 80 140 110 C136 128 146 136 152 134" stroke="#6e6e78" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M148 134 c3 0 6 -1 5 -3" stroke="#f6f2ee" strokeWidth="9" fill="none" strokeLinecap="round" />
      </g>
      <g className="dc-breathe">
        <ellipse cx="82" cy="52" rx="56" ry="22" fill="#6e6e78" />
        <path d="M64 32 q6 8 0 16 M82 30 q6 8 0 18 M100 32 q6 8 0 16" stroke="#5a5a63" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="52" cy="70" rx="12" ry="4" fill="#f6f2ee" />
      </g>
      <g>
        <path className="dc-ear" d="M20 30 L24 8 L38 22 Z" fill="#6e6e78" />
        <path d="M44 22 L56 8 L60 30 Z" fill="#6e6e78" />
        <path d="M24 24 L26 13 L33 21 Z" fill="#f7b6c2" />
        <circle cx="40" cy="42" r="24" fill="#6e6e78" />
        <ellipse cx="40" cy="52" rx="14" ry="9" fill="#f6f2ee" />
        <path d="M28 40 q4 4 8 0 M44 40 q4 4 8 0" stroke="#2b2224" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M38 48 h4 l-2 2.5z" fill="#f28ea0" />
        <ellipse cx="24" cy="48" rx="4.5" ry="2.8" fill="#f59aa6" opacity="0.8" />
        <ellipse cx="56" cy="48" rx="4.5" ry="2.8" fill="#f59aa6" opacity="0.8" />
      </g>
      <g className="dc-zzz" fontFamily="Gluten" fontWeight="700" fill="#9a8a80">
        <text x="62" y="10" fontSize="12">z</text>
        <text x="72" y="0" fontSize="15">z</text>
        <text x="84" y="-12" fontSize="18">Z</text>
      </g>
      {mrrp > 0 && (
        <g key={mrrp} className="dc-bubble">
          <rect x="-10" y="-34" width="62" height="26" rx="13" fill="#fff" />
          <path d="M18 -9 l6 8 l4 -8z" fill="#fff" />
          <text x="21" y="-16" textAnchor="middle" fontFamily="Gluten" fontWeight="700" fontSize="14" fill="#e0647d">
            {["mrrp!", "purr…", "meow?", "nya~"][mrrp % 4]}
          </text>
        </g>
      )}
    </g>
  );
}

export function Decor({ k, v = 0, scale = 1 }: { k: DecorKey; v?: number; scale?: number }) {
  const s = DECOR[k];
  return (
    <div className={`decor decor-${k}`} style={{ width: s.w * scale, height: s.h * scale }} aria-hidden>
      <svg viewBox={`0 0 ${s.w} ${s.h}`} width={s.w * scale} height={s.h * scale} overflow="visible">
        {s.art(v)}
      </svg>
    </div>
  );
}

/** Moss draped over a plank's front edge. */
export function Moss({ x, w = 120, seed = 0 }: { x: string; w?: number; seed?: number }) {
  const strands = Array.from({ length: 6 }, (_, i) => {
    const sx = 10 + ((i * 37 + seed * 13) % (w - 20));
    const len = 18 + ((i * 29 + seed * 7) % 34);
    return { sx, len };
  });
  return (
    <svg className="moss" style={{ left: x, width: w }} viewBox={`0 0 ${w} 70`} height="70" aria-hidden>
      {strands.map((s, i) => (
        <g key={i} className="dc-hang" style={d(3 + (i % 3) * 0.7)}>
          <path d={`M${s.sx} 4 q${i % 2 ? 4 : -4} ${s.len / 2} 0 ${s.len}`} stroke={i % 2 ? "#8db36b" : "#a6c47a"} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx={s.sx} cy={4 + s.len} r="2" fill="#b7d38a" />
        </g>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={`t${i}`} cx={8 + (i * (w - 16)) / 6} cy={4 + (i % 2) * 2} rx={9 + (i % 3) * 3} ry="6" fill={i % 2 ? "#7fa85e" : "#96bb6c"} />
      ))}
    </svg>
  );
}

/** A string of twinkly lights sagging between hooks. */
export function FairyLights({ width, sags = 3 }: { width: number; sags?: number }) {
  const seg = width / sags;
  const sag = 26;
  let path = "M0 0";
  const bulbs: { x: number; y: number }[] = [];
  for (let i = 0; i < sags; i++) {
    const x0 = i * seg;
    path += ` Q${x0 + seg / 2} ${sag * 2} ${x0 + seg} 0`;
    for (let b = 1; b < 6; b++) {
      const t = b / 6;
      bulbs.push({ x: x0 + t * seg, y: 2 * (1 - t) * t * sag * 2 });
    }
  }
  const colors = ["#ffd35a", "#ff8fa3", "#8fd3b6", "#9ec3ea", "#ffb347"];
  return (
    <svg className="fairy-lights" width={width} height={sag * 2 + 16} viewBox={`0 -4 ${width} ${sag * 2 + 16}`} aria-hidden>
      <path d={path} stroke="#5b4a3a" strokeWidth="1.5" fill="none" />
      {bulbs.map((b, i) => (
        <g key={i} className="dc-bulb" style={delay((i * 0.37) % 2.6)}>
          <circle cx={b.x} cy={b.y + 6} r="9" fill={colors[i % colors.length]} opacity="0.28" />
          <ellipse cx={b.x} cy={b.y + 6} rx="3.6" ry="5" fill={colors[i % colors.length]} />
          <rect x={b.x - 2} y={b.y} width="4" height="3" fill="#5b4a3a" />
        </g>
      ))}
    </svg>
  );
}

function shadeHex(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.max(0, Math.min(255, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `#${((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1)}`;
}
