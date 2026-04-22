/**
 * HTML export utilities
 *
 * Sanitises TipTap's getHTML() output so it's safe to send to
 * WordPress or embed anywhere.  DOMPurify is browser-only, so
 * this module must only run client-side.
 */

import DOMPurify from "dompurify";

/** Allowed HTML tags for blog content */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "hr",
  "code",
  "pre",
  "figure",
  "figcaption",
];

/** Allowed attributes */
const ALLOWED_ATTR = ["href", "src", "alt", "title", "rel", "target", "class"];

/**
 * Sanitise a raw HTML string from TipTap.
 * Returns a clean, safe HTML string ready for storage / publishing.
 */
export function sanitizeHTML(raw: string): string {
  if (typeof window === "undefined") return raw; // SSR guard
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["style", "onerror", "onload"],
    // Strip empty <p> tags that TipTap sometimes appends
    FORCE_BODY: true,
  }).trim();
}

/**
 * Build a standalone HTML document from title + sanitised body.
 * Suitable for download as .html.
 */
export function buildStandaloneHTML(title: string, bodyHTML: string): string {
  const safe = sanitizeHTML(bodyHTML);
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle || "Untitled"}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      max-width: 720px;
      margin: 0 auto;
      padding: 3rem 1.5rem 6rem;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 1.125rem;
      line-height: 1.8;
      color: #374151;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #111;
      letter-spacing: -0.02em;
    }
    h1 { font-size: 2rem; font-weight: 700; margin-top: 2.5rem; }
    h2 { font-size: 1.5rem; font-weight: 700; margin-top: 2rem; }
    h3 { font-size: 1.175rem; font-weight: 600; margin-top: 1.5rem; }
    p { margin: 0; }
    p + p { margin-top: 1.25rem; }
    blockquote {
      border-left: 3px solid #111;
      margin: 2rem 0;
      padding: 0.25rem 0 0.25rem 1.5rem;
      font-style: italic;
      color: #555;
    }
    ul { list-style: disc; padding-left: 1.5rem; }
    ol { list-style: decimal; padding-left: 1.5rem; }
    li { margin: 0.25rem 0; }
    a { color: #111; text-decoration: underline; text-underline-offset: 3px; }
    img { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 1.5rem 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }
    code {
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 0.875em;
      background: #f5f5f5;
      border-radius: 4px;
      padding: 0.15em 0.4em;
      color: #d63031;
    }
    pre {
      background: #1a1a1a;
      color: #f8f8f2;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    pre code { background: none; color: inherit; padding: 0; }
  </style>
</head>
<body>
  ${safeTitle ? `<h1>${safeTitle}</h1>\n  ` : ""}${safe}
</body>
</html>`;
}

/**
 * Trigger a browser download of the standalone HTML file.
 */
export function downloadHTML(title: string, bodyHTML: string): void {
  const html = buildStandaloneHTML(title, bodyHTML);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(title || "untitled").replace(/\s+/g, "-").toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
