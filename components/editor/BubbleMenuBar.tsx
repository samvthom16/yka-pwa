"use client";

import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Link2,
  Link2Off,
  Quote,
} from "lucide-react";

interface BubbleMenuBarProps {
  editor: Editor;
  onClose?: () => void;
}

/* ─── Shared icon button ─────────────────────────────────────── */
function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`
        flex items-center justify-center w-7 h-7 rounded transition-colors
        ${
          active
            ? "bg-white text-gray-900"
            : "text-gray-400 hover:text-white hover:bg-white/10"
        }
      `}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-white/15 mx-0.5 flex-shrink-0" />;
}

/* ─── Main component ────────────────────────────────────────── */
export default function BubbleMenuBar({ editor, onClose: _onClose }: BubbleMenuBarProps) {
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState(
    editor.getAttributes("link").href ?? ""
  );

  const applyLink = useCallback(() => {
    const url = linkInput.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
        .run();
    }
    setLinkMode(false);
    setLinkInput("");
  }, [editor, linkInput]);

  /* Link input mode */
  if (linkMode) {
    return (
      <div className="animate-pop-in flex items-center gap-1 bg-gray-950 rounded-lg px-2.5 py-1.5 shadow-2xl border border-white/10">
        <input
          autoFocus
          type="text"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyLink();
            if (e.key === "Escape") setLinkMode(false);
          }}
          placeholder="Paste URL…"
          className="bg-transparent text-white text-sm outline-none w-52 placeholder:text-gray-600"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            applyLink();
          }}
          className="text-xs font-medium text-blue-400 hover:text-blue-300 px-1 flex-shrink-0"
        >
          Apply
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setLinkMode(false);
          }}
          className="text-gray-500 hover:text-gray-300 text-xs flex-shrink-0"
        >
          ✕
        </button>
      </div>
    );
  }

  /* Default toolbar */
  return (
    <div className="animate-pop-in flex items-center gap-0.5 bg-gray-950 rounded-lg px-2 py-1.5 shadow-2xl border border-white/10">
      {/* Heading toggles */}
      <ToolBtn
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <span className="text-[11px] font-bold leading-none">H1</span>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <span className="text-[11px] font-bold leading-none">H2</span>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <span className="text-[11px] font-bold leading-none">H3</span>
      </ToolBtn>

      <Sep />

      {/* Inline formatting */}
      <ToolBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (⌘B)"
      >
        <Bold size={13} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (⌘I)"
      >
        <Italic size={13} />
      </ToolBtn>
      <ToolBtn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (⌘U)"
      >
        <Underline size={13} />
      </ToolBtn>

      <Sep />

      {/* Quote */}
      <ToolBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <Quote size={13} />
      </ToolBtn>

      {/* Link */}
      {editor.isActive("link") ? (
        <ToolBtn
          active
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove link"
        >
          <Link2Off size={13} />
        </ToolBtn>
      ) : (
        <ToolBtn
          onClick={() => {
            setLinkInput(editor.getAttributes("link").href ?? "");
            setLinkMode(true);
          }}
          title="Add link"
        >
          <Link2 size={13} />
        </ToolBtn>
      )}
    </div>
  );
}
