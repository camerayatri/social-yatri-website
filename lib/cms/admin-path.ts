/**
 * Where the admin lives.
 *
 * The repository is public, so the admin's address cannot be written in it.
 * It comes from ADMIN_PATH, a server-only variable (never NEXT_PUBLIC_), and
 * the proxy maps `/<ADMIN_PATH>/...` onto the `app/cms` routes while sending
 * direct `/cms` requests to a 404. Server code reads the base from here; client
 * components get it as a prop from the admin layout.
 *
 * Unset or unusable means no admin at all, which is the safe failure.
 */

/** Segments the public site or Next already owns. */
const RESERVED = new Set(["cms", "api", "_next", "work", "services", "studio", "contact", "photoshoot", "img", "video"]);

export function adminSegment(): string | null {
  const value = process.env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, "");
  if (!value) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/.test(value)) return null;
  if (RESERVED.has(value.toLowerCase())) return null;
  return value;
}

/** `/<ADMIN_PATH>`, for links and redirects. Throws when the admin is not configured. */
export function adminBase(): string {
  const segment = adminSegment();
  if (!segment) throw new Error("ADMIN_PATH is not set (8 to 64 letters, digits or hyphens).");
  return `/${segment}`;
}

/** `/<ADMIN_PATH>/<path>`. */
export function adminHref(path = "") {
  const clean = path.replace(/^\/+/, "");
  return clean ? `${adminBase()}/${clean}` : adminBase();
}
