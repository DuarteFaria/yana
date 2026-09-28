import { useState, type CSSProperties, type ReactNode } from "react";
import { saveFile } from "../lib/files";
import { paperStyle } from "../lib/paper";
import {
  CHARACTERS,
  FONTS,
  FUR_SWATCHES,
  HOLDINGS,
  LINE_SWATCHES,
  PAPER_STYLES,
  PAPER_SWATCHES,
  PRESETS,
} from "../lib/presets";
import { updateNotepad, useNotepad } from "../lib/store";
import type { Cover as CoverT, Holding, Paper } from "../lib/types";
import { Cover } from "./Cover";
import { Modal, useModalClose } from "./Modal";
import { Segmented } from "./Segmented";

const DETAIL_SWATCHES = ["#ffffff", "#f6f2ee", "#f3dcb8", "#8b5a34", "#2d2d33", "#ffb347", "#f7b6c2", "#e7f3c9"];
const RIBBON_SWATCHES = ["#f2c94c", "#f48fb1", "#e76f51", "#6fcf97", "#7fb3ff", "#b7a6e0", "#ffffff", "#8d8a86"];
const MARGIN_SWATCHES = ["#e76f51", "#e89aa6", "#6b6b4a", "#9ec3ea", "#8fc27f", "#2d2d33"];
const INK_SWATCHES = ["#2b2a22", "#23262d", "#1f3a8a", "#6b2d4a", "#2f5d3a", "#f2efe8"];
const DARK_PAPER = "#2a2a30";
const HOLDING_ICON: Record<Holding, string> = {
  none: "∅",
  lemon: "🍋",
  heart: "🩷",
  star: "⭐️",
  strawberry: "🍓",
  flower: "🌸",
};

export function CoverStudio({ notepadId, onClose }: { notepadId: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide className="studio-modal">
      <StudioBody notepadId={notepadId} />
    </Modal>
  );
}

function StudioBody({ notepadId }: { notepadId: string }) {
  const n = useNotepad(notepadId);
  const close = useModalClose();
  const [tab, setTab] = useState<"cover" | "pages">("cover");
  const [matchPages, setMatchPages] = useState(true);
  if (!n) return null;

  const setCover = (patch: Partial<CoverT>) => updateNotepad(n.id, { cover: { ...n.cover, ...patch } });
  const setPaper = (patch: Partial<Paper>) => updateNotepad(n.id, { paper: { ...n.paper, ...patch } });

  return (
    <div className="studio">
      <aside className="stage" aria-hidden>
        <div className="stage-paper" style={paperStyle(n.paper, true)}>
          <p>Dear diary,</p>
          <p>today I wrote</p>
          <p>something cute ✿</p>
        </div>
        <div className="stage-cover" key={n.cover.character}>
          <Cover cover={n.cover} width={178} />
        </div>
        <span className="stage-note">changes save as you go</span>
      </aside>

      <div className="studio-panel">
        <input
          className="studio-title"
          value={n.title}
          placeholder="Name your notepad"
          onChange={(e) => updateNotepad(n.id, { title: e.target.value })}
          aria-label="Notepad name"
        />
        <Segmented
          className="studio-tabs"
          value={tab}
          onChange={setTab}
          options={[
            { key: "cover", label: "Cover" },
            { key: "pages", label: "Pages" },
          ]}
        />

        <div className="studio-scroll" key={tab}>
          {tab === "cover" ? (
            <>
              <Section
                title="Friend"
                aside={
                  <label className="switch-label">
                    <span className="switch">
                      <input type="checkbox" checked={matchPages} onChange={(e) => setMatchPages(e.target.checked)} />
                      <span />
                    </span>
                    matching pages
                  </label>
                }
              >
                <div className="friends">
                  {CHARACTERS.map((c) => (
                    <button
                      key={c}
                      className={`friend ${n.cover.character === c ? "on" : ""}`}
                      onClick={() =>
                        updateNotepad(n.id, {
                          cover: { ...PRESETS[c].cover, photo: n.cover.photo },
                          ...(matchPages ? { paper: { ...PRESETS[c].paper } } : {}),
                        })
                      }
                    >
                      <Cover cover={PRESETS[c].cover} width={46} />
                      <span>{PRESETS[c].name}</span>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Colours">
                <Row label="Fur">
                  <Swatches value={n.cover.fur} options={FUR_SWATCHES} onChange={(fur) => setCover({ fur })} />
                </Row>
                <Row label="Details">
                  <Swatches value={n.cover.accent} options={DETAIL_SWATCHES} onChange={(accent) => setCover({ accent })} />
                </Row>
                <Row label="Ribbon">
                  <Swatches value={n.cover.ribbon} options={RIBBON_SWATCHES} onChange={(ribbon) => setCover({ ribbon })} />
                </Row>
              </Section>

              <Section title="Fluffiness">
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={n.cover.fluff}
                  onChange={(fluff) => setCover({ fluff })}
                  left="velvet"
                  right="extra fluffy"
                />
              </Section>

              <Section title="Holding">
                <div className="chips">
                  {HOLDINGS.map((h) => (
                    <button
                      key={h.key}
                      className={`chip ${n.cover.holding === h.key ? "on" : ""}`}
                      onClick={() => setCover({ holding: h.key })}
                    >
                      <span className="chip-icon">{HOLDING_ICON[h.key]}</span>
                      {h.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Photo" aside={<span className="muted small">replaces the friend</span>}>
                <div className="row">
                  <label className="btn small">
                    {n.cover.photo ? "Change photo" : "Choose a photo…"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setCover({ photo: await saveFile(f) });
                      }}
                    />
                  </label>
                  {n.cover.photo && (
                    <button className="btn small ghost" onClick={() => setCover({ photo: undefined })}>
                      Remove
                    </button>
                  )}
                </div>
              </Section>
            </>
          ) : (
            <>
              <Section title="Paper">
                <div className="paper-styles">
                  {PAPER_STYLES.map((s) => (
                    <button
                      key={s.key}
                      className={`paper-style ${n.paper.style === s.key ? "on" : ""}`}
                      onClick={() => setPaper({ style: s.key })}
                    >
                      <span className="paper-swatch" style={paperStyle({ ...n.paper, style: s.key, spacing: 9 }, true)} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Colours">
                <Row label="Paper">
                  <Swatches
                    value={n.paper.color}
                    options={PAPER_SWATCHES}
                    onChange={(color) =>
                      setPaper({
                        color,
                        // keep ink readable when switching to / from dark paper
                        ink: color === DARK_PAPER ? "#f2efe8" : n.paper.ink === "#f2efe8" ? "#2b2a22" : n.paper.ink,
                      })
                    }
                  />
                </Row>
                <Row label="Lines">
                  <Swatches value={n.paper.line} options={LINE_SWATCHES} onChange={(line) => setPaper({ line })} />
                </Row>
                {n.paper.style === "margin" && (
                  <Row label="Margin">
                    <Swatches value={n.paper.margin} options={MARGIN_SWATCHES} onChange={(margin) => setPaper({ margin })} />
                  </Row>
                )}
                <Row label="Ink">
                  <Swatches value={n.paper.ink} options={INK_SWATCHES} onChange={(ink) => setPaper({ ink })} />
                </Row>
              </Section>

              <Section title="Line spacing" aside={<span className="value-pill">{n.paper.spacing}px</span>}>
                <Slider
                  min={22}
                  max={42}
                  step={1}
                  value={n.paper.spacing}
                  onChange={(spacing) => setPaper({ spacing })}
                  left="cosy"
                  right="airy"
                />
              </Section>

              <Section title="Writing">
                <div className="fonts">
                  {FONTS.map((f) => (
                    <button
                      key={f.key}
                      className={`font-card ${n.paper.font === f.key ? "on" : ""}`}
                      onClick={() => setPaper({ font: f.key })}
                    >
                      <span className="font-sample" style={{ fontFamily: f.css }}>
                        Aa
                      </span>
                      {f.label}
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>

        <footer className="studio-footer">
          <button className="btn primary" onClick={close}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="st-sec">
      <div className="st-sec-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <span className="st-row-label">{label}</span>
      {children}
    </div>
  );
}

function Slider({
  min,
  max,
  step,
  value,
  onChange,
  left,
  right,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <span>{left}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span>{right}</span>
    </div>
  );
}

export function Swatches({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const custom = !options.some((c) => c.toLowerCase() === value.toLowerCase());
  return (
    <div className="swatches">
      {options.map((c) => (
        <button
          key={c}
          className={`swatch ${value.toLowerCase() === c.toLowerCase() ? "on" : ""}`}
          style={{ "--c": c } as CSSProperties}
          onClick={() => onChange(c)}
          aria-label={c}
        />
      ))}
      <label className={`swatch custom ${custom ? "on" : ""}`} title="Pick any colour" style={custom ? ({ "--c": value } as CSSProperties) : undefined}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
