import { useId, type ReactNode } from "react";
import { useFileUrl } from "../lib/files";
import type { Character, Cover as CoverT, Holding } from "../lib/types";

// A plush notebook cover drawn in SVG. The fluffiness comes from displacing
// the edges with fractal noise and layering streaky noise as fur texture.

const W = 220;
const H = 300;
const BODY = { x: 20, y: 36, w: 180, h: 250, r: 28 };
const INK = "#2b2224";
const BLUSH = "#f59aa6";

type Props = { cover: CoverT; width?: number; className?: string; title?: string };

export function Cover({ cover, width = 180, className, title }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const photo = useFileUrl(cover.photo);
  const fluff = Math.max(0, Math.min(1, cover.fluff));
  const id = (s: string) => `${s}-${uid}`;
  const url = (s: string) => `url(#${id(s)})`;
  const { fur, accent, character } = cover;
  const dark = shade(fur, -0.28);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      className={className}
      role="img"
      aria-label={title ?? `${character} notebook`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={id("fuzz")} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2 + fluff * 8} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={id("fur")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`${0.9 + fluff * 0.6} ${0.25 + fluff * 0.2}`} numOctaves="3" seed="2" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -1.05" />
        </filter>
        <filter id={id("sheen")} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`${0.7 + fluff * 0.5} 0.2`} numOctaves="2" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2 0 0 0 -1.1" />
        </filter>
        <radialGradient id={id("light")} cx="30%" cy="22%" r="85%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
        <linearGradient id={id("spine")} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id("body")}>
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} />
        </clipPath>
        <clipPath id={id("photo")}>
          <rect x={BODY.x + 16} y={BODY.y + 16} width={BODY.w - 32} height={BODY.h - 32} rx={BODY.r - 12} />
        </clipPath>
      </defs>

      {/* bookmark ribbon peeking out underneath */}
      <path d="M150 262 h16 v40 l-8 -7 l-8 7 z" fill={cover.ribbon} stroke={shade(cover.ribbon, -0.2)} strokeWidth="1" />
      {/* page block */}
      <rect x={BODY.x + 7} y={BODY.y + 5} width={BODY.w} height={BODY.h - 4} rx={BODY.r} fill="#fffaf0" stroke="#e8dcc6" />

      <g filter={url("fuzz")}>
        {behind(character, fur, accent, dark)}
        <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx={BODY.r} fill={fur} />
        <g clipPath={url("body")}>
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} filter={url("fur")} opacity={0.18 + fluff * 0.2} />
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} filter={url("sheen")} opacity={0.12 + fluff * 0.14} />
          <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} fill={url("light")} />
          <rect x={BODY.x} y={BODY.y} width="18" height={BODY.h} fill={url("spine")} />
        </g>
      </g>

      {photo ? (
        <>
          <image href={photo} x={BODY.x + 16} y={BODY.y + 16} width={BODY.w - 32} height={BODY.h - 32} preserveAspectRatio="xMidYMid slice" clipPath={url("photo")} />
          <rect x={BODY.x + 16} y={BODY.y + 16} width={BODY.w - 32} height={BODY.h - 32} rx={BODY.r - 12} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="2.5" strokeDasharray="7 5" />
        </>
      ) : (
        <>
          <rect x={BODY.x + 9} y={BODY.y + 9} width={BODY.w - 18} height={BODY.h - 18} rx={BODY.r - 7} fill="none" stroke={isLight(fur) ? dark : "#fff"} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="6 5" />
          <g filter={url("fuzz")}>{front(character, fur, accent, dark, cover.holding)}</g>
          {face(character, fur, accent)}
        </>
      )}
    </svg>
  );
}

// ---------- parts behind the book (ears, tufts) ----------

function behind(c: Character, fur: string, accent: string, dark: string): ReactNode {
  switch (c) {
    case "cat":
      return (
        <>
          <path d="M34 60 L44 10 L86 44 Z" fill={fur} />
          <path d="M186 60 L176 10 L134 44 Z" fill={fur} />
          <path d="M46 46 L50 24 L70 42 Z" fill="#f7b6c2" />
          <path d="M174 46 L170 24 L150 42 Z" fill="#f7b6c2" />
        </>
      );
    case "bunny":
      return (
        <>
          <ellipse cx="76" cy="18" rx="17" ry="44" transform="rotate(-10 76 18)" fill={fur} />
          <ellipse cx="144" cy="18" rx="17" ry="44" transform="rotate(10 144 18)" fill={fur} />
          <ellipse cx="76" cy="20" rx="8" ry="32" transform="rotate(-10 76 20)" fill="#f7b6c2" />
          <ellipse cx="144" cy="20" rx="8" ry="32" transform="rotate(10 144 20)" fill="#f7b6c2" />
        </>
      );
    case "bear":
      return (
        <>
          <circle cx="50" cy="46" r="22" fill={fur} />
          <circle cx="170" cy="46" r="22" fill={fur} />
          <circle cx="50" cy="46" r="11" fill={accent} />
          <circle cx="170" cy="46" r="11" fill={accent} />
        </>
      );
    case "panda":
      return (
        <>
          <circle cx="50" cy="46" r="22" fill={accent} />
          <circle cx="170" cy="46" r="22" fill={accent} />
        </>
      );
    case "frog":
      return (
        <>
          <circle cx="68" cy="42" r="26" fill={fur} />
          <circle cx="152" cy="42" r="26" fill={fur} />
        </>
      );
    case "capybara":
      return (
        <>
          <ellipse cx="62" cy="38" rx="14" ry="11" fill={dark} />
          <ellipse cx="158" cy="38" rx="14" ry="11" fill={dark} />
        </>
      );
    case "chick":
      return (
        <path d="M98 42 q-6 -26 8 -30 q-2 14 6 18 q4 -18 16 -16 q-10 10 -6 30 z" fill={fur} />
      );
    default:
      return null;
  }
}

// ---------- fuzzy parts on the front (head, paws, feet, held item) ----------

function front(c: Character, fur: string, accent: string, dark: string, holding: Holding): ReactNode {
  const pawColor = c === "cat" || c === "bunny" ? accent : c === "panda" ? accent : dark;
  const item = holding === "none" ? null : held(holding);

  if (c === "plain") {
    return item ? <g transform="translate(110 160) scale(2.2) translate(-110 -190)">{item}</g> : <g transform="translate(110 160) scale(2.2) translate(-110 -190)">{held("heart")}</g>;
  }

  return (
    <>
      {c === "capybara" && <ellipse cx="110" cy="112" rx="50" ry="42" fill={shade(fur, -0.12)} />}
      {c === "cat" && <ellipse cx="110" cy="128" rx="54" ry="36" fill={accent} />}
      {c === "bear" && <ellipse cx="110" cy="140" rx="30" ry="22" fill={accent} />}
      {c === "panda" && (
        <>
          <ellipse cx="84" cy="118" rx="15" ry="19" transform="rotate(30 84 118)" fill={accent} />
          <ellipse cx="136" cy="118" rx="15" ry="19" transform="rotate(-30 136 118)" fill={accent} />
        </>
      )}
      {c === "frog" && <ellipse cx="110" cy="206" rx="54" ry="46" fill={accent} opacity="0.9" />}
      {c === "bunny" && <ellipse cx="110" cy="205" rx="48" ry="44" fill={accent} opacity="0.85" />}

      {item}
      {/* paws */}
      <ellipse cx={item ? 80 : 84} cy="196" rx="17" ry="14" fill={pawColor} />
      <ellipse cx={item ? 140 : 136} cy="196" rx="17" ry="14" fill={pawColor} />
      {/* feet */}
      <ellipse cx="72" cy="262" rx="24" ry="19" fill={pawColor} />
      <ellipse cx="148" cy="262" rx="24" ry="19" fill={pawColor} />
    </>
  );
}

function held(h: Holding): ReactNode {
  switch (h) {
    case "lemon":
      return (
        <g>
          <ellipse cx="110" cy="190" rx="26" ry="22" fill="#ffd84d" />
          {[[-10, -6], [6, -10], [12, 4], [-4, 8], [-14, 6], [2, -1]].map(([dx, dy], i) => (
            <circle key={i} cx={110 + dx} cy={190 + dy} r="1.6" fill="#e8a33a" />
          ))}
          <path d="M112 170 q14 -12 24 -2 q-12 8 -24 2z" fill="#7cc36b" />
        </g>
      );
    case "heart":
      return <path d="M110 214 C80 194 84 170 100 170 C106 170 110 176 110 180 C110 176 114 170 120 170 C136 170 140 194 110 214Z" fill="#ff7b93" />;
    case "star":
      return <path d="M110 164 l7.6 15.4 17 2.5 -12.3 12 2.9 16.9 -15.2 -8 -15.2 8 2.9 -16.9 -12.3 -12 17 -2.5z" fill="#ffd84d" stroke="#f2b632" strokeWidth="2" strokeLinejoin="round" />;
    case "strawberry":
      return (
        <g>
          <path d="M110 216 C88 204 86 180 96 174 C102 171 118 171 124 174 C134 180 132 204 110 216Z" fill="#ff5a6e" />
          {[[-8, 0], [6, -2], [0, 10], [-10, 12], [10, 10], [0, -6]].map(([dx, dy], i) => (
            <ellipse key={i} cx={110 + dx} cy={190 + dy} rx="1.3" ry="2" fill="#ffe28a" />
          ))}
          <path d="M96 175 l7 -8 l7 6 l7 -6 l7 8 q-14 6 -28 0z" fill="#5fb56a" />
        </g>
      );
    case "flower":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={110 + 13 * Math.cos((a * Math.PI) / 180)} cy={188 + 13 * Math.sin((a * Math.PI) / 180)} r="11" fill="#ffc2d1" />
          ))}
          <circle cx="110" cy="188" r="8" fill="#ffd84d" />
        </g>
      );
    default:
      return null;
  }
}

// ---------- crisp facial features (not displaced) ----------

const happyEye = (x: number, y: number) => (
  <path d={`M${x - 7} ${y + 2} q7 -8 14 0`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
);
const dotEye = (x: number, y: number, color = INK) => (
  <>
    <circle cx={x} cy={y} r="5" fill={color} />
    <circle cx={x + 1.8} cy={y - 1.8} r="1.6" fill="#fff" />
  </>
);
const blush = (y: number, spread = 30, cx = 110) => (
  <>
    <ellipse cx={cx - spread} cy={y} rx="8" ry="5" fill={BLUSH} opacity="0.75" />
    <ellipse cx={cx + spread} cy={y} rx="8" ry="5" fill={BLUSH} opacity="0.75" />
  </>
);
const mouthW = (y: number, cx = 110) => (
  <path d={`M${cx - 8} ${y} q4 5 8 0 q4 5 8 0`} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
);

function face(c: Character, fur: string, accent: string): ReactNode {
  switch (c) {
    case "capybara":
      return (
        <>
          <path d="M80 100 h12 M128 100 h12" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="104" cy="118" rx="2.5" ry="3.5" fill={INK} />
          <ellipse cx="116" cy="118" rx="2.5" ry="3.5" fill={INK} />
          <path d="M110 122 v6 M102 130 q8 7 16 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {blush(120, 36)}
        </>
      );
    case "cat":
      return (
        <>
          {happyEye(90, 120)}
          {happyEye(130, 120)}
          <path d="M106 128 h8 l-4 5z" fill="#f28ea0" />
          {mouthW(135)}
          <path d="M62 128 h18 M62 136 l18 -3 M158 128 h-18 M158 136 l-18 -3" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
          {blush(134, 34)}
        </>
      );
    case "bunny":
      return (
        <>
          {dotEye(92, 116)}
          {dotEye(128, 116)}
          <ellipse cx="110" cy="126" rx="4" ry="3" fill="#f28ea0" />
          {mouthW(131)}
          {blush(130, 32)}
        </>
      );
    case "bear":
      return (
        <>
          {dotEye(88, 116)}
          {dotEye(132, 116)}
          <ellipse cx="110" cy="134" rx="7" ry="5" fill={INK} />
          {mouthW(143)}
          {blush(132, 40)}
        </>
      );
    case "panda":
      return (
        <>
          {dotEye(86, 118, "#fff")}
          {dotEye(134, 118, "#fff")}
          <ellipse cx="110" cy="136" rx="7" ry="5" fill={accent} />
          {mouthW(144)}
          {blush(138, 40)}
        </>
      );
    case "frog":
      return (
        <>
          <circle cx="68" cy="42" r="15" fill="#fff" />
          <circle cx="152" cy="42" r="15" fill="#fff" />
          {dotEye(70, 44)}
          {dotEye(150, 44)}
          <path d="M72 108 q38 32 76 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          {blush(100, 48)}
        </>
      );
    case "chick":
      return (
        <>
          {dotEye(92, 112)}
          {dotEye(128, 112)}
          <path d="M100 124 l10 -6 l10 6 l-10 7z" fill={accent} />
          {blush(126, 34)}
        </>
      );
    default:
      void fur;
      return null;
  }
}

// ---------- color helpers ----------

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (v: number) =>
    Math.round(Math.max(0, Math.min(255, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function isLight(hex: string) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
