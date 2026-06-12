"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import LoginScreen from "@/components/auth/LoginScreen";
import { getPosts, getPostCounts, getMe, buildAuthHeader } from "@/lib/api/wordpress";
import type { WPPostListItem } from "@/lib/api/wordpress";
import { WP_SITE_URL } from "@/lib/wp-config";
import { formatDate, stripHtml } from "@/lib/utils";
import WpImage from "@/components/ui/WpImage";
import { Loader2, PenLine, RefreshCw, LogOut } from "lucide-react";

const PER_PAGE = 20;

type Filter = "all" | "publish" | "draft";

function wpConfig(user: { username: string; password: string }) {
  return { siteUrl: WP_SITE_URL, username: user.username, appPassword: user.password };
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const cfg = user ? wpConfig(user) : null;
  const auth = user ? buildAuthHeader(user.username, user.password) : "";

  /* ── Resolve WP author ID ────────────────────────────────────── */
  const { data: me } = useQuery({
    queryKey: ["me", user?.username],
    queryFn: () => getMe(cfg!),
    enabled: !!cfg,
    staleTime: Infinity, // user ID never changes
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

  /* ── Infinite scroll sentinel ────────────────────────────────── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* ── Auth states ─────────────────────────────────────────────── */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={login} />;

  /* ── Flatten pages into a single list ───────────────────────── */
  const allPosts: WPPostListItem[] = postsData?.pages.flatMap((p) => p.posts) ?? [];

  const filtered = allPosts.filter((p) => {
    if (filter === "publish") return p.status === "publish";
    if (filter === "draft") return p.status === "draft";
    return true;
  });

  const isInitialLoad = postsLoading && allPosts.length === 0;
  const isBackgroundRefetch = postsRefetching && allPosts.length > 0;

  function handleRefresh() {
    refetchPosts();
    refetchCounts();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-5 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-black tracking-tighter">Y</span>
          </div>
          <span className="text-sm font-medium text-gray-700">{user.name || user.username}</span>
          {/* Subtle background-refetch indicator */}
          {isBackgroundRefetch && (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/write")}
            className="flex items-center gap-1.5 pl-3 pr-4 h-8 rounded-full text-[13px] font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            <PenLine size={13} />
            <span>New article</span>
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-[720px] mx-auto px-6 py-10 md:px-8">
        {/* Title + refresh */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Your articles</h1>
          <button
            onClick={handleRefresh}
            disabled={postsLoading || postsRefetching}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} className={postsRefetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-7 border-b border-gray-100">
          {(["all", "publish", "draft"] as Filter[]).map((f) => {
            const label = f === "all" ? "All" : f === "publish" ? "Published" : "Drafts";
            const count = counts?.[f] ?? 0;
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {count}
                  </span>
                )}
                {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {/* Initial loading skeleton */}
        {isInitialLoad && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-4 py-4 border-b border-gray-100">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isInitialLoad && filtered.length === 0 && (
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
              const excerpt = stripHtml(post.excerpt.rendered);
              const isPublished = post.status === "publish";
              const thumbnail = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
              const categories = post._embedded?.["wp:term"]
                ?.find((group) => group[0]?.taxonomy === "category")
                ?.filter((t) => t.name !== "Uncategorized") ?? [];
              const categoryNames = categories.map((c) => c.name);
              const isEditable =
                post.status === "draft" ||
                categoryNames.some((n) => ["Unlisted", "Unreviewed"].includes(n));
              return (
                <li key={post.id}>
                  <div className="group flex items-start gap-4 py-5">
                    <button
                      onClick={() => router.push(`/posts/${post.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-500 transition-colors line-clamp-2">
                        {title}
                      </p>
                      {excerpt && (
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{excerpt}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isPublished ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-green-500" : "bg-gray-400"}`} />
                          {isPublished ? "Published" : "Draft"}
                        </span>
                        {categories.map((cat) => (
                          <span key={cat.id} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            {cat.name}
                          </span>
                        ))}
                        <span className="text-xs text-gray-300">{formatDate(post.modified)}</span>
                      </div>
                    </button>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {thumbnail && (
                        <WpImage
                          src={thumbnail}
                          auth={auth}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      {isEditable && (
                        <button
                          onClick={() => router.push(`/write?id=${post.id}`)}
                          className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <PenLine size={11} />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Sentinel — triggers next page */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading next page */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-gray-300" />
          </div>
        )}

        {/* End of list */}
        {!hasNextPage && allPosts.length > 0 && !isInitialLoad && (
          <p className="text-center text-xs text-gray-200 py-6">All articles loaded</p>
        )}
      </main>
    </div>
  );
}
