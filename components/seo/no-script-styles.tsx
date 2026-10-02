/**
 * What the page looks like to anything that reads it without running it.
 *
 * Three things on the site are hidden by CSS until JavaScript takes them
 * over: every `[data-reveal]` block (each heading and paragraph that wipes in
 * is invisible until GSAP has set its starting state), the header's mark
 * (handed to it by the intro), and the intro itself, a full-screen panel
 * that only its own script ever removes. Without scripts all three stay as
 * they start, so the page is a blank panel over invisible copy: that is what
 * a crawler that does not render, a link preview, a reader mode or a browser
 * with scripts off was shown.
 *
 * A `<noscript>` stylesheet undoes exactly those three and nothing else. A
 * browser running scripts never applies it, so the animated site is
 * untouched, and there is no class to set before paint and nothing to get
 * wrong in the order things load. The intro is found by the panel it holds,
 * the one hook it already carries; its stage and panel are hidden by a rule
 * of their own as well, so a browser too old to read `:has()` (which drops
 * that whole rule) still loses the picture.
 *
 * Written as an HTML string because React does not hydrate the children of a
 * `<noscript>`; a string is what it expects there.
 */
const CSS = [
  "[data-reveal]:not(.is--ready){visibility:visible}",
  "[data-header-logo]{visibility:visible}",
  "[data-loader-panel],[data-loader-stage]{display:none}",
  ":has(>[data-loader-panel]){display:none}",
].join("");

export default function NoScriptStyles() {
  return <noscript dangerouslySetInnerHTML={{ __html: `<style>${CSS}</style>` }} />;
}
