import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { bridge } from "./bridge";

type Command = {
  title: string;
  hint: string;
  icon: string;
  keywords: string;
  run: (editor: Editor, range: Range) => void;
};

const chain = (e: Editor, r: Range) => e.chain().focus().deleteRange(r);

export const COMMANDS: Command[] = [
  { title: "Heading", hint: "Big title", icon: "H1", keywords: "h1 title heading", run: (e, r) => chain(e, r).setNode("heading", { level: 1 }).run() },
  { title: "Subheading", hint: "Medium title", icon: "H2", keywords: "h2 subtitle heading", run: (e, r) => chain(e, r).setNode("heading", { level: 2 }).run() },
  { title: "Small heading", hint: "Section", icon: "H3", keywords: "h3 heading", run: (e, r) => chain(e, r).setNode("heading", { level: 3 }).run() },
  { title: "Checklist", hint: "To-dos", icon: "☑", keywords: "todo task check list", run: (e, r) => chain(e, r).toggleTaskList().run() },
  { title: "Bullet list", hint: "• • •", icon: "•", keywords: "ul bullet list", run: (e, r) => chain(e, r).toggleBulletList().run() },
  { title: "Numbered list", hint: "1. 2. 3.", icon: "1.", keywords: "ol number ordered list", run: (e, r) => chain(e, r).toggleOrderedList().run() },
  { title: "Image", hint: "From your files", icon: "🖼", keywords: "image picture photo img", run: (e, r) => { chain(e, r).run(); bridge.pickImage(); } },
  { title: "Sticker", hint: "Cute things", icon: "🍓", keywords: "sticker emoji", run: (e, r) => { chain(e, r).run(); bridge.openStickers(); } },
  { title: "Table", hint: "3 × 3 grid", icon: "▦", keywords: "table grid", run: (e, r) => chain(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Formula", hint: "Inline maths", icon: "∑", keywords: "math formula latex equation katex", run: (e, r) => { chain(e, r).run(); bridge.openMath({ kind: "inline", latex: "" }); } },
  { title: "Formula block", hint: "Centered maths", icon: "∫", keywords: "math formula block display latex equation", run: (e, r) => { chain(e, r).run(); bridge.openMath({ kind: "block", latex: "" }); } },
  { title: "Arrow", hint: "Draw an arrow", icon: "↗", keywords: "arrow draw", run: (e, r) => { chain(e, r).run(); bridge.startDrawing("arrow"); } },
  { title: "Shape", hint: "Box or circle", icon: "◯", keywords: "shape rect box circle ellipse draw", run: (e, r) => { chain(e, r).run(); bridge.startDrawing("rect"); } },
  { title: "Pen", hint: "Freehand", icon: "✎", keywords: "pen draw doodle sketch", run: (e, r) => { chain(e, r).run(); bridge.startDrawing("pen"); } },
  { title: "Sticky note", hint: "Text anywhere", icon: "🗒", keywords: "note sticky text box", run: (e, r) => { chain(e, r).run(); bridge.startDrawing("note"); } },
  { title: "Quote", hint: "Someone said", icon: "❝", keywords: "quote blockquote", run: (e, r) => chain(e, r).toggleBlockquote().run() },
  { title: "Code", hint: "Monospace block", icon: "</>", keywords: "code snippet", run: (e, r) => chain(e, r).toggleCodeBlock().run() },
  { title: "Divider", hint: "Line across", icon: "—", keywords: "hr divider line separator", run: (e, r) => chain(e, r).setHorizontalRule().run() },
];

function filter(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return COMMANDS;
  return COMMANDS.filter((c) => c.title.toLowerCase().includes(q) || c.keywords.includes(q));
}

type ListHandle = { onKeyDown: (p: SuggestionKeyDownProps) => boolean };

const SlashList = forwardRef<ListHandle, SuggestionProps<Command>>(function SlashList(props, ref) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [props.items]);

  const pick = (i: number) => {
    const item = props.items[i];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      const n = props.items.length;
      if (!n) return false;
      if (event.key === "ArrowDown") return setIndex((i) => (i + 1) % n), true;
      if (event.key === "ArrowUp") return setIndex((i) => (i + n - 1) % n), true;
      if (event.key === "Enter" || event.key === "Tab") return pick(index), true;
      return false;
    },
  }));

  if (!props.items.length) return <div className="slash-menu empty">No match — keep typing</div>;
  return (
    <div className="slash-menu" role="listbox">
      {props.items.map((c, i) => (
        <button
          key={c.title}
          className={i === index ? "on" : ""}
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            pick(i);
          }}
        >
          <span className="slash-icon">{c.icon}</span>
          <span className="slash-text">
            <b>{c.title}</b>
            <small>{c.hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
});

export const SlashCommands = Extension.create({
  name: "slashCommands",
  addProseMirrorPlugins() {
    return [
      Suggestion<Command>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        items: ({ query }) => filter(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<ListHandle, SuggestionProps<Command>> | null = null;
          const place = (props: SuggestionProps<Command>) => {
            const el = renderer?.element as HTMLElement | undefined;
            const rect = props.clientRect?.();
            if (!el || !rect) return;
            computePosition({ getBoundingClientRect: () => rect }, el, {
              placement: "bottom-start",
              strategy: "fixed",
              middleware: [offset(8), flip(), shift({ padding: 8 })],
            }).then(({ x, y }) => Object.assign(el.style, { left: `${x}px`, top: `${y}px` }));
          };
          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashList, { props, editor: props.editor });
              const el = renderer.element as HTMLElement;
              el.style.position = "fixed";
              el.style.zIndex = "50";
              document.body.appendChild(el);
              place(props);
            },
            onUpdate: (props) => {
              renderer?.updateProps(props);
              place(props);
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                renderer?.destroy();
                renderer?.element.remove();
                renderer = null;
                return true;
              }
              return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              renderer?.element.remove();
              renderer?.destroy();
              renderer = null;
            },
          };
        },
      }),
    ];
  },
});
