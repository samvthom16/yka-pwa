/**
 * Server-side proxy for the WordPress REST API.
 *
 * The browser calls this (same-origin, so no CORS) instead of WordPress
 * directly. This is the only place that attaches the Cloudflare WAF bypass
 * secret, so the secret never reaches the client bundle.
 */
import { NextRequest, NextResponse } from "next/server";
import { WP_SITE_URL } from "@/lib/wp-config";

const CF_BYPASS_HEADER = "x-yka-bypass-secret";
const PROXY_PREFIX = "/api/wp";

const FORWARD_REQUEST_HEADERS = ["authorization", "content-type", "content-disposition"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "x-wp-total", "x-wp-totalpages"];

async function proxy(req: NextRequest) {
  const upstreamPath = req.nextUrl.pathname.slice(PROXY_PREFIX.length);
  const target = new URL(`${WP_SITE_URL}${upstreamPath}`);
  target.search = req.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const secret = process.env.CF_BYPASS_SECRET;
  if (secret) headers.set(CF_BYPASS_HEADER, secret);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
  };
  if (hasBody) init.duplex = "half";

  const upstream = await fetch(target, init);

  const resHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) resHeaders.set(name, value);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE, proxy as PATCH };
