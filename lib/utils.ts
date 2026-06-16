export function formatDate(iso: string): string {
  const date = new Date(iso);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function stripHtml(html: string): string {
  if (typeof window === "undefined") {
    // SSR fallback — entities stay encoded but that's acceptable server-side
    return html.replace(/<[^>]*>/g, "").trim();
  }
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
}
