import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only proxy requests to the known WP site
  if (!url.startsWith("https://ykasandbox.com/")) {
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
      "Cache-Control": "public, max-age=86400",
    },
  });
}
