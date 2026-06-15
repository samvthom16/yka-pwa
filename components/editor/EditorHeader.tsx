"use client";

import { RefObject, useCallback, useState } from "react";
import { Eye, Upload, Check, Loader2, ArrowLeft } from "lucide-react";
import type { TipTapEditorHandle } from "./TipTapEditor";

export type PublishStatus = "idle" | "publishing" | "success" | "error";
export type PublishTarget = "publish" | "draft" | null;

interface EditorHeaderProps {
  title: string;
  thumbnail: string | null;
  isEditMode: boolean;
  saveStatus: "saved" | "saving" | "unsaved";
  editorRef: RefObject<TipTapEditorHandle | null>;
  publishStatus: PublishStatus;
  publishTarget: PublishTarget;
  publishError: string;
  onPublish: (status: "publish" | "draft") => void;
  onDismissPublish: () => void;
  onBack: () => void;
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
        flex items-center justify-center w-11 h-11 rounded-lg transition-colors
        ${
          active
            ? "bg-gray-900 text-white"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-100 active:text-gray-700"
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
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 active:text-gray-700 active:bg-gray-100 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        {/* Preview content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 overscroll-contain">
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

/* ── Publishing overlay ───────────────────────────────────────── */
function PublishingOverlay({ target }: { target: PublishTarget }) {
  const label = target === "draft" ? "Saving draft…" : "Publishing your article…";
  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-4 bg-white/90 backdrop-blur-sm">
      <Loader2 size={28} className="animate-spin text-gray-400" />
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-xs text-gray-400">This may take a few seconds</p>
    </div>
  );
}

/* ── Publish error modal ──────────────────────────────────────── */
function PublishModal({
  status,
  error,
  onClose,
}: {
  status: PublishStatus;
  error: string;
  onClose: () => void;
}) {
  if (status !== "error") return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-sm font-bold">!</span>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Publish failed</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4 break-words">{error}</p>
        <button onClick={onClose} className="w-full text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 active:bg-gray-800 py-2.5 rounded-lg transition-colors">
          OK
        </button>
      </div>
    </div>
  );
}

/* ── Main header ─────────────────────────────────────────────── */
export default function EditorHeader({
  title,
  thumbnail,
  isEditMode,
  saveStatus,
  editorRef,
  publishStatus,
  publishTarget,
  publishError,
  onPublish,
  onDismissPublish,
  onBack,
}: EditorHeaderProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const handlePreview = useCallback(() => {
    const html = editorRef.current?.getHTML() ?? "";
    setPreviewHtml(html);
    setShowPreview(true);
  }, [editorRef]);

  return (
    <>
      <header className="safe-top sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-5">
        {/* ── Left: back + brand + title ─────────────────────── */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            title="Back to dashboard"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-100 active:text-gray-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex-shrink-0 w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center">
            <span className="text-white text-sm font-black tracking-tighter">Y</span>
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

          <IconBtn title="Preview" onClick={handlePreview}>
            <Eye size={15} />
          </IconBtn>

          {/* Save as draft button */}
          <button
            onClick={() => onPublish("draft")}
            disabled={publishStatus === "publishing"}
            className="flex items-center gap-1.5 ml-1 px-3 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {publishStatus === "publishing" && publishTarget === "draft" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : null}
            <span>{publishStatus === "publishing" && publishTarget === "draft" ? "Saving…" : "Draft"}</span>
          </button>

          {/* Publish button */}
          <button
            onClick={() => onPublish("publish")}
            disabled={publishStatus === "publishing"}
            className="flex items-center gap-1.5 ml-1 pl-4 pr-4 h-9 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {publishStatus === "publishing" && publishTarget === "publish" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Upload size={13} />
            )}
            <span>
              {publishStatus === "publishing" && publishTarget === "publish"
                ? isEditMode ? "Updating…" : "Publishing…"
                : isEditMode ? "Update" : "Publish"}
            </span>
          </button>
        </div>
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

      {/* Publishing overlay */}
      {publishStatus === "publishing" && <PublishingOverlay target={publishTarget} />}

      {/* Publish error modal */}
      <PublishModal
        status={publishStatus}
        error={publishError}
        onClose={onDismissPublish}
      />
    </>
  );
}
