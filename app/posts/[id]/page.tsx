"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { useAuth } from "@/hooks/useAuth";
import { getPost } from "@/lib/api/wordpress";
import type { WPPostListItem } from "@/lib/api/wordpress";
import { WP_SITE_URL } from "@/lib/wp-config";
import { formatDate, stripHtml } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [post, setPost] = useState<WPPostListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/"); return; }

    getPost(
      { siteUrl: WP_SITE_URL, username: user.username, appPassword: user.password },
      Number(id)
    )
      .then(setPost)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load article."))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  /* ── Loading ─────────────────────────────────────────────────── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────── */
  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-500">{error || "Article not found."}</p>
        <button onClick={() => router.push("/")} className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-4 transition-colors">
          Back to dashboard
        </button>
      </div>
    );
  }

  const title = stripHtml(post.title.rendered) || "Untitled";
  const isPublished = post.status === "publish";
  const safeContent = DOMPurify.sanitize(post.content.rendered);

  /* ── Reader ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-5 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-gray-400"}`} />
            {isPublished ? "Published" : "Draft"}
          </span>
          {isPublished && (
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              title="View on WordPress"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </header>

      <article className="w-full max-w-[720px] mx-auto px-6 py-12 md:px-8">
        <h1
          className="text-[2.5rem] md:text-[3rem] font-bold leading-tight tracking-tight text-gray-900 mb-4"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        >
          {title}
        </h1>
        <p className="text-sm text-gray-400 mb-10">{formatDate(post.modified)}</p>
        <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: safeContent }} />
      </article>
    </div>
  );
}
