"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import EditorHeader from "./EditorHeader";
import StatusBar from "./StatusBar";
import type { TipTapEditorHandle } from "./TipTapEditor";
import { useDraft } from "@/hooks/useDraft";

const TipTapEditor = dynamic(() => import("./TipTapEditor"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse">
      <div className="h-5 w-3/4 bg-gray-100 rounded mb-4" />
      <div className="h-4 w-full bg-gray-100 rounded mb-2" />
      <div className="h-4 w-5/6 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-4/6 bg-gray-100 rounded" />
    </div>
  ),
});

export default function WritingApp() {
  const editorRef = useRef<TipTapEditorHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [focusMode, setFocusMode] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [initialContent, setInitialContent] = useState<object | undefined>(undefined);

  const { draft, saveDraft, isLoading } = useDraft("default");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Refs hold latest values so the debounced callback never captures stale state */
  const latestTitle = useRef("");
  const latestThumbnail = useRef<string | null>(null);

  /* ── Restore draft once IndexedDB load resolves ───────────── */
  useEffect(() => {
    if (isLoading) return;
    if (draft) {
      setTitle(draft.title);
      latestTitle.current = draft.title;
      if (draft.thumbnailDataUrl) {
        setThumbnail(draft.thumbnailDataUrl);
        latestThumbnail.current = draft.thumbnailDataUrl;
      }
      try {
        const parsed = JSON.parse(draft.content);
        if (parsed && typeof parsed === "object") setInitialContent(parsed);
      } catch {
        /* corrupt content — start fresh */
      }
    }
    setDraftLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]); // intentionally omit `draft` — we only want to restore once on load

  /* ── Auto-resize title textarea ───────────────────────────── */
  const resizeTitleArea = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTitleArea();
  }, [title, resizeTitleArea]);

  /* ── Debounced save to IndexedDB ──────────────────────────── */
  const triggerSave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const json = editorRef.current?.getJSON() ?? {};
      await saveDraft({
        title: latestTitle.current,
        content: JSON.stringify(json),
        thumbnailDataUrl: latestThumbnail.current ?? undefined,
      });
      setSaveStatus("saved");
    }, 1500);
  }, [saveDraft]);

  /* ── Event handlers ───────────────────────────────────────── */
  const handleEditorUpdate = useCallback(
    ({ wordCount, charCount }: { wordCount: number; charCount: number }) => {
      setWordCount(wordCount);
      setCharCount(charCount);
      triggerSave();
    },
    [triggerSave]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setTitle(val);
      latestTitle.current = val;
      triggerSave();
    },
    [triggerSave]
  );

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        editorRef.current?.focus();
      }
    },
    []
  );

  /* Use FileReader so the data URL is stored in IndexedDB (blob: URLs don't survive reload) */
  const handleThumbnailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setThumbnail(dataUrl);
        latestThumbnail.current = dataUrl;
        triggerSave();
      };
      reader.readAsDataURL(file);
    },
    [triggerSave]
  );

  const removeThumbnail = useCallback(() => {
    setThumbnail(null);
    latestThumbnail.current = null;
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    triggerSave();
  }, [triggerSave]);

  return (
    <div
      className={`flex flex-col min-h-screen bg-white transition-all duration-300 ${
        focusMode ? "editor-focus-mode" : ""
      }`}
    >
      <EditorHeader
        title={title}
        thumbnail={thumbnail}
        focusMode={focusMode}
        saveStatus={saveStatus}
        editorRef={editorRef}
        onToggleFocusMode={() => setFocusMode((f) => !f)}
      />

      <main className="flex-1 w-full max-w-[720px] mx-auto px-6 pb-20 pt-12 md:px-8">
        {/* Post title — textarea auto-grows with content */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Title"
          spellCheck
          rows={1}
          className={`
            w-full text-[2.5rem] md:text-[3rem] font-bold leading-tight tracking-tight
            text-gray-900 placeholder:text-gray-200
            outline-none border-none bg-transparent
            mb-10 resize-none overflow-hidden font-sans block
            transition-opacity duration-300
            ${focusMode ? "opacity-60 focus:opacity-100" : ""}
          `}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        />

        {/* Post thumbnail — optional cover image */}
        <div className={`mb-10 transition-opacity duration-300 ${focusMode ? "opacity-40 hover:opacity-100" : ""}`}>
          {thumbnail ? (
            <div className="relative group rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail}
                alt="Post thumbnail"
                className="w-full object-cover max-h-[360px]"
              />
              <button
                onClick={removeThumbnail}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                aria-label="Remove thumbnail"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => thumbnailInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-gray-500 transition-colors duration-150 select-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add cover photo
            </button>
          )}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailChange}
          />
        </div>

        {/* Editor body — deferred until draft is restored so initialContent is correct */}
        {!draftLoaded ? (
          <div className="animate-pulse">
            <div className="h-5 w-3/4 bg-gray-100 rounded mb-4" />
            <div className="h-4 w-full bg-gray-100 rounded mb-2" />
            <div className="h-4 w-5/6 bg-gray-100 rounded mb-2" />
            <div className="h-4 w-4/6 bg-gray-100 rounded" />
          </div>
        ) : (
          <TipTapEditor
            ref={editorRef}
            onUpdate={handleEditorUpdate}
            initialContent={initialContent}
          />
        )}
      </main>

      <StatusBar
        wordCount={wordCount}
        charCount={charCount}
        saveStatus={saveStatus}
        focusMode={focusMode}
      />
    </div>
  );
}
