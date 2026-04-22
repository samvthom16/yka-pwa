"use client";

import { RefObject, useCallback, useState } from "react";
import {
  Focus,
  Eye,
  Download,
  Upload,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type { TipTapEditorHandle } from "./TipTapEditor";

interface EditorHeaderProps {
  title: string;
  thumbnail: string | null;
  focusMode: boolean;
  saveStatus: "saved" | "saving" | "unsaved";
  editorRef: RefObject<TipTapEditorHandle | null>;
  onToggleFocusMode: () => void;
}

/* ── Minimal icon button ──────────────────────────────────────── */
function IconBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick?: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg transition-colors
        ${
          active
            ? "bg-gray-900 text-white"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        }
      `}
    >
      {children}
    </button>
  );
}

/* ── Preview modal ────────────────────────────────────────────── */
function PreviewModal({
  title,
  thumbnail,
  html,
  onClose,
}: {
  title: string;
  thumbnail: string | null;
  html: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            Preview — {title || "Untitled"}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        {/* Preview content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
          {title && (
            <h1
              className="text-4xl font-bold tracking-tight text-gray-900 mb-8 break-words"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                overflowWrap: "break-word",
                wordBreak: "break-word",
              }}
            >
              {title}
            </h1>
          )}
          {thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt="Cover"
              className="w-full object-cover max-h-[300px] rounded-lg mb-8"
            />
          )}
          <div
            className="ProseMirror"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main header ─────────────────────────────────────────────── */
export default function EditorHeader({
  title,
  thumbnail,
  focusMode,
  saveStatus,
  editorRef,
  onToggleFocusMode,
}: EditorHeaderProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const handlePreview = useCallback(() => {
    const html = editorRef.current?.getHTML() ?? "";
    setPreviewHtml(html);
    setShowPreview(true);
  }, [editorRef]);

  const handleExport = useCallback(() => {
    const html = editorRef.current?.getHTML() ?? "";
    const safeTitle = title || "untitled";
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    body{max-width:720px;margin:0 auto;padding:3rem 1.5rem;font-family:Georgia,serif;font-size:1.125rem;line-height:1.8;color:#374151}
    h1,h2,h3{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;margin-top:2rem}
    h1{font-size:2rem;font-weight:700}h2{font-size:1.5rem;font-weight:700}h3{font-size:1.2rem;font-weight:600}
    blockquote{border-left:3px solid #111;padding-left:1.5rem;margin:2rem 0;font-style:italic;color:#555}
    img{max-width:100%;height:auto;border-radius:6px;margin:1.5rem 0}
    a{color:#111;text-decoration:underline}
    code{background:#f5f5f5;border-radius:4px;padding:.15em .4em;font-family:monospace;font-size:.875em;color:#d63031}
    pre{background:#1a1a1a;color:#f8f8f2;border-radius:8px;padding:1.25rem 1.5rem;overflow-x:auto}
    pre code{background:none;color:inherit;padding:0}
    hr{border:none;border-top:1px solid #e5e7eb;margin:2.5rem 0}
    ul{list-style:disc;padding-left:1.5rem}ol{list-style:decimal;padding-left:1.5rem}
  </style>
</head>
<body>
  ${title ? `<h1>${safeTitle}</h1>` : ""}
  ${html}
</body>
</html>`;
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editorRef, title]);

  return (
    <>
      <header
        className={`
          sticky top-0 z-40 flex items-center justify-between h-14 px-5
          bg-white/90 backdrop-blur-md border-b border-gray-100
          transition-opacity duration-400
          ${focusMode ? "opacity-0 hover:opacity-100" : "opacity-100"}
        `}
      >
        {/* ── Left: brand + title ────────────────────────────── */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
            <span className="text-white text-[11px] font-black tracking-tighter">
              Y
            </span>
          </div>
          {title && (
            <span className="text-sm text-gray-400 truncate max-w-[220px] hidden sm:block">
              {title}
            </span>
          )}
        </div>

        {/* ── Right: actions ─────────────────────────────────── */}
        <div className="flex items-center gap-0.5">
          {/* Save status */}
          <div className="flex items-center gap-1.5 mr-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 size={11} className="animate-spin" />
                Saving
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <Check size={11} />
                Saved
              </span>
            )}
          </div>

          <IconBtn
            title={focusMode ? "Exit focus mode" : "Focus mode"}
            active={focusMode}
            onClick={onToggleFocusMode}
          >
            <Focus size={15} />
          </IconBtn>

          <IconBtn title="Preview" onClick={handlePreview}>
            <Eye size={15} />
          </IconBtn>

          <IconBtn title="Export as HTML" onClick={handleExport}>
            <Download size={15} />
          </IconBtn>

          {/* Publish button with dropdown affordance */}
          <button className="flex items-center gap-1 ml-2 pl-4 pr-3 h-8 rounded-full text-[13px] font-medium bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800 transition-colors">
            <Upload size={12} />
            <span>Publish</span>
            <ChevronDown size={11} className="ml-0.5 opacity-60" />
          </button>
        </div>
      </header>

      {/* Preview modal */}
      {showPreview && (
        <PreviewModal
          title={title}
          thumbnail={thumbnail}
          html={previewHtml}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
