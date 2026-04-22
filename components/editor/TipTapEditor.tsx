"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { FigureImage } from "./extensions/FigureImage";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import BubbleMenuBar from "./BubbleMenuBar";
import SlashCommandMenu from "./SlashCommandMenu";

export interface TipTapEditorHandle {
  getHTML: () => string;
  getJSON: () => object;
  focus: () => void;
}

interface TipTapEditorProps {
  onUpdate?: (stats: { wordCount: number; charCount: number }) => void;
  initialContent?: object;
}

interface SlashMenuState {
  isOpen: boolean;
  position: { top: number; left: number };
  query: string;
}

interface BubbleMenuState {
  visible: boolean;
  top: number;
  left: number;
}

const INITIAL_SLASH: SlashMenuState = {
  isOpen: false,
  position: { top: 0, left: 0 },
  query: "",
};

const HIDDEN_BUBBLE: BubbleMenuState = { visible: false, top: 0, left: 0 };

/* ─────────────────────────────────────────────────────────────── */

const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  function TipTapEditor({ onUpdate, initialContent }, ref) {
    const [slashMenu, setSlashMenu] = useState<SlashMenuState>(INITIAL_SLASH);
    const [bubbleMenu, setBubbleMenu] = useState<BubbleMenuState>(HIDDEN_BUBBLE);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const closeSlashMenu = useCallback(() => setSlashMenu(INITIAL_SLASH), []);
    const hideBubble = useCallback(() => setBubbleMenu(HIDDEN_BUBBLE), []);

    /* ── Position bubble menu from native selection rect ─────── */
    const showBubbleFromSelection = useCallback(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        hideBubble();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width) {
        hideBubble();
        return;
      }
      setBubbleMenu({
        visible: true,
        // Position centred above the selection; clamp to viewport edges
        top: rect.top - 52,
        left: Math.min(
          Math.max(rect.left + rect.width / 2, 150),
          window.innerWidth - 150
        ),
      });
    }, [hideBubble]);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: { languageClassPrefix: "language-" },
        }),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "heading") {
              const lvl = (node.attrs as { level: number }).level;
              return `Heading ${lvl}`;
            }
            return "Write something, or type '/' for commands…";
          },
        }),
        FigureImage,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        CharacterCount,
        Typography,
      ],

      editorProps: {
        attributes: {
          class: "editor-content focus:outline-none",
          spellcheck: "true",
        },
      },

      content: initialContent ?? undefined,
      immediatelyRender: false,

      onSelectionUpdate: ({ editor }) => {
        const { empty } = editor.state.selection;
        if (empty) {
          hideBubble();
        } else {
          // Defer by one frame so the DOM selection is committed
          requestAnimationFrame(showBubbleFromSelection);
        }
        // Close slash menu on any selection change
        closeSlashMenu();
      },

      onUpdate: ({ editor }) => {
        /* ── Slash command detection ─────────────────────────── */
        const { $from } = editor.state.selection;
        const textBeforeCursor = $from.parent.textContent.slice(
          0,
          $from.parentOffset
        );

        if (textBeforeCursor.startsWith("/")) {
          const query = textBeforeCursor.slice(1);
          if (/^[a-z0-9]*$/i.test(query)) {
            try {
              const coords = editor.view.coordsAtPos($from.pos);
              setSlashMenu({
                isOpen: true,
                position: {
                  top: coords.bottom + 8,
                  left: coords.left,
                },
                query: query.toLowerCase(),
              });
            } catch {
              /* coordsAtPos edge-case — skip */
            }
          } else {
            closeSlashMenu();
          }
        } else {
          closeSlashMenu();
        }

        /* ── Stats ────────────────────────────────────────────── */
        type CCStorage = { words?: () => number; characters?: () => number };
        const cc = editor.storage.characterCount as CCStorage | undefined;
        onUpdate?.({
          wordCount: typeof cc?.words === "function" ? cc.words() : 0,
          charCount:
            typeof cc?.characters === "function" ? cc.characters() : 0,
        });
      },

      onFocus: () => hideBubble(),
    });

    /* ── Expose handle ──────────────────────────────────────── */
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() ?? "",
      getJSON: () => editor?.getJSON() ?? {},
      focus: () => editor?.commands.focus("end"),
    }));

    /* ── Escape closes slash menu ────────────────────────────── */
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (slashMenu.isOpen && e.key === "Escape") {
          e.stopPropagation();
          closeSlashMenu();
        }
      };
      window.addEventListener("keydown", handler, true);
      return () => window.removeEventListener("keydown", handler, true);
    }, [slashMenu.isOpen, closeSlashMenu]);

    /* ── Hide bubble on scroll ───────────────────────────────── */
    useEffect(() => {
      window.addEventListener("scroll", hideBubble, { passive: true });
      return () => window.removeEventListener("scroll", hideBubble);
    }, [hideBubble]);

    /* ── Execute slash command ───────────────────────────────── */
    const executeSlashCommand = useCallback(
      (command: string) => {
        if (!editor) return;
        const { $from } = editor.state.selection;
        const blockStart = $from.pos - $from.parentOffset;
        editor
          .chain()
          .focus()
          .deleteRange({ from: blockStart, to: $from.pos })
          .run();

        switch (command) {
          case "h1":
            editor.chain().focus().setHeading({ level: 1 }).run();
            break;
          case "h2":
            editor.chain().focus().setHeading({ level: 2 }).run();
            break;
          case "h3":
            editor.chain().focus().setHeading({ level: 3 }).run();
            break;
          case "quote":
            editor.chain().focus().setBlockquote().run();
            break;
          case "bullet":
            editor.chain().focus().toggleBulletList().run();
            break;
          case "numbered":
            editor.chain().focus().toggleOrderedList().run();
            break;
          case "divider":
            editor.chain().focus().setHorizontalRule().run();
            break;
          case "image":
            imageInputRef.current?.click();
            break;
        }
        closeSlashMenu();
      },
      [editor, closeSlashMenu]
    );

    /* ── Image insert (local DataURL; WP upload via lib/api) ─── */
    const handleImageFile = useCallback(
      (file: File) => {
        if (!editor) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          editor
            .chain()
            .focus()
            .setFigureImage({ src: ev.target?.result as string, alt: file.name })
            .run();
        };
        reader.readAsDataURL(file);
      },
      [editor]
    );

    return (
      <div className="relative">
        {/* ── Editor ─────────────────────────────────────────── */}
        <EditorContent editor={editor} />

        {/* ── Bubble menu (fixed to viewport) ────────────────── */}
        {editor && bubbleMenu.visible && (
          <div
            className="fixed z-[150] -translate-x-1/2 pointer-events-auto"
            style={{ top: bubbleMenu.top, left: bubbleMenu.left }}
          >
            <BubbleMenuBar editor={editor} onClose={hideBubble} />
          </div>
        )}

        {/* ── Slash command menu ──────────────────────────────── */}
        {slashMenu.isOpen && (
          <SlashCommandMenu
            position={slashMenu.position}
            query={slashMenu.query}
            onSelect={executeSlashCommand}
            onClose={closeSlashMenu}
          />
        )}

        {/* ── Hidden image input ─────────────────────────────── */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
            e.target.value = "";
          }}
        />
      </div>
    );
  }
);

export default TipTapEditor;
