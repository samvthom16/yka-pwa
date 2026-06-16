"use client";

import { useRouter } from "next/navigation";
import type { InfiniteData } from "@tanstack/react-query";
import type { CommentsPage } from "@/lib/api/wordpress";
import { formatDate, stripHtml } from "@/lib/utils";

export default function CommentsTab({
  data,
  isLoading,
}: {
  data: InfiniteData<CommentsPage> | undefined;
  isLoading: boolean;
}) {
  const router = useRouter();
  const allComments = data?.pages.flatMap((p) => p.comments) ?? [];

  if (isLoading && allComments.length === 0) {
    return (
      <div className="space-y-1 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-4 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && allComments.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">No comments yet.</p>
      </div>
    );
  }

  return (
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
              <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed">{commentText}</p>
              {postTitle && (
                <p className="mt-1.5 text-xs text-blue-500 truncate">{postTitle}</p>
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
  );
}
