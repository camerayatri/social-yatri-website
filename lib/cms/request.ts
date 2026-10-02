import "server-only";
import { createHash } from "node:crypto";
import { isIPv6 } from "node:net";
import { headers } from "next/headers";

/**
 * The caller's IP and user agent, for sessions, rate limits and the audit
 * trail.
 *
 * On Vercel both `x-real-ip` and `x-forwarded-for` hold the client's address
 * and nothing else: the platform overwrites whatever the request arrived
 * with, so neither can be spoofed by sending the header. Elsewhere they are
 * whatever the nearest proxy says (and the first `x-forwarded-for` entry is
 * whatever the client said), which is why the address is only ever used to
 * slow people down and never to let anyone in.
 */
export async function requestInfo() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip")?.trim() || "unknown";
  const ua = (h.get("user-agent") ?? "").slice(0, 300);
  return { ip, ua };
}

/**
 * The part of an address that identifies one sender, for counting.
 *
 * An IPv4 address as it is. An IPv6 address cut to its /64: that is what an
 * ISP hands one household or one phone, and the device picks fresh addresses
 * inside it as often as it likes (privacy extensions rotate them daily, and a
 * script can rotate them per request), so counting whole IPv6 addresses
 * would give every sender as many tries as they cared to take. An IPv4
 * address written in IPv6 form (`::ffff:1.2.3.4`) is the IPv4 address.
 */
export function senderKey(ip: string) {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) return mapped[1];
  if (!isIPv6(ip)) return ip;
  // Expand `::` so the first four groups can be read off.
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::") ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  return `${groups.slice(0, 4).map((g) => g.padStart(4, "0")).join(":")}::/64`;
}

/** A salted hash of an IP, for tables that should not hold the address itself. */
export function hashIp(ip: string) {
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
