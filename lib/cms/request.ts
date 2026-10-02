import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * The caller's IP and user agent, for sessions, rate limits and the audit
 * trail. On Vercel the first `x-forwarded-for` entry is the client, set by the
 * platform; elsewhere it is whatever the nearest proxy says, which is why it
 * is only ever used to slow people down and never to let them in.
 */
export async function requestInfo() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  const ua = (h.get("user-agent") ?? "").slice(0, 300);
  return { ip, ua };
}

/** A salted hash of an IP, for tables that should not hold the address itself. */
export function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
