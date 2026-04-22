"use client";

import { useEffect, useRef, useState } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Quote,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  description: string;
  Icon: React.ElementType;
  keywords: string[];
}

const COMMANDS: Command[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section heading",
    Icon: Heading1,
    keywords: ["h1", "heading", "title", "large"],
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    Icon: Heading2,
    keywords: ["h2", "heading", "subtitle", "medium"],
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    Icon: Heading3,
    keywords: ["h3", "heading", "small"],
  },
  {
    id: "quote",
    label: "Quote",
    description: "Capture a standout quote",
    Icon: Quote,
    keywords: ["quote", "blockquote", "callout", "q"],
  },
  {
    id: "bullet",
    label: "Bullet List",
    description: "Unordered list of items",
    Icon: List,
    keywords: ["bullet", "list", "ul", "unordered", "-"],
  },
  {
    id: "numbered",
    label: "Numbered List",
    description: "Ordered numbered list",
    Icon: ListOrdered,
    keywords: ["numbered", "list", "ol", "ordered", "1"],
  },
  {
    id: "image",
    label: "Image",
    description: "Upload or embed an image",
    Icon: ImageIcon,
    keywords: ["image", "img", "photo", "picture", "upload"],
  },
  {
    id: "divider",
    label: "Divider",
    description: "Visual section separator",
    Icon: Minus,
    keywords: ["divider", "separator", "hr", "rule", "line"],
  },
];

interface SlashCommandMenuProps {
  position: { top: number; left: number };
  query: string;
  onSelect: (commandId: string) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({
  position,
  query,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  /* Filter commands by query */
  const filtered = COMMANDS.filter(
    (cmd) =>
      query === "" ||
      cmd.keywords.some((k) => k.startsWith(query)) ||
      cmd.label.toLowerCase().startsWith(query)
  );

  /* Reset selection when filter changes */
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!filtered.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[activeIndex].id);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [filtered, activeIndex, onSelect]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  /* Scroll active item into view */
  useEffect(() => {
    const item = menuRef.current?.querySelectorAll("[data-item]")[activeIndex];
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!filtered.length) return null;

  return (
    <div
      ref={menuRef}
      className="animate-slide-up fixed z-[200] w-72 rounded-xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        Insert block
      </div>

      {/* Items */}
      <ul className="pb-1.5">
        {filtered.map((cmd, index) => {
          const Icon = cmd.Icon;
          const isActive = index === activeIndex;
          return (
            <li key={cmd.id} data-item>
              <button
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(cmd.id);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                  ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors
                    ${isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}
                  `}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-gray-900 leading-snug">
                    {cmd.label}
                  </span>
                  <span className="block text-[11px] text-gray-400 leading-snug">
                    {cmd.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer hint */}
      <div className="border-t border-gray-50 px-3.5 py-2 flex items-center gap-3 text-[10px] text-gray-300">
        <span>↑↓ navigate</span>
        <span>↵ insert</span>
        <span>esc dismiss</span>
      </div>
    </div>
  );
}
