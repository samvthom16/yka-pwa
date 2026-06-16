"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWpConfig } from "@/hooks/useWpConfig";
import LoginScreen from "@/components/auth/LoginScreen";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { getPosts, getPostCounts, getMe, deletePost, getMyComments } from "@/lib/api/wordpress";
import type { WPPostListItem } from "@/lib/api/wordpress";
import { formatDate, stripHtml } from "@/lib/utils";
import WpImage from "@/components/ui/WpImage";
import { Loader2, PenLine, RefreshCw, LogOut, MessageSquare, MoreVertical, Trash2, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const PER_PAGE = 20;

type Filter = "publish" | "draft" | "comments";

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const cfg = useWpConfig(user);
  const [filter, setFilter] = useState<Filter>("publish");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<WPPostListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  /* Derive 2-letter monogram from display name or username */
  const monogram = (() => {
    const name = (user?.name || user?.username || "").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || "?";
  })();

  /* ── Resolve WP author ID ────────────────────────────────────── */
  const { data: me } = useQuery({
    queryKey: ["me", user?.username],
    queryFn: () => getMe(cfg!),
    enabled: !!cfg,
    staleTime: Infinity,
  });

  const authorId = me?.id;

  /* ── Posts (infinite) ────────────────────────────────────────── */
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
    isRefetching: postsRefetching,
    refetch: refetchPosts,
  } = useInfiniteQuery({
    queryKey: ["posts", authorId],
    queryFn: ({ pageParam = 1 }) =>
      getPosts(cfg!, pageParam as number, PER_PAGE, ["publish", "draft"], authorId),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled: !!cfg && authorId !== undefined,
  });

  /* ── Counts ──────────────────────────────────────────────────── */
  const { data: counts, refetch: refetchCounts } = useQuery({
    queryKey: ["post-counts", authorId],
    queryFn: () => getPostCounts(cfg!, authorId),
    enabled: !!cfg && authorId !== undefined,
    placeholderData: { all: 0, publish: 0, draft: 0 },
  });

  /* ── My comments (infinite) ──────────────────────────────────── */
  const {
    data: commentsData,
    fetchNextPage: fetchNextCommentsPage,
    hasNextPage: hasNextCommentsPage,
    isFetchingNextPage: isFetchingNextCommentsPage,
    isLoading: commentsLoading,
  } = useInfiniteQuery({
    queryKey: ["my-comments", authorId],
    queryFn: ({ pageParam = 1 }) =>
      getMyComments(cfg!, authorId!, pageParam as number),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.totalPages ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled: !!cfg && authorId !== undefined && filter === "comments",
  });

  /* ── Infinite scroll sentinel ────────────────────────────────── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (filter === "comments") {
          if (hasNextCommentsPage && !isFetchingNextCommentsPage) fetchNextCommentsPage();
        } else {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filter, hasNextPage, isFetchingNextPage, fetchNextPage, hasNextCommentsPage, isFetchingNextCommentsPage, fetchNextCommentsPage]);

  /* ── Auth states ─────────────────────────────────────────────── */
  if (authLoading) return <LoadingScreen />;
  if (!user) return <LoginScreen onLogin={login} />;

  /* ── Flatten pages into a single list ───────────────────────── */
  const allPosts: WPPostListItem[] = postsData?.pages.flatMap((p) => p.posts) ?? [];

  const filtered = allPosts.filter((p) => {
    if (filter === "publish") return p.status === "publish";
    if (filter === "draft") return p.status === "draft";
    return false;
  });

  const allComments = commentsData?.pages.flatMap((p) => p.comments) ?? [];
  const commentTotal = commentsData?.pages[0]?.total ?? 0;

  const isInitialLoad = postsLoading && allPosts.length === 0;
  const isBackgroundRefetch = postsRefetching && allPosts.length > 0;

  function isPostEditable(post: WPPostListItem) {
    const cats = post._embedded?.["wp:term"]
      ?.find((g) => g[0]?.taxonomy === "category")
      ?.map((c) => c.name) ?? [];
    return post.status === "draft" || cats.some((n) => ["Unlisted", "Unreviewed"].includes(n));
  }

  function closeMenu() {
    setActiveMenu(null);
    setDeleteConfirm(false);
  }

  async function handleDelete() {
    if (!cfg || !activeMenu) return;
    setIsDeleting(true);
    try {
      await deletePost(cfg, activeMenu.id);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["post-counts"] });
      closeMenu();
    } catch {
      /* silently ignore — user can retry */
    } finally {
      setIsDeleting(false);
    }
  }

  function handleRefresh() {
    refetchPosts();
    refetchCounts();
  }

  return (
    <div className="min-h-dvh bg-white">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="safe-top sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-5">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black tracking-tighter">Y</span>
            </div>
            {isBackgroundRefetch && (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse flex-shrink-0" />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={postsLoading || postsRefetching}
              title="Refresh"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 active:bg-gray-100 active:text-gray-700 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={15} className={postsRefetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => router.push("/write")}
              className="flex items-center gap-1.5 pl-4 pr-5 h-9 rounded-full text-sm font-medium bg-gray-900 text-white active:bg-gray-700 transition-colors"
            >
              <PenLine size={14} />
              <span>Write</span>
            </button>
            {/* User monogram — opens account menu */}
            <button
              onClick={() => setShowUserMenu(true)}
              className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold flex-shrink-0 active:bg-gray-300 transition-colors"
            >
              {monogram}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="w-full max-w-[720px] mx-auto px-6 py-8 md:px-8">
        <h1 className="text-xl font-bold text-gray-900 mb-5">Your articles</h1>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-100">
          {(["publish", "draft", "comments"] as Filter[]).map((f) => {
            const label = f === "publish" ? "Published" : f === "draft" ? "Drafts" : "Comments";
            const count = f === "comments" ? commentTotal : (counts?.[f as "publish" | "draft"] ?? 0);
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
                  active ? "text-gray-900" : "text-gray-400 active:text-gray-600"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                    active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    {count}
                  </span>
                )}
                {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {/* Loading skeleton */}
        {isInitialLoad && (
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-4 py-5">
                <div className="flex-1 space-y-2.5 pt-0.5">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state — posts */}
        {filter !== "comments" && !isInitialLoad && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">
              {allPosts.length === 0
                ? "No articles yet."
                : `No ${filter === "publish" ? "published" : "draft"} articles.`}
            </p>
            {allPosts.length === 0 && (
              <button
                onClick={() => router.push("/write")}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600 transition-colors"
              >
                Write your first article
              </button>
            )}
          </div>
        )}

        {/* Post list */}
        {filtered.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {filtered.map((post) => {
              const title = stripHtml(post.title.rendered) || "Untitled";
              const thumbnail = post.featured_image || null;
              const categories = post._embedded?.["wp:term"]
                ?.find((group) => group[0]?.taxonomy === "category")
                ?.filter((t) => t.name !== "Uncategorized") ?? [];

              return (
                <li key={post.id}>
                  <div className="flex items-start gap-3 py-5">

                    {/* Text content — tapping navigates to post view */}
                    <button
                      onClick={() => router.push(`/posts/${post.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {title}
                      </p>

                      {/* Date + stats */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                        <span>{formatDate(post.modified)}</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} />
                          {post.total_comments} comments
                        </span>
                      </div>

                      {/* Category badges */}
                      {categories.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1">
                          {categories.slice(0, 2).map((cat) => (
                            <span key={cat.id} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              {cat.name}
                            </span>
                          ))}
                          {categories.length > 2 && (
                            <span className="text-[11px] text-gray-400 font-medium">
                              +{categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Thumbnail — tapping navigates to post view */}
                    {thumbnail && (
                      <button onClick={() => router.push(`/posts/${post.id}`)} className="flex-shrink-0">
                        <WpImage src={thumbnail} className="w-20 h-20 rounded-xl object-cover" />
                      </button>
                    )}

                    {/* 3-dot action menu — only for editable posts */}
                    {isPostEditable(post) && (
                      <button
                        onClick={() => { setActiveMenu(post); setDeleteConfirm(false); }}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-300 active:text-gray-600 -mr-2 mt-0.5"
                      >
                        <MoreVertical size={17} />
                      </button>
                    )}

                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Comments tab ─────────────────────────────────────────── */}
        {filter === "comments" && (
          <>
            {commentsLoading && allComments.length === 0 && (
              <div className="space-y-1 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="py-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {!commentsLoading && allComments.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-400 text-sm">No comments yet.</p>
              </div>
            )}

            {allComments.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {allComments.map((comment) => {
                  const postTitle = comment._embedded?.up?.[0]?.title?.rendered
                    ? stripHtml(comment._embedded.up[0].title.rendered)
                    : null;
                  const commentText = stripHtml(comment.content.rendered);
                  return (
                    <li key={comment.id}>
                      <button
                        onClick={() => router.push(`/posts/${comment.post}`)}
                        className="w-full text-left py-4"
                      >
                        <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed">
                          {commentText}
                        </p>
                        {postTitle && (
                          <p className="mt-1.5 text-xs text-blue-500 truncate">
                            {postTitle}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                          <span>{formatDate(comment.date)}</span>
                          {comment.status === "hold" && (
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                              Pending
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* Sentinel — triggers next page */}
        <div ref={sentinelRef} className="h-1" />

        {(isFetchingNextPage || isFetchingNextCommentsPage) && (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-gray-300" />
          </div>
        )}

        {filter !== "comments" && !hasNextPage && allPosts.length > 0 && !isInitialLoad && (
          <p className="text-center text-xs text-gray-200 py-6">All articles loaded</p>
        )}
        {filter === "comments" && !hasNextCommentsPage && allComments.length > 0 && !commentsLoading && (
          <p className="text-center text-xs text-gray-200 py-6">All comments loaded</p>
        )}
      </main>

      {/* ── Post action bottom sheet ──────────────────────────────── */}
      {activeMenu && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={closeMenu}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Sheet */}
          <div
            className="relative w-full bg-white rounded-t-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Post title */}
            <p className="px-5 pb-1 text-sm font-semibold text-gray-900 line-clamp-1">
              {stripHtml(activeMenu.title.rendered) || "Untitled"}
            </p>

            <div className="px-3 pt-1 pb-2">
              {deleteConfirm ? (
                /* ── Confirm delete ──────────────────────────── */
                <>
                  <p className="px-3 py-3 text-sm text-gray-500">
                    This will permanently delete the article. This cannot be undone.
                  </p>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm font-medium text-red-600 bg-red-50 active:bg-red-100 disabled:opacity-60"
                  >
                    {isDeleting
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Trash2 size={18} />}
                    {isDeleting ? "Deleting…" : "Yes, permanently delete"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-gray-500 active:bg-gray-50 mt-0.5"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                /* ── Actions ─────────────────────────────────── */
                <>
                  <button
                    onClick={() => { router.push(`/write?id=${activeMenu.id}`); closeMenu(); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-gray-800 active:bg-gray-50"
                  >
                    <PenLine size={18} className="text-gray-500" />
                    Edit article
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-red-500 active:bg-red-50"
                  >
                    <Trash2 size={18} />
                    Delete article
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── User account bottom sheet ─────────────────────────────── */}
      {showUserMenu && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowUserMenu(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white rounded-t-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* User identity */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <div className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {monogram}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name || user.username}</p>
                <p className="text-xs text-gray-400 truncate">{user.username}</p>
              </div>
            </div>

            <div className="px-3 pt-1 pb-2">
              <button
                onClick={() => { router.push("/profile"); setShowUserMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-gray-800 active:bg-gray-50"
              >
                <User size={18} className="text-gray-500" />
                Edit profile
              </button>
              <button
                onClick={() => { logout(); setShowUserMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm text-red-500 active:bg-red-50"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
