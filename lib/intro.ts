/**
 * Whether this browsing session has already seen the intro film.
 *
 * The film plays once per visit: on the first page someone opens, not on every
 * reload or every page after it. Played on every load it was the largest
 * paint of every page, about eleven seconds in on a phone, which is how
 * search engines scored every page's loading. A visit is a tab's session, so
 * a new visit, or a new tab, sees it again.
 *
 * Shared by the loader, which reads and writes the flag, and by the root
 * layout's inline script, which reads it before the first paint so a page that
 * will skip the film never flashes its panel before the scripts arrive.
 */
export const INTRO_SEEN_KEY = "sy-intro-seen";

/** The attribute the inline script sets on <html> when the film is to be skipped. */
export const INTRO_SEEN_ATTR = "data-intro-seen";

/**
 * Runs before the page paints. Wrapped in try because storage can be blocked
 * (private windows, strict settings), in which case the film simply plays.
 */
export const INTRO_SEEN_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(INTRO_SEEN_KEY)}))document.documentElement.setAttribute(${JSON.stringify(INTRO_SEEN_ATTR)},"")}catch(e){}`;

export function introSeen() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {}
}
