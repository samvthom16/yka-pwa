"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { blocklistMap } from "@/lib/titleCaseBlocklist";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import EditorHeader from "./EditorHeader";
import StatusBar from "./StatusBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { TipTapEditorHandle } from "./TipTapEditor";
import { useDraft } from "@/hooks/useDraft";
import { usePublishFlow } from "@/hooks/usePublishFlow";
import { useAuth } from "@/hooks/useAuth";
import LoginScreen from "@/components/auth/LoginScreen";
import { getPost } from "@/lib/api/wordpress";
import { useWpConfig } from "@/hooks/useWpConfig";
import LoadingScreen from "@/components/ui/LoadingScreen";

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

export default function WritingApp({ postId }: { postId?: number }) {
  const router = useRouter();
  const { user, isLoading: authLoading, login } = useAuth();
  const cfg = useWpConfig(user);
  const editorRef = useRef<TipTapEditorHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<File | null>(null);

  const isEditMode = postId !== undefined;

  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [initialContent, setInitialContent] = useState<object | string | undefined>(undefined);
  const [originalStatus, setOriginalStatus] = useState<"publish" | "draft" | null>(null);

  const { draft, saveDraft, clearDraft, isLoading } = useDraft("default");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestTitle = useRef("");
  const latestThumbnail = useRef<string | null>(null);

  const {
    publishStatus,
    publishTarget,
    publishError,
    showUnpublishConfirm,
    setShowUnpublishConfirm,
    handlePublish,
    dismissPublish,
  } = usePublishFlow({
    user,
    cfg,
    title,
    thumbnailFileRef,
    thumbnail,
    editorRef,
    clearDraft,
    isEditMode,
    postId,
    originalStatus,
  });

  /* ── Edit mode: load existing post from WordPress ─────────── */
  useEffect(() => {
    if (!isEditMode || !cfg) return;
    getPost(cfg, postId!).then((post) => {
      const t = post.title.rendered.replace(/<[^>]*>/g, "");
      setTitle(t);
      latestTitle.current = t;
      setInitialContent(post.content.rendered);
      setOriginalStatus(post.status === "publish" ? "publish" : "draft");
      const thumb = post.featured_image || null;
      if (thumb) {
        setThumbnail(thumb);
        latestThumbnail.current = thumb;
      }
      setDraftLoaded(true);
    }).catch(() => setDraftLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, cfg]);

  /* ── New post: restore draft once IndexedDB load resolves ─── */
  useEffect(() => {
    if (isEditMode || isLoading) return;
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
  }, [isLoading]);

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
    if (isEditMode) return;
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
  }, [saveDraft, isEditMode]);

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
      const val = e.target.value.replace(
        /[a-zA-Z]+(?:['''][a-zA-Z]+)*/g,
        (word) => blocklistMap.get(word.toLowerCase()) ?? (word.charAt(0).toUpperCase() + word.slice(1))
      );
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

  const handleThumbnailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      thumbnailFileRef.current = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setThumbnail(dataUrl);
        setThumbnailError(false);
        latestThumbnail.current = dataUrl;
        triggerSave();
      };
      reader.readAsDataURL(file);
    },
    [triggerSave]
  );

  const removeThumbnail = useCallback(() => {
    setThumbnail(null);
    setThumbnailError(false);
    latestThumbnail.current = null;
    thumbnailFileRef.current = null;
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    triggerSave();
  }, [triggerSave]);

  if (authLoading) return <LoadingScreen />;

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <EditorHeader
        title={title}
        thumbnail={thumbnail}
        isEditMode={isEditMode}
        saveStatus={saveStatus}
        editorRef={editorRef}
        publishStatus={publishStatus}
        publishTarget={publishTarget}
        publishError={publishError}
        onPublish={handlePublish}
        onDismissPublish={dismissPublish}
        onBack={() => router.push("/")}
      />

      <main
        className="flex-1 w-full max-w-[720px] mx-auto px-6 pt-12 md:px-8"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          placeholder="Title"
          spellCheck
          rows={1}
          className="w-full text-[2.5rem] md:text-[3rem] font-bold leading-tight tracking-tight text-gray-900 placeholder:text-gray-200 outline-none border-none bg-transparent mb-10 resize-none overflow-hidden font-sans block transition-opacity duration-300"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        />

        <div className="mb-10">
          {thumbnail ? (
            thumbnailError ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-dashed border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-400">Cover image unavailable (broken URL)</span>
                <button
                  onClick={removeThumbnail}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 active:text-gray-800 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative group rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnail}
                  alt="Post thumbnail"
                  className="w-full object-cover max-h-[360px]"
                  onError={() => setThumbnailError(true)}
                />
                <button
                  onClick={removeThumbnail}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 active:bg-black/70 text-white text-xs px-3 py-1.5 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150"
                  aria-label="Remove thumbnail"
                >
                  Remove
                </button>
              </div>
            )
          ) : (
            <button
              onClick={() => thumbnailInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-gray-500 active:text-gray-500 transition-colors duration-150 select-none py-3 -my-3"
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

      <StatusBar wordCount={wordCount} charCount={charCount} saveStatus={saveStatus} />

      <ConfirmDialog
        open={showUnpublishConfirm}
        title="Move to drafts?"
        message="This will unpublish the article — it will no longer be visible to readers."
        confirmLabel="Move to drafts"
        onConfirm={() => { setShowUnpublishConfirm(false); handlePublish("draft", true); }}
        onCancel={() => setShowUnpublishConfirm(false)}
      />
    </div>
  );
}
