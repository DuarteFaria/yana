import { useId } from "react";
import { Clock, Window } from "./WallArt";

/** The cosy half of the room: window, swivel chair, side table and rug. */
export function ReadingCorner() {
  return (
    <aside className="corner" aria-hidden>
      <div className="corner-clock">
        <Clock />
      </div>
      <div className="corner-window">
        <Window />
      </div>
      <Rug />
      <div className="corner-chair">
        <Chair />
      </div>
      <div className="corner-table">
        <SideTable />
      </div>
    </aside>
  );
}

function Chair() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const cord = `cord-${id}`;
  const shade = `shade-${id}`;
  const chrome = `chrome-${id}`;
  const knit = `knit-${id}`;
  const tufts = [
    [140, 60],
    [195, 56],
    [250, 60],
    [135, 110],
    [195, 106],
    [255, 110],
    [165, 150],
    [225, 150],
  ];
  return (
    <svg viewBox="0 0 340 350" className="chair" overflow="visible">
      <defs>
        <pattern id={cord} width="7" height="10" patternUnits="userSpaceOnUse">
          <rect width="7" height="10" fill="#2e9c56" />
          <rect width="3" height="10" fill="#38ad63" />
        </pattern>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#0a3a1c" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={chrome} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.5" stopColor="#9aa1a8" />
          <stop offset="1" stopColor="#e2e6ea" />
        </linearGradient>
        <pattern id={knit} width="12" height="8" patternUnits="userSpaceOnUse">
          <rect width="12" height="8" fill="#f7b6c2" />
          <path d="M0 0 L6 8 L12 0" stroke="#f29fb0" strokeWidth="2" fill="none" />
        </pattern>
      </defs>

      {/* floor shadow */}
      <ellipse cx="172" cy="344" rx="150" ry="10" fill="#3b2415" opacity="0.22" />

      {/* star base + stem */}
      <g stroke={`url(#${chrome})`} strokeWidth="8" strokeLinecap="round">
        <path d="M172 300 L46 322" />
        <path d="M172 300 L300 322" />
        <path d="M172 300 L112 342" />
        <path d="M172 300 L230 342" />
        <path d="M172 300 L176 318" />
      </g>
      {[
        [46, 322],
        [300, 322],
        [112, 342],
        [230, 342],
      ].map(([x, y]) => (
        <circle key={`${x}`} cx={x} cy={y} r="5" fill="#6b7178" />
      ))}
      <rect x="164" y="244" width="17" height="58" rx="5" fill={`url(#${chrome})`} />
      <ellipse cx="172" cy="300" rx="16" ry="6" fill="#8a9097" />

      <g className="chair-body">
        {/* backrest */}
        <path d="M112 12 Q196 -8 284 14 Q318 24 314 64 L302 214 Q200 232 96 218 L86 62 Q84 20 112 12Z" fill={`url(#${cord})`} />
        <path d="M112 12 Q196 -8 284 14 Q318 24 314 64 L302 214 Q200 232 96 218 L86 62 Q84 20 112 12Z" fill={`url(#${shade})`} />
        {tufts.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y + 2} rx="11" ry="8" fill="#1f7a40" opacity="0.22" />
            <ellipse cx={x} cy={y - 3} rx="10" ry="6" fill="#fff" opacity="0.08" />
            <circle cx={x} cy={y} r="3.4" fill="#1e6b39" />
          </g>
        ))}
        {/* seat */}
        <path d="M40 176 Q26 152 72 150 L298 152 Q338 156 336 194 L332 238 Q200 266 42 248 Q14 240 20 212Z" fill={`url(#${cord})`} />
        <path d="M40 176 Q26 152 72 150 L298 152 Q338 156 336 194 L332 238 Q200 266 42 248 Q14 240 20 212Z" fill={`url(#${shade})`} />
        <path d="M44 184 Q180 200 330 186" stroke="#1f7a40" strokeWidth="3" fill="none" opacity="0.45" />
        {/* knitted blanket over the right side */}
        <path className="blanket" d="M262 20 Q300 26 306 62 L312 200 Q322 240 314 286 L276 290 Q282 240 270 200 L256 60 Q254 34 262 20Z" fill={`url(#${knit})`} />
        <path d="M278 290 l4 12 M290 289 l3 12 M302 288 l3 12" stroke="#f29fb0" strokeWidth="3" strokeLinecap="round" />
        {/* little cushion */}
        <g transform="rotate(-10 140 150)">
          <rect x="104" y="116" width="74" height="54" rx="22" fill="#ffe28a" />
          <path d="M141 118 v50 M106 143 h70" stroke="#f2c94c" strokeWidth="2" />
          <circle cx="141" cy="143" r="4" fill="#f2b632" />
        </g>
      </g>
    </svg>
  );
}

function SideTable() {
  return (
    <svg viewBox="0 0 170 260" className="side-table" overflow="visible">
      <defs>
        <radialGradient id="lamp-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lamp-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe3a1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="85" cy="256" rx="62" ry="6" fill="#3b2415" opacity="0.22" />
      {/* lamp light (visible in the evening) */}
      <circle className="lamp-glow" cx="70" cy="40" r="110" fill="url(#lamp-glow)" />
      <path className="lamp-glow" d="M44 58 L96 58 L140 250 L0 250Z" fill="url(#lamp-cone)" />
      {/* table */}
      <ellipse cx="85" cy="128" rx="72" ry="12" fill="#9c5c30" />
      <ellipse cx="85" cy="124" rx="72" ry="12" fill="#c98a55" />
      <rect x="78" y="132" width="14" height="112" rx="5" fill="#9c5c30" />
      <ellipse cx="85" cy="248" rx="40" ry="8" fill="#86491f" />
      {/* lamp */}
      <path d="M58 118 Q52 96 70 86 Q88 96 82 118Z" fill="#8fd3b6" />
      <rect x="67" y="58" width="6" height="30" fill="#c9a15a" />
      <path className="lampshade" d="M44 60 L96 60 L84 20 L56 20Z" fill="#fbf1dc" stroke="#e8d6bc" strokeWidth="2" />
      {/* mug with steam */}
      <g>
        {[112, 124].map((x, i) => (
          <path key={x} className="dc-steam" style={{ animationDelay: `${i * 1.1}s` }} d={`M${x} 92 q-5 -7 0 -12 q5 -6 0 -12`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ))}
        <rect x="104" y="96" width="28" height="24" rx="5" fill="#ff8fa3" />
        <path d="M132 102 q9 0 8 7 q-1 6 -8 5" stroke="#ff8fa3" strokeWidth="4" fill="none" />
        <path d="M110 104 h14" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* book leaning on the leg */}
      <g transform="rotate(-14 120 244)">
        <rect x="108" y="196" width="16" height="50" rx="2" fill="#6b2d4a" />
        <rect x="108" y="204" width="16" height="3" fill="#f2d98d" />
      </g>
    </svg>
  );
}

function Rug() {
  return (
    <svg className="corner-rug" viewBox="0 0 600 90" preserveAspectRatio="none">
      <ellipse cx="300" cy="45" rx="296" ry="42" fill="#e9a37f" />
      <ellipse cx="300" cy="45" rx="264" ry="32" fill="none" stroke="#fbf1dc" strokeWidth="5" strokeDasharray="14 10" />
      <ellipse cx="300" cy="45" rx="220" ry="22" fill="#f4b89a" />
      <ellipse cx="300" cy="45" rx="150" ry="12" fill="none" stroke="#e76f51" strokeWidth="4" />
    </svg>
  );
}
