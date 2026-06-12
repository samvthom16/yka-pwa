"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Terminal, Minus,
  Image, Link2, Link2Off,
} from "lucide-react";
import { useLinkEditor } from "./useLinkEditor";

interface Props {
  editor: Editor;
  isFocused: boolean;
}

/* ── Formatting button ──────────────────────────────────────── */
function Btn({
  active,
  onPointerDown,
  title,
  children,
}: {
  active?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onPointerDown={onPointerDown}
      className={`flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 transition-colors ${
        active ? "bg-gray-900 text-white" : "text-gray-600 active:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-100 mx-0.5 flex-shrink-0 self-center" />;
}

/* Keep editor focused when pressing toolbar buttons */
const pd =
  (fn: () => void) =>
  (e: React.PointerEvent) => {
    e.preventDefault();
    fn();
  };

/* ── Toolbar ─────────────────────────────────────────────────── */
export default function MobileFormattingSheet({ editor, isFocused }: Props) {
  const { linkMode, linkInput, setLinkInput, openLink, applyLink, cancelLink } =
    useLinkEditor(editor, { focus: false });

  /* Track keyboard height so toolbar sits exactly above the keyboard */
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setKeyboardHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  /* Reset link state when toolbar hides */
  const visible = isFocused || linkMode;
  useEffect(() => {
    if (!visible) cancelLink();
  }, [visible, cancelLink]);

  /* Handle image file → insert as figure with data URL */
  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      editor.chain().focus().setFigureImage({ src: ev.target?.result as string, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="fixed left-0 right-0 z-[150] bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{
        /* Instant bottom update — no CSS transition — so bar tracks keyboard without lag */
        bottom: keyboardHeight,
        paddingBottom: keyboardHeight > 0 ? 0 : "env(safe-area-inset-bottom, 0px)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.12s ease",
      }}
    >
      {linkMode ? (
        /* ── Link URL input ──────────────────────────────────── */
        <div className="flex items-center gap-2 px-4 py-2">
          <input
            autoFocus
            type="url"
            inputMode="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
              if (e.key === "Escape") cancelLink();
            }}
            placeholder="Paste or type URL…"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-base text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-400 transition-colors"
          />
          <button
            onPointerDown={(e) => { e.preventDefault(); applyLink(); }}
            className="h-11 px-4 text-sm font-medium bg-gray-900 text-white rounded-xl active:bg-gray-700 flex-shrink-0"
          >
            Apply
          </button>
          <button
            onPointerDown={(e) => { e.preventDefault(); cancelLink(); }}
            className="h-11 px-3 text-sm text-gray-400 active:text-gray-700 flex-shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* ── Formatting toolbar (scrollable) ─────────────────── */
        <div className="flex items-center gap-0 px-1.5 py-1 overflow-x-auto scrollbar-none">

          {/* Headings */}
          <Btn active={editor.isActive("heading", { level: 1 })} title="Heading 1"
            onPointerDown={pd(() => editor.chain().toggleHeading({ level: 1 }).run())}>
            <span className="text-[13px] font-bold">H1</span>
          </Btn>
          <Btn active={editor.isActive("heading", { level: 2 })} title="Heading 2"
            onPointerDown={pd(() => editor.chain().toggleHeading({ level: 2 }).run())}>
            <span className="text-[13px] font-bold">H2</span>
          </Btn>
          <Btn active={editor.isActive("heading", { level: 3 })} title="Heading 3"
            onPointerDown={pd(() => editor.chain().toggleHeading({ level: 3 }).run())}>
            <span className="text-[13px] font-bold">H3</span>
          </Btn>

          <Sep />

          {/* Inline formatting */}
          <Btn active={editor.isActive("bold")} title="Bold"
            onPointerDown={pd(() => editor.chain().toggleBold().run())}>
            <Bold size={16} />
          </Btn>
          <Btn active={editor.isActive("italic")} title="Italic"
            onPointerDown={pd(() => editor.chain().toggleItalic().run())}>
            <Italic size={16} />
          </Btn>
          <Btn active={editor.isActive("underline")} title="Underline"
            onPointerDown={pd(() => editor.chain().toggleUnderline().run())}>
            <Underline size={16} />
          </Btn>
          <Btn active={editor.isActive("strike")} title="Strikethrough"
            onPointerDown={pd(() => editor.chain().toggleStrike().run())}>
            <Strikethrough size={16} />
          </Btn>
          <Btn active={editor.isActive("code")} title="Inline code"
            onPointerDown={pd(() => editor.chain().toggleCode().run())}>
            <Code size={16} />
          </Btn>

          <Sep />

          {/* Alignment */}
          <Btn active={editor.isActive({ textAlign: "left" })} title="Align left"
            onPointerDown={pd(() => editor.chain().setTextAlign("left").run())}>
            <AlignLeft size={16} />
          </Btn>
          <Btn active={editor.isActive({ textAlign: "center" })} title="Align center"
            onPointerDown={pd(() => editor.chain().setTextAlign("center").run())}>
            <AlignCenter size={16} />
          </Btn>
          <Btn active={editor.isActive({ textAlign: "right" })} title="Align right"
            onPointerDown={pd(() => editor.chain().setTextAlign("right").run())}>
            <AlignRight size={16} />
          </Btn>
          <Btn active={editor.isActive({ textAlign: "justify" })} title="Justify"
            onPointerDown={pd(() => editor.chain().setTextAlign("justify").run())}>
            <AlignJustify size={16} />
          </Btn>

          <Sep />

          {/* Block types */}
          <Btn active={editor.isActive("bulletList")} title="Bullet list"
            onPointerDown={pd(() => editor.chain().toggleBulletList().run())}>
            <List size={16} />
          </Btn>
          <Btn active={editor.isActive("orderedList")} title="Ordered list"
            onPointerDown={pd(() => editor.chain().toggleOrderedList().run())}>
            <ListOrdered size={16} />
          </Btn>
          <Btn active={editor.isActive("blockquote")} title="Blockquote"
            onPointerDown={pd(() => editor.chain().toggleBlockquote().run())}>
            <Quote size={16} />
          </Btn>
          <Btn active={editor.isActive("codeBlock")} title="Code block"
            onPointerDown={pd(() => editor.chain().toggleCodeBlock().run())}>
            <Terminal size={16} />
          </Btn>

          <Sep />

          {/* Insert */}
          <Btn title="Divider" onPointerDown={pd(() => editor.chain().setHorizontalRule().run())}>
            <Minus size={16} />
          </Btn>

          {/* Image — label wraps input directly; most reliable file-picker trigger on iOS */}
          <label
            title="Insert image"
            className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0 text-gray-600 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <Image size={16} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = "";
              }}
            />
          </label>

          {/* Link */}
          {editor.isActive("link") ? (
            <Btn active title="Remove link"
              onPointerDown={pd(() => editor.chain().unsetLink().run())}>
              <Link2Off size={16} />
            </Btn>
          ) : (
            <Btn title="Add link"
              onPointerDown={(e) => { e.preventDefault(); openLink(); }}>
              <Link2 size={16} />
            </Btn>
          )}

          {/* Right padding spacer */}
          <div className="w-2 flex-shrink-0" />
        </div>
      )}

    </div>
  );
}
