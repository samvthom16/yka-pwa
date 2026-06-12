"use client";

import { useCallback, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Bold, Italic, Underline, Link2, Link2Off, Quote } from "lucide-react";
import { useLinkEditor } from "./useLinkEditor";

interface Props {
  editor: Editor;
  visible: boolean;
}

/* ── Button ─────────────────────────────────────────────────── */
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
      className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 active:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-6 bg-gray-100 mx-1 flex-shrink-0 self-center" />;
}

/* Prevent blur on the editor when pressing a toolbar button */
const pd =
  (fn: () => void) =>
  (e: React.PointerEvent) => {
    e.preventDefault();
    fn();
  };

/* ── Sheet ──────────────────────────────────────────────────── */
export default function MobileFormattingSheet({ editor, visible }: Props) {
  const { linkMode, linkInput, setLinkInput, openLink, applyLink, cancelLink } =
    useLinkEditor(editor, { focus: false });

  /* Lift sheet above the iOS software keyboard when it appears */
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  /* Reset link state when sheet hides */
  useEffect(() => {
    if (!visible) cancelLink();
  }, [visible, cancelLink]);

  const sheetStyle: React.CSSProperties = {
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    transform: visible
      ? keyboardOffset > 0
        ? `translateY(-${keyboardOffset}px)`
        : "translateY(0)"
      : "translateY(100%)",
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-gray-100
        shadow-[0_-4px_24px_rgba(0,0,0,0.07)] transition-transform duration-200 ease-out"
      style={sheetStyle}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-0.5">
        <div className="w-8 h-1 bg-gray-200 rounded-full" />
      </div>

      {linkMode ? (
        /* ── Link URL input ──────────────────────────────────── */
        <div className="flex items-center gap-2 px-4 pb-3">
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
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-400 transition-colors"
          />
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              applyLink();
            }}
            className="h-12 px-4 text-sm font-medium bg-gray-900 text-white rounded-xl active:bg-gray-700 flex-shrink-0"
          >
            Apply
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              cancelLink();
            }}
            className="h-12 px-3 text-sm text-gray-400 active:text-gray-700 flex-shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        /* ── Formatting toolbar ──────────────────────────────── */
        <div className="flex items-center gap-0.5 px-2 pb-2 overflow-x-auto">
          <Btn
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
            onPointerDown={pd(() => editor.chain().toggleHeading({ level: 1 }).run())}
          >
            <span className="text-sm font-bold">H1</span>
          </Btn>
          <Btn
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
            onPointerDown={pd(() => editor.chain().toggleHeading({ level: 2 }).run())}
          >
            <span className="text-sm font-bold">H2</span>
          </Btn>
          <Btn
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
            onPointerDown={pd(() => editor.chain().toggleHeading({ level: 3 }).run())}
          >
            <span className="text-sm font-bold">H3</span>
          </Btn>

          <Sep />

          <Btn
            active={editor.isActive("bold")}
            title="Bold"
            onPointerDown={pd(() => editor.chain().toggleBold().run())}
          >
            <Bold size={17} />
          </Btn>
          <Btn
            active={editor.isActive("italic")}
            title="Italic"
            onPointerDown={pd(() => editor.chain().toggleItalic().run())}
          >
            <Italic size={17} />
          </Btn>
          <Btn
            active={editor.isActive("underline")}
            title="Underline"
            onPointerDown={pd(() => editor.chain().toggleUnderline().run())}
          >
            <Underline size={17} />
          </Btn>

          <Sep />

          <Btn
            active={editor.isActive("blockquote")}
            title="Blockquote"
            onPointerDown={pd(() => editor.chain().toggleBlockquote().run())}
          >
            <Quote size={17} />
          </Btn>

          {editor.isActive("link") ? (
            <Btn
              active
              title="Remove link"
              onPointerDown={pd(() => editor.chain().unsetLink().run())}
            >
              <Link2Off size={17} />
            </Btn>
          ) : (
            <Btn
              title="Add link"
              onPointerDown={(e) => {
                e.preventDefault();
                openLink();
              }}
            >
              <Link2 size={17} />
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}
