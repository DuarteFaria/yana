import type { ReactNode } from "react";
import { useFileUrl } from "../lib/files";

// Die-cut vinyl stickers: every shape gets a thick white outline drawn under
// its fill (paint-order: stroke) plus a soft drop shadow via CSS.

const O = { stroke: "#fff", strokeWidth: 9, paintOrder: "stroke", strokeLinejoin: "round" } as const;

export const STICKERS: Record<string, { label: string; art: ReactNode }> = {
  heart: {
    label: "Heart",
    art: <path {...O} d="M50 86 C14 62 12 32 32 24 C42 20 50 28 50 34 C50 28 58 20 68 24 C88 32 86 62 50 86Z" fill="#ff7b93" />,
  },
  star: {
    label: "Star",
    art: <path {...O} d="M50 10 l11.8 24 26.4 3.8 -19.1 18.6 4.5 26.3 -23.6 -12.4 -23.6 12.4 4.5 -26.3 -19.1 -18.6 26.4 -3.8z" fill="#ffd84d" />,
  },
  sparkle: {
    label: "Sparkle",
    art: (
      <g {...O}>
        <path d="M44 12 C47 38 54 44 80 47 C54 50 47 56 44 84 C41 56 34 50 8 47 C34 44 41 38 44 12Z" fill="#b7a6e0" />
        <path d="M78 10 C79 20 82 22 90 23 C82 24 79 26 78 36 C77 26 74 24 66 23 C74 22 77 20 78 10Z" fill="#9ec3ea" />
      </g>
    ),
  },
  cloud: {
    label: "Cloud",
    art: (
      <g>
        <path {...O} d="M26 74 C10 74 8 52 24 50 C22 34 42 28 50 40 C56 24 82 28 80 48 C96 50 94 74 78 74Z" fill="#eaf4ff" />
        <path d="M40 58 q3 -3 6 0 M56 58 q3 -3 6 0" stroke="#2b2224" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx="36" cy="64" rx="4" ry="2.5" fill="#f59aa6" />
        <ellipse cx="66" cy="64" rx="4" ry="2.5" fill="#f59aa6" />
      </g>
    ),
  },
  flower: {
    label: "Flower",
    art: (
      <g {...O}>
        {[0, 72, 144, 216, 288].map((a) => (
          <circle key={a} cx={50 + 20 * Math.cos(((a - 90) * Math.PI) / 180)} cy={50 + 20 * Math.sin(((a - 90) * Math.PI) / 180)} r="17" fill="#ffc2d1" />
        ))}
        <circle cx="50" cy="50" r="13" fill="#ffd84d" strokeWidth="0" />
      </g>
    ),
  },
  paw: {
    label: "Paw",
    art: (
      <g {...O} fill="#c79b7a">
        <ellipse cx="50" cy="64" rx="22" ry="18" />
        <ellipse cx="24" cy="40" rx="9" ry="11" />
        <ellipse cx="40" cy="26" rx="9" ry="11" />
        <ellipse cx="60" cy="26" rx="9" ry="11" />
        <ellipse cx="76" cy="40" rx="9" ry="11" />
      </g>
    ),
  },
  lemon: {
    label: "Lemon",
    art: (
      <g>
        <ellipse {...O} cx="50" cy="54" rx="34" ry="28" fill="#ffd84d" />
        <path d="M52 28 q18 -18 32 -4 q-16 12 -32 4z" fill="#7cc36b" />
        <path d="M40 50 q3 -3 6 0 M56 50 q3 -3 6 0 M46 60 q5 4 10 0" stroke="#2b2224" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  strawberry: {
    label: "Strawberry",
    art: (
      <g>
        <path {...O} d="M50 90 C18 72 16 40 30 32 C38 28 62 28 70 32 C84 40 82 72 50 90Z" fill="#ff5a6e" />
        {[[40, 50], [58, 48], [50, 64], [36, 66], [64, 64], [50, 78]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2" ry="3" fill="#ffe28a" />
        ))}
        <path d="M30 33 l10 -12 l10 8 l10 -8 l10 12 q-20 8 -40 0z" fill="#5fb56a" />
      </g>
    ),
  },
  rainbow: {
    label: "Rainbow",
    art: (
      <g fill="none" strokeLinecap="round">
        <path d="M12 74 A38 38 0 0 1 88 74" stroke="#fff" strokeWidth="38" />
        <path d="M16 74 A34 34 0 0 1 84 74" stroke="#ff8fa3" strokeWidth="8" />
        <path d="M24 74 A26 26 0 0 1 76 74" stroke="#ffd84d" strokeWidth="8" />
        <path d="M32 74 A18 18 0 0 1 68 74" stroke="#8fd3b6" strokeWidth="8" />
        <path d="M40 74 A10 10 0 0 1 60 74" stroke="#9ec3ea" strokeWidth="8" />
      </g>
    ),
  },
  moon: {
    label: "Moon",
    art: <path {...O} d="M62 12 C36 16 22 40 30 62 C38 84 66 92 86 76 C60 78 44 56 50 36 C53 26 58 18 62 12Z" fill="#ffe28a" />,
  },
  cat: {
    label: "Kitty",
    art: (
      <g>
        <path {...O} d="M16 40 L20 10 L40 26 C46 24 54 24 60 26 L80 10 L84 40 C92 64 76 86 50 86 C24 86 8 64 16 40Z" fill="#4b4b52" />
        <path d="M34 54 q5 -5 10 0 M56 54 q5 -5 10 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M46 62 h8 l-4 4z" fill="#f7b6c2" />
      </g>
    ),
  },
  bunny: {
    label: "Bunny",
    art: (
      <g>
        <g {...O} fill="#f6dfe6">
          <ellipse cx="36" cy="26" rx="10" ry="22" />
          <ellipse cx="64" cy="26" rx="10" ry="22" />
          <circle cx="50" cy="62" r="28" />
        </g>
        <circle cx="40" cy="60" r="3.5" fill="#2b2224" />
        <circle cx="60" cy="60" r="3.5" fill="#2b2224" />
        <ellipse cx="50" cy="68" rx="3" ry="2" fill="#f28ea0" />
      </g>
    ),
  },
  tape: {
    label: "Washi tape",
    art: (
      <g transform="rotate(-8 50 50)">
        <rect x="4" y="36" width="92" height="28" fill="#ffc2d1" opacity="0.85" />
        {[10, 24, 38, 52, 66, 80].map((x) => (
          <circle key={x} cx={x + 4} cy="50" r="3" fill="#fff" opacity="0.9" />
        ))}
      </g>
    ),
  },
  tapeMint: {
    label: "Mint tape",
    art: (
      <g transform="rotate(6 50 50)">
        <rect x="4" y="36" width="92" height="28" fill="#a8e6cf" opacity="0.85" />
        {[0, 16, 32, 48, 64, 80].map((x) => (
          <path key={x} d={`M${x + 6} 36 l8 28`} stroke="#fff" strokeWidth="4" opacity="0.7" />
        ))}
      </g>
    ),
  },
  done: {
    label: "Done!",
    art: (
      <g>
        <circle {...O} cx="50" cy="50" r="36" fill="#8fd3b6" />
        <path d="M34 50 l11 11 l22 -24" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  yay: {
    label: "Yay!",
    art: (
      <g>
        <path {...O} d="M14 22 H86 Q92 22 92 28 V62 Q92 68 86 68 H40 L26 82 L28 68 H14 Q8 68 8 62 V28 Q8 22 14 22Z" fill="#fff3a6" />
        <text x="50" y="54" textAnchor="middle" fontFamily="Gluten" fontWeight="700" fontSize="26" fill="#e76f51">yay!</text>
      </g>
    ),
  },
};

export const EMOJI = [
  "🍓", "🍋", "🌸", "🌷", "🌈", "⭐️", "✨", "💖", "🧸", "🐱", "🐰", "🐻",
  "🐸", "🐼", "🐥", "🦫", "☕️", "🍰", "🍩", "🎀", "📌", "📎", "✏️", "📚",
  "💡", "✅", "❗️", "❓", "🔥", "💤", "🎉", "🌙", "☀️", "🍀", "🫶", "👀",
];

export function StickerArt({ k, size }: { k: string; size: number }) {
  if (k.startsWith("e:")) {
    return (
      <span className="sticker-emoji" style={{ fontSize: size * 0.78, lineHeight: `${size}px`, width: size, height: size }}>
        {k.slice(2)}
      </span>
    );
  }
  if (k.startsWith("f:")) return <FileSticker id={k.slice(2)} size={size} />;
  const s = STICKERS[k];
  return (
    <svg className="sticker-svg" viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible" }}>
      {s?.art}
    </svg>
  );
}

function FileSticker({ id, size }: { id: string; size: number }) {
  const url = useFileUrl(id);
  return url ? (
    <img className="sticker-img" src={url} alt="" draggable={false} style={{ width: size, height: size, objectFit: "contain" }} />
  ) : (
    <span style={{ width: size, height: size, display: "inline-block" }} />
  );
}
