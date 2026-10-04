import type { JSONContent } from "@tiptap/react";

export type Character =
  | "capybara"
  | "cat"
  | "bunny"
  | "bear"
  | "frog"
  | "panda"
  | "chick"
  | "plain";

export type Holding =
  | "none"
  | "lemon"
  | "heart"
  | "star"
  | "strawberry"
  | "flower";

export type Cover = {
  character: Character;
  fur: string;
  accent: string;
  /** 0 = short velvet, 1 = very fluffy */
  fluff: number;
  holding: Holding;
  ribbon: string;
  /** Optional file id of a photo that replaces the character art. */
  photo?: string;
};

export type PaperStyle = "ruled" | "margin" | "grid" | "dots" | "blank";
export type PaperFont = "nunito" | "hand" | "serif" | "mono";

export type Paper = {
  style: PaperStyle;
  color: string;
  line: string;
  margin: string;
  /** Line spacing in px; text line-height snaps to it. */
  spacing: number;
  font: PaperFont;
  ink: string;
};

/** Password lock: only a salted PBKDF2 hash is stored (and synced). */
export type NotepadLock = {
  salt: string;
  hash: string;
  iterations: number;
  hint?: string;
};

export type Notepad = {
  id: string;
  title: string;
  order: number;
  cover: Cover;
  paper: Paper;
  lock?: NotepadLock;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
};

export type Pt = number; // flattened [x, y, pressure, x, y, pressure, ...]

export type OverlayItem =
  | {
      id: string;
      t: "pen";
      pts: Pt[];
      color: string;
      size: number;
      hl?: boolean;
    }
  | {
      id: string;
      t: "line" | "arrow" | "rect" | "ellipse";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      size: number;
      fill?: string;
    }
  | {
      id: string;
      t: "sticker";
      x: number;
      y: number;
      s: number;
      r: number;
      /** Built-in sticker key, emoji ("e:🍓") or file ("f:<fileId>") */
      k: string;
    }
  | {
      id: string;
      t: "note";
      x: number;
      y: number;
      w: number;
      text: string;
      color: string;
      r: number;
    };

export type Page = {
  id: string;
  notepadId: string;
  order: number;
  doc: JSONContent | null;
  overlay: OverlayItem[];
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
};

export type RecordKind = "notepad" | "page";

/** Local bookkeeping: `dirty` means not yet accepted by the server. */
export type Stored<T> = T & { dirty?: 0 | 1 };
