/**
 * Words that must keep their exact casing in post titles.
 * Matching is case-insensitive, so "iphone", "iPhone", "IPHONE" all map to "iPhone".
 *
 * To add a word: append it to the array with the correct casing and save the file.
 */
const TITLE_CASE_BLOCKLIST: string[] = [
  // Apple
  "iPhone", "iPad", "iPod", "iMac", "iOS", "iPadOS", "macOS", "tvOS", "watchOS", "MacBook", "AirPods",
  // Google / Android
  "Android", "YouTube", "Gmail", "WhatsApp",
  // Social / tech
  "LinkedIn", "TikTok", "ChatGPT", "OpenAI", "WordPress", "eBay", "PayPal",
  // India / YKA context
  "OBC", "BJP", "AAP",
];

export const blocklistMap = new Map<string, string>(
  TITLE_CASE_BLOCKLIST.map((w) => [w.toLowerCase(), w])
);
