export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
