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
export function buildAuthHeader(username: string, appPassword: string): string {
  return `Basic ${btoa(`${username}:${appPassword.replace(/\s/g, "")}`)}`;
}

function authHeader(cfg: WPConfig): string {
  return buildAuthHeader(cfg.username, cfg.appPassword);
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

/* ─── Current user ───────────────────────────────────────────── */
export async function getMe(cfg: WPConfig): Promise<{ id: number; name: string; slug: string }> {
  const res = await fetch(apiUrl(cfg, "/users/me"), {
    headers: { Authorization: authHeader(cfg) },
  });
  return handleResponse(res);
}

/* ─── Types ──────────────────────────────────────────────────── */
export interface WPPostListItem {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  status: "publish" | "draft" | "private" | "pending";
  date: string;
  modified: string;
  link: string;
  excerpt: { rendered: string };
  sticky: boolean;
  featured_media: number;
  categories: number[];
  /** Direct URL to the default-size featured image (plugin-added field) */
  featured_image: string;
  /** srcset strings for responsive featured image (plugin-added field) */
  featured_image_srcset: string[];
  view_count: number;
  total_comments: number;
  like: { total: number | null };
  _embedded?: {
    "wp:term"?: Array<Array<{ id: number; name: string; taxonomy: string }>>;
  };
}

/* ─── Posts ──────────────────────────────────────────────────── */
export interface PostsPage {
  posts: WPPostListItem[];
  totalPages: number;
}

export interface PostCounts {
  all: number;
  publish: number;
  draft: number;
}

export async function getPostCounts(cfg: WPConfig, authorId?: number): Promise<PostCounts> {
  async function fetchCount(status: string): Promise<number> {
    const params = new URLSearchParams({ status, per_page: "1" });
    if (authorId) params.set("author", String(authorId));
    const res = await fetch(apiUrl(cfg, `/posts?${params}`), {
      headers: { Authorization: authHeader(cfg) },
    });
    if (!res.ok) return 0;
    return Number(res.headers.get("X-WP-Total") ?? "0");
  }
  const [publish, draft] = await Promise.all([
    fetchCount("publish"),
    fetchCount("draft"),
  ]);
  return { all: publish + draft, publish, draft };
}

export async function getPost(cfg: WPConfig, id: number): Promise<WPPostListItem> {
  const res = await fetch(apiUrl(cfg, `/posts/${id}?_embed=wp:term`), {
    headers: { Authorization: authHeader(cfg) },
  });
  return handleResponse<WPPostListItem>(res);
}

export async function getPosts(
  cfg: WPConfig,
  page = 1,
  perPage = 20,
  statuses: string[] = ["publish", "draft"],
  authorId?: number
): Promise<PostsPage> {
  const params = new URLSearchParams({
    status: statuses.join(","),
    per_page: String(perPage),
    page: String(page),
    orderby: "modified",
    order: "desc",
    _embed: "wp:term",
  });
  if (authorId) params.set("author", String(authorId));
  const res = await fetch(apiUrl(cfg, `/posts?${params}`), {
    headers: { Authorization: authHeader(cfg) },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const b = await res.json(); message = b?.message ?? message; } catch { /* */ }
    throw new Error(message);
  }
  const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
  const posts = await res.json() as WPPostListItem[];
  return { posts, totalPages };
}


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
