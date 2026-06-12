import { NextRequest, NextResponse } from "next/server";
import { WP_SITE_URL } from "@/lib/wp-config";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  if (!url.startsWith(`${WP_SITE_URL}/`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const auth = req.headers.get("x-wp-auth");
  const headers: HeadersInit = {};
  if (auth) headers["Authorization"] = auth;

  const res = await fetch(url, { headers });
  if (!res.ok) return new NextResponse("Upstream error", { status: res.status });

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
