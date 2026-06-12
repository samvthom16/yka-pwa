export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function stripHtml(html: string): string {
  if (typeof window === "undefined") {
    // SSR fallback — entities stay encoded but that's acceptable server-side
    return html.replace(/<[^>]*>/g, "").trim();
  }
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
}
