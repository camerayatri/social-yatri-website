import { NextResponse, type NextRequest } from "next/server";
import { adminSegment } from "@/lib/cms/admin-path";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SLIDE_WHEN_BELOW_SECONDS,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/cms/auth/cookie";

/**
 * The admin's front door.
 *
 * The admin's routes live under `app/cms`, but `/cms` is never its address:
 * the repository is public, so anyone can read that folder name. Requests for
 * `/cms` itself are rewritten to a path that does not exist and get the site's
 * ordinary 404. The real address is `/<ADMIN_PATH>/...`, from a server-only
 * variable, which this rewrites onto `/cms/...`.
 *
 * On the way it turns away anyone without a well-signed, unexpired session
 * cookie (to the sign-in page), slides a live session's expiry forward, and
 * marks every admin response as not for indexing, caching, framing or
 * referring. This is only a fast filter: each admin page, action and route
 * handler authorizes itself against the database with `requireMaintainer()`.
 *
 * Two admin paths skip the cookie check because they authorize themselves:
 * the sign-in page, and the upload route, whose completion callback comes from
 * Vercel Blob's servers and carries no cookie.
 */

const NOT_FOUND = "/__not-found";

const ADMIN_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
};

function withAdminHeaders(response: NextResponse) {
  for (const [name, value] of Object.entries(ADMIN_HEADERS)) response.headers.set(name, value);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/cms" || pathname.startsWith("/cms/")) {
    return NextResponse.rewrite(new URL(NOT_FOUND, request.url));
  }

  const segment = adminSegment();
  if (!segment) return NextResponse.next();
  const base = `/${segment}`;
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return NextResponse.next();

  const rest = pathname.slice(base.length).replace(/\/+$/, "");
  const target = new URL(`/cms${rest}${search}`, request.url);

  if (rest === "/login" || rest === "/api/upload") {
    return withAdminHeaders(NextResponse.rewrite(target));
  }

  const session = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const login = new URL(`${base}/login`, request.url);
    if (rest && rest !== "/") login.searchParams.set("next", rest);
    const response = withAdminHeaders(NextResponse.redirect(login));
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const response = withAdminHeaders(NextResponse.rewrite(target));

  // Sliding expiry. The database row is pushed forward by requireMaintainer
  // on the same request; the two stay within a request of each other.
  const now = Math.floor(Date.now() / 1000);
  if (session.exp - now < SLIDE_WHEN_BELOW_SECONDS) {
    const exp = now + SESSION_TTL_SECONDS;
    response.cookies.set(SESSION_COOKIE, signSession(session.id, exp), sessionCookieOptions(exp));
  }
  return response;
}

export const config = {
  matcher: [
    // /cms in full, file extensions included, so no admin route can ever be
    // reached at its folder name by looking like a static file.
    "/cms/:path*",
    // Everything else except Next's own assets and files served from public/.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|mov|woff2?|txt|xml|webmanifest|json|css|js|map)$).*)",
  ],
};
