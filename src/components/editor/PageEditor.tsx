import { Mathematics } from "@tiptap/extension-mathematics";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { EditorView } from "@tiptap/pm/view";
import { useEffect, useRef } from "react";
import { saveFile } from "../../lib/files";
import { getPage, updatePage, useRemoteRev } from "../../lib/store";
import type { Page } from "../../lib/types";
import { bridge } from "./bridge";
import { Figure } from "./Figure";
import { SlashCommands } from "./SlashCommands";

const SAVE_DELAY = 350;

export function PageEditor({ page, onEditor }: { page: Page; onEditor: (e: Editor | null) => void }) {
  const saveTimer = useRef<number | undefined>(undefined);
  const pageId = page.id;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
          undoRedo: { depth: 300 },
        }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TableKit.configure({ table: { resizable: true, cellMinWidth: 60 } }),
        Mathematics.configure({
          katexOptions: { throwOnError: false },
          inlineOptions: { onClick: (node, pos) => bridge.openMath({ kind: "inline", latex: node.attrs.latex, pos }) },
          blockOptions: { onClick: (node, pos) => bridge.openMath({ kind: "block", latex: node.attrs.latex, pos }) },
        }),
        Placeholder.configure({
          placeholder: ({ editor, node }) =>
            node.type.name === "heading"
              ? "Title"
              : editor.isEmpty
                ? "Start writing… type / for stickers, tables, formulas and more"
                : "",
        }),
        Figure,
        SlashCommands,
      ],
      content: page.doc ?? "",
      autofocus: page.doc ? false : "end",
      editorProps: {
        attributes: { spellcheck: "true", class: "page-text" },
        handlePaste: (view, event) => insertImages(view, event.clipboardData?.files),
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          return insertImages(view, event.dataTransfer?.files, at);
        },
      },
      onUpdate: ({ editor }) => {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          saveTimer.current = undefined;
          updatePage(pageId, { doc: editor.getJSON() });
        }, SAVE_DELAY);
      },
    },
    [pageId],
  );

  // Flush pending edits when leaving the page or hiding the app.
  useEffect(() => {
    if (!editor) return;
    const flush = () => {
      if (saveTimer.current === undefined) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = undefined;
      if (!editor.isDestroyed) updatePage(pageId, { doc: editor.getJSON() });
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    editor.on("blur", flush);
    return () => {
      flush();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      editor.off("blur", flush);
    };
  }, [editor, pageId]);

  // Another device changed this page: load its version.
  const remoteRev = useRemoteRev(pageId);
  const seenRev = useRef(remoteRev);
  useEffect(() => {
    if (!editor || remoteRev === seenRev.current) return;
    seenRev.current = remoteRev;
    const doc = getPage(pageId)?.doc;
    if (doc) editor.commands.setContent(doc, { emitUpdate: false });
  }, [editor, remoteRev, pageId]);

  useEffect(() => {
    onEditor(editor);
    return () => onEditor(null);
  }, [editor, onEditor]);

  return <EditorContent editor={editor} className="page-editor" />;
}

function insertImages(view: EditorView, files: FileList | undefined | null, at?: number) {
  const images = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
  if (!images.length) return false;
  (async () => {
    for (const f of images) {
      const fileId = await saveFile(f);
      const float = f.type === "image/png" ? "left" : "none";
      const node = view.state.schema.nodes.figure.create({ fileId, float, width: float === "none" ? 420 : 260 });
      const pos = Math.min(at ?? view.state.selection.from, view.state.doc.content.size);
      view.dispatch(view.state.tr.replaceRangeWith(pos, pos, node));
    }
  })();
  return true;
}
