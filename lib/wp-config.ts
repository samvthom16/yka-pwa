export const WP_SITE_URL = "https://youthkiawaaz.com";

// Header name the Cloudflare WAF custom rule matches on to skip the
// bot-fight/managed-challenge for this app's API traffic. Secret value comes
// from NEXT_PUBLIC_CF_BYPASS_SECRET (set in Vercel env vars, not committed).
export const CF_BYPASS_HEADER = "x-yka-bypass-secret";

export function cfBypassHeaders(): Record<string, string> {
  const secret = process.env.NEXT_PUBLIC_CF_BYPASS_SECRET;
  return secret ? { [CF_BYPASS_HEADER]: secret } : {};
}
