"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useWpConfig } from "@/hooks/useWpConfig";
import LoadingScreen from "@/components/ui/LoadingScreen";
import BottomSheet from "@/components/ui/BottomSheet";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { IconButton, IconButtonLink } from "@/components/ui/IconButton";
import { getPost, getComments, createComment, updateComment, deleteComment } from "@/lib/api/wordpress";
import type { WPPostListItem, WPComment } from "@/lib/api/wordpress";
import { formatDate, stripHtml } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Eye, MessageSquare, ThumbsUp, Share2, MoreVertical } from "lucide-react";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const cfg = useWpConfig(user);

  const [post, setPost] = useState<WPPostListItem | null>(null);
  const [comments, setComments] = useState<WPComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteCommentError, setDeleteCommentError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
  const myWpId = user?.id ?? null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!cfg) { router.replace("/"); return; }

    const postId = Number(id);
    Promise.all([
      getPost(cfg, postId),
      getComments(cfg, postId),
    ])
      .then(([p, c]) => { setPost(p); setComments(c); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load article."))
      .finally(() => setLoading(false));
  }, [id, cfg, authLoading, router]);

  if (authLoading || loading) return <LoadingScreen />;

  if (error || !post) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-500">{error || "Article not found."}</p>
        <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-4 transition-colors">
          Back to dashboard
        </button>
      </div>
    );
  }

  function startEditing(c: WPComment) {
    const plain = new DOMParser().parseFromString(c.content.rendered, "text/html").body.textContent ?? "";
    setEditingId(c.id);
    setEditText(plain.trim());
  }

  async function handleSaveEdit(commentId: number) {
    if (!cfg || !editText.trim()) return;
    setSavingId(commentId);
    try {
      const updated = await updateComment(cfg, commentId, editText.trim());
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch {
      /* silent */
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!cfg) return;
    setDeletingId(commentId);
    try {
      await deleteComment(cfg, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteCommentError(err instanceof Error ? err.message : "Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !cfg) return;
    setSubmitting(true);
    setCommentError("");
    try {
      const newComment = await createComment(cfg, Number(id), commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = stripHtml(post.title.rendered) || "Untitled";
  const isPublished = post.status === "publish";

  async function handleShare() {
    try {
      await navigator.share({ title, url: post!.link });
    } catch {
      /* user cancelled or share unavailable */
    }
  }
  const safeContent = DOMPurify.sanitize(post.content.rendered);

  return (
    <div className="min-h-dvh bg-white">
      <header className="safe-top sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-5">
          <IconButton onClick={() => router.push("/")}>
            <ArrowLeft size={15} />
          </IconButton>

          <div className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-gray-400"}`} />
              {isPublished ? "Published" : "Draft"}
            </span>
            {isPublished && canShare && (
              <button
                onClick={handleShare}
                title="Share"
                className="flex items-center justify-center w-11 h-11 rounded-lg text-gray-400 active:bg-gray-100 active:text-gray-700 transition-colors"
              >
                <Share2 size={16} />
              </button>
            )}
            {isPublished && (
              <IconButtonLink
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                title="View on site"
              >
                <ExternalLink size={14} />
              </IconButtonLink>
            )}
          </div>
        </div>
      </header>

      <article className="w-full max-w-[720px] mx-auto px-6 py-12 md:px-8">
        <h1
          className="text-[1.875rem] sm:text-[2.25rem] md:text-[3rem] font-bold leading-tight tracking-tight text-gray-900 mb-4"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        >
          {title}
        </h1>
        <div className="flex items-center gap-4 mb-10">
          <p className="text-sm text-gray-400">{formatDate(post.modified)}</p>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {post.view_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} />
              {post.total_comments}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={14} />
              {post.like?.total ?? 0}
            </span>
          </div>
        </div>
        {post.featured_image && (
          <Image
            src={post.featured_image}
            alt={title}
            width={720}
            height={400}
            sizes="(max-width: 720px) 100vw, 720px"
            className="w-full rounded-xl object-cover max-h-[400px] mb-10"
            priority
          />
        )}
        <div className="ProseMirror reader" dangerouslySetInnerHTML={{ __html: safeContent }} />

        {/* Comments */}
        <section className="mt-8 border-t border-gray-100 pt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-6">
            {comments.length === 0
              ? "No comments yet"
              : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </h2>

          <form onSubmit={handleCommentSubmit} className="mb-10">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              className="w-full text-base text-gray-800 placeholder:text-gray-300 border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-gray-400 transition-colors"
            />
            {commentError && (
              <p className="mt-1.5 text-xs text-red-500">{commentError}</p>
            )}
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!commentText.trim() || submitting}
                className="px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-full hover:bg-gray-700 active:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Posting…" : "Post comment"}
              </button>
            </div>
          </form>

          {comments.length > 0 && (
            <ul className="space-y-6">
              {comments.map((c) => (
                <li key={c.id} className={`flex gap-3 ${c.parent !== 0 ? "ml-6 sm:ml-10" : ""}`}>
                  <Image
                    src={c.author_avatar_urls["48"] ?? c.author_avatar_urls["96"]}
                    alt={c.author_name}
                    width={40}
                    height={40}
                    className="rounded-full flex-shrink-0 bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{c.author_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{formatDate(c.date)}</span>
                          {c.status === "hold" && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">Pending</span>
                          )}
                        </div>
                      </div>
                      {c.author === myWpId && editingId !== c.id && (
                        <button
                          onClick={() => setActiveCommentMenu(activeCommentMenu === c.id ? null : c.id)}
                          className="w-8 h-8 flex items-center justify-center text-gray-300 active:text-gray-600 flex-shrink-0 -mr-1"
                        >
                          <MoreVertical size={15} />
                        </button>
                      )}
                    </div>

                    {editingId === c.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-gray-400 transition-colors"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => handleSaveEdit(c.id)}
                            disabled={!editText.trim() || savingId === c.id}
                            className="text-xs font-medium px-3 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700 active:bg-gray-800 disabled:opacity-40 transition-colors"
                          >
                            {savingId === c.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-700 active:text-gray-700 transition-colors py-2 px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="mt-2 border-l-2 border-gray-100 pl-3 text-sm text-gray-600 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.content.rendered) }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Comment action bottom sheet */}
          {activeCommentMenu !== null && (
            <BottomSheet onClose={() => setActiveCommentMenu(null)}>
              <div className="px-3 pb-2">
                <button
                  onClick={() => {
                    const c = comments.find((x) => x.id === activeCommentMenu);
                    if (c) startEditing(c);
                    setActiveCommentMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-gray-800 active:bg-gray-50"
                >
                  Edit comment
                </button>
                <button
                  onClick={() => {
                    setConfirmDeleteId(activeCommentMenu);
                    setActiveCommentMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-red-500 active:bg-red-50"
                >
                  Delete comment
                </button>
              </div>
            </BottomSheet>
          )}

          {/* Delete confirmation */}
          <ConfirmDialog
            open={confirmDeleteId !== null}
            title="Delete comment?"
            message={deleteCommentError || "This cannot be undone."}
            confirmLabel="Delete"
            loadingLabel="Deleting…"
            loading={deletingId !== null && deletingId === confirmDeleteId}
            destructive
            onConfirm={() => handleDeleteComment(confirmDeleteId!)}
            onCancel={() => { setConfirmDeleteId(null); setDeleteCommentError(""); }}
          />
        </section>
      </article>
    </div>
  );
}
