"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import EditorHeader from "./EditorHeader";
import StatusBar from "./StatusBar";
import type { TipTapEditorHandle } from "./TipTapEditor";
import { useDraft } from "@/hooks/useDraft";
import { useAuth } from "@/hooks/useAuth";
import LoginScreen from "@/components/auth/LoginScreen";
import { createPost, updatePost, getPost, uploadMedia } from "@/lib/api/wordpress";
import { useWpConfig } from "@/hooks/useWpConfig";
import LoadingScreen from "@/components/ui/LoadingScreen";
import type { PublishStatus, PublishTarget } from "./EditorHeader";

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

function dataUrlToFile(dataUrl: string, index: number): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const ext = mime.split("/")[1] ?? "png";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], `image-${index + 1}.${ext}`, { type: mime });
}

async function uploadContentImages(
  html: string,
  cfg: Parameters<typeof uploadMedia>[0]
): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img[src^='data:']"));
  await Promise.all(
    imgs.map(async (img, i) => {
      const src = img.getAttribute("src")!;
      const file = dataUrlToFile(src, i);
      const media = await uploadMedia(cfg, file, img.getAttribute("alt") ?? undefined);
      img.setAttribute("src", media.source_url);
    })
  );
  return doc.body.innerHTML;
}

export default function WritingApp({ postId }: { postId?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, login } = useAuth();
  const cfg = useWpConfig(user);
  const editorRef = useRef<TipTapEditorHandle>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = postId !== undefined;

  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
const [draftLoaded, setDraftLoaded] = useState(false);
  const [initialContent, setInitialContent] = useState<object | string | undefined>(undefined);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishTarget, setPublishTarget] = useState<PublishTarget>(null);
  const [publishError, setPublishError] = useState("");
  const [originalStatus, setOriginalStatus] = useState<"publish" | "draft" | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const { draft, saveDraft, clearDraft, isLoading } = useDraft("default");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  /* Refs hold latest values so the debounced callback never captures stale state */
  const latestTitle = useRef("");
  const latestThumbnail = useRef<string | null>(null);

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
    if (isEditMode) return; // WP is the source of truth; no local draft needed
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

  /* Keep a ref to the original File so we can upload it without re-encoding the data URL */
  const thumbnailFileRef = useRef<File | null>(null);

  const removeThumbnail = useCallback(() => {
    setThumbnail(null);
    setThumbnailError(false);
    latestThumbnail.current = null;
    thumbnailFileRef.current = null;
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    triggerSave();
  }, [triggerSave]);

  /* ── Publish / Save draft to WordPress ───────────────────────── */
  const handlePublish = useCallback(async (targetStatus: "publish" | "draft", confirmed = false) => {
    if (!user || !cfg) return;

    /* Warn before unpublishing a live post */
    if (targetStatus === "draft" && isEditMode && originalStatus === "publish" && !confirmed) {
      setShowUnpublishConfirm(true);
      return;
    }

    const html = editorRef.current?.getHTML() ?? "";
    const plainText = html.replace(/<[^>]*>/g, "").trim();

    if (!title.trim()) {
      setPublishError("Please add a title before saving.");
      setPublishStatus("error");
      return;
    }
    if (!plainText) {
      setPublishError("The article has no content. Write something before saving.");
      setPublishStatus("error");
      return;
    }

    setPublishStatus("publishing");
    setPublishTarget(targetStatus);
    setPublishError("");

    try {
      /* Upload cover photo if a new file was selected */
      let featuredMediaId: number | undefined;
      if (thumbnailFileRef.current) {
        const media = await uploadMedia(cfg, thumbnailFileRef.current);
        featuredMediaId = media.id;
      } else if (isEditMode && thumbnail === null) {
        /* User explicitly removed the cover image — send 0 to clear it in WordPress */
        featuredMediaId = 0;
      }

      /* Upload any data-URL images embedded in the content and replace with WP URLs */
      const uploadedHtml = await uploadContentImages(html, cfg);

      if (isEditMode) {
        await updatePost(cfg, postId!, {
          title: title.trim(),
          content: uploadedHtml,
          status: targetStatus,
          ...(featuredMediaId !== undefined && { featured_media: featuredMediaId }),
        });
      } else {
        await createPost(cfg, {
          title: title.trim(),
          content: uploadedHtml,
          status: targetStatus,
          ...(featuredMediaId !== undefined && { featured_media: featuredMediaId }),
        });
        await clearDraft();
      }

      /* Invalidate dashboard query cache so the list refreshes on redirect */
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["post-counts"] });

      setPublishStatus("success");
      redirectTimerRef.current = setTimeout(() => router.push("/"), 1800);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Save failed. Try again.");
      setPublishStatus("error");
      setPublishTarget(null);
    }
  }, [user, cfg, title, thumbnail, editorRef, clearDraft, isEditMode, postId, queryClient, originalStatus]);

  if (authLoading) return <LoadingScreen />;

  if (!user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div
      className="flex flex-col min-h-dvh bg-white"
    >
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
        onDismissPublish={() => { setPublishStatus("idle"); setPublishTarget(null); }}
        onBack={() => router.push("/")}
      />

      <main
        className="flex-1 w-full max-w-[720px] mx-auto px-6 pt-12 md:px-8"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
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
          `}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        />

        {/* Post thumbnail — optional cover image */}
        <div className="mb-10">
          {thumbnail ? (
            thumbnailError ? (
              /* Image URL is broken — show a clear placeholder with remove option */
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
      />

      {/* Unpublish confirmation */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Move to drafts?</h2>
            <p className="text-sm text-gray-500 mb-5">
              This will unpublish the article — it will no longer be visible to readers.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnpublishConfirm(false)}
                className="flex-1 text-sm font-medium text-gray-700 border border-gray-200 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowUnpublishConfirm(false); handlePublish("draft", true); }}
                className="flex-1 text-sm font-medium text-white bg-gray-900 py-2.5 rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors"
              >
                Move to drafts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
