import { WP_SITE_URL } from "@/lib/wp-config";

const BASE = `${WP_SITE_URL}/wp-json/yka/v2`;

function b64(value: string): string {
  return btoa(value);
}

export interface WPUser {
  name: string;
  username: string;
  password: string;
}

export async function sendOtp(email: string): Promise<void> {
  const body = new URLSearchParams({ email_address: b64(email) });
  const res = await fetch(`${BASE}/send-otp/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Server error ${res.status}`);
  }
}

export async function verifyOtp(email: string, otp: string): Promise<WPUser> {
  const body = new URLSearchParams({
    email_address: b64(email),
    email_otp: b64(otp),
  });
  const res = await fetch(`${BASE}/verify-otp/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Server error ${res.status}`);
  }
  if (
    !data ||
    typeof data.username !== "string" ||
    typeof data.password !== "string"
  ) {
    throw new Error("Unexpected response from server. Please try again.");
  }
  return data as WPUser;
}
