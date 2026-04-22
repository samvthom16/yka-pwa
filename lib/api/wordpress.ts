/**
 * WordPress REST API client
 *
 * Requires Application Passwords (built-in since WP 5.6).
 * Generate one at: Users → Your Profile → Application Passwords.
 *
 * Usage:
 *   const config = { siteUrl: "https://example.com", username: "admin", appPassword: "xxxx xxxx xxxx" }
 *   const post = await publishPost(config, { title: "Hello", content: "<p>World</p>", status: "draft" })
 */

export interface WPConfig {
  siteUrl: string;   // e.g. "https://myblog.com"  — no trailing slash
  username: string;
  appPassword: string; // Application Password (spaces OK)
}

export interface WPPostInput {
  title: string;
  content: string;      // clean HTML
  status: "draft" | "publish" | "private" | "pending";
  slug?: string;
  excerpt?: string;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
}

export interface WPPostResponse extends WPPostInput {
  id: number;
  link: string;
  date: string;
  modified: string;
}

export interface WPMediaResponse {
  id: number;
  source_url: string;
  alt_text: string;
  mime_type: string;
}

/* ─── Auth ───────────────────────────────────────────────────── */
function authHeader(cfg: WPConfig): string {
  const cleaned = cfg.appPassword.replace(/\s/g, "");
  return `Basic ${btoa(`${cfg.username}:${cleaned}`)}`;
}

function apiUrl(cfg: WPConfig, path: string): string {
  return `${cfg.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2${path}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/* ─── Posts ──────────────────────────────────────────────────── */
export async function createPost(
  cfg: WPConfig,
  post: WPPostInput
): Promise<WPPostResponse> {
  const res = await fetch(apiUrl(cfg, "/posts"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(cfg),
    },
    body: JSON.stringify(post),
  });
  return handleResponse<WPPostResponse>(res);
}

export async function updatePost(
  cfg: WPConfig,
  postId: number,
  patch: Partial<WPPostInput>
): Promise<WPPostResponse> {
  const res = await fetch(apiUrl(cfg, `/posts/${postId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(cfg),
    },
    body: JSON.stringify(patch),
  });
  return handleResponse<WPPostResponse>(res);
}

/* ─── Media ──────────────────────────────────────────────────── */
export async function uploadMedia(
  cfg: WPConfig,
  file: File,
  altText?: string
): Promise<WPMediaResponse> {
  const form = new FormData();
  form.append("file", file);
  if (altText) form.append("alt_text", altText);

  const res = await fetch(apiUrl(cfg, "/media"), {
    method: "POST",
    headers: {
      Authorization: authHeader(cfg),
      // Content-Disposition tells WP the original filename
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
    body: form,
  });
  return handleResponse<WPMediaResponse>(res);
}
