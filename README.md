# Social Yatri

A site for a Kolkata content and social-media studio, built on **Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + GSAP 3.15**.

The client's `social-yatri.html` is the **copy source only**. Every word on the site
comes from it verbatim and lives in `lib/content.ts`; none of its visual design is
used.

## Design

Every value below is measured rather than eyeballed.

- **Surfaces.** The page is paper, a warm off-white (`#f2efe9`) under film grain 
  and ink (`#141414`, not black) takes the sections that need
  weight: the services index and testimonials on the home page, the marquee strips,
  home turf on `/studio`, the menu and the footer. Everything muted is the foreground
  at reduced opacity, floored at 60% for small type so it clears AA on both. The
  photography is in colour; the surfaces are what stay monochrome.
- **Grain.** A film grain layer (its noise texture (self-hosted at
  `public/img/noise.avif`), opacity, filter, tile size and five-step crawl) but placed
  *under* the content rather than over it, at the client's request. One fixed layer
  sits behind the page for the paper; every opaque surface (`.surface-ink`,
  `.surface-paper`, the two gradients, the sticky tab headers, the loader panel) carries
  its own copy as a `::before` pinned beneath its content. Type and photographs stay
  clean. `.gradient-paper` (hero, 404) and `.gradient-ink` (menu, footer) add a soft
  bloom of the brand yellow inside the surface colour.
- **Yellow.** The brand colour marks state and affordance, never area: the pin in the
  mark, the active square in the side column, the cursor (a dot that opens into a
  ring over anything clickable), keyboard focus and text selection, the bubble of the
  primary button, pills and links on hover, the active filter, the one headline number
  on the growth section, and the drawn line beside the process.
- **Chrome.** The fixed mark, MENU and side column are painted white with
  `mix-blend-mode: difference`, so they read ink over paper, paper over ink, and
  invert wherever they cross type of their own colour or a photograph. The header
  is `display: contents` so each piece sits in the root stacking context, which the
  blend needs. The yellow pin would turn blue under the blend, so it is drawn a
  second time in a plain layer above the blended mark. The static mark cuts its
  lane markings out of the road with the even-odd rule, so whatever is behind it
  shows through the gaps.
- **Grid.** A fixed 20px page gutter and a 44px corner inset for the fixed
  furniture. Both are `px` on purpose: corners that scale with the viewport stop
  feeling pinned.
- **Type.** PP Neue Montreal for text and display, Geist Mono for every small label.
  Only the Medium cut of PP Neue Montreal is in the repo, so the site runs at one
  weight and builds hierarchy from size, tracking and opacity. Never apply a bold
  utility to it.
- **Home.** One viewport: the work on a scroll-driven 3D spiral wearing the
  client's designed covers, the statement bottom-left, the sound switch
  bottom-right. There is no route column; MENU carries the navigation everywhere
  and opens an overlay of the routes set very large, right-aligned, with a
  rolling hover.
- **Sections.** A section label that spreads its letters across the page
  on scroll and gathers in the right corner, below the chrome; a two-column works grid
  deliberately out of step, each item a mono caption, a sentence-case title, then the
  image; the studio note with its marker, small still and paragraph; and the "View all
  ↳ (09) © 2026" closing row. Every page head is the same two-column grid (marker at
  42%, headline opposite) and the bodies beneath sit on that axis: the services tab
  copy, the route steps on the home page, the contact form, the work wall.
- **Colour on every page.** Each services tab carries the still of a ride that came
  out of that stop; the contact page's direct column sits under a still; the
  testimonials carry a still per thread; the home services index surfaces one on
  hover.
- **Footer.** One viewport tall: the closing line and two outlined pills
  top-left, the social column at four-fifths, a mono row along the bottom edge, and the
  wordmark fitted to the page width by measurement and bled off the bottom.

## Routes

| Route | What's on it |
| --- | --- |
| `/` | The spiral, the works grid, the studio note and Flip scene, services index, growth numbers, testimonials |
| `/services` | The seven stops as stacking sticky tabs, then the route in full |
| `/work` | The reel wall, filtered by the option wheel |
| `/work/[slug]` | One ride. Nine of them, statically generated |
| `/studio` | Who's driving, home turf, the crew, passengers |
| `/contact` | The booking form |

## The loader

`components/loader.tsx`. The mark is **drawn, not faded in**.

`logo.psd` was traced to vector outlines with potrace and normalised to a 1000×369
viewBox (`components/logo/logo-paths.ts`). Because every shape is a closed outline,
DrawSVGPlugin can stroke them in sequence:

1. the road (the script `S` plus the swoosh) draws as one continuous pen stroke;
2. the lane markings pop in along it, trailing the pen;
3. the letters of "cial Yatri" draw left to right;
4. the map pin drops onto the road;
5. ink floods each group's fill and the pen outlines drop away.

It ends by handing the mark to the header: `Flip.fit` measures the small logo in the
nav and flies the big one onto that exact box, so the two are never both on screen
and there is no jump at the swap. A counter tracks the timeline itself, so it cannot
finish early or late.

To re-trace after a logo change, see `components/logo/logo-paths.ts`, the groups
(`road`, `dashes`, `pinBody`, `pinInk`, `letters`) are what the timeline animates.

## The effects

| Effect | Where it lives | What it does here |
| --- | --- | --- |
| Drawn page transition | `components/transition/transition-provider.tsx` | The route transition. The spiral draws to 85% while the stroke fattens 5% → 30% to cover; the stroke then thins back to 5% while the line is erased from its own start. A paper plane flies the head of the line as it draws (this site's addition, see below) |
| Shutter page transition | same file | Drilling into a case study. Ten shutters, 0.5s each, staggered 0.3s from the end |
| Draw path on scroll | `components/effects/howrah-bridge.tsx` | The Howrah Bridge beside the eight-stage route, drawn in lockstep with the scrollbar |
| Progressive blur | `components/effects/progressive-blur.tsx` | Dissolves the lowest cards of the spiral into the foot of the viewport. Five masked `backdrop-filter` layers |
| Scaling element on scroll (GSAP Flip) | `components/effects/flip-scroll.tsx` | The studio frame growing to full bleed across three waypoints on the home page |
| Sticky section tabs | `components/effects/sticky-tabs.tsx` | The seven services stacking on `/services`. No JavaScript |
| Button with a bubble arrow | `app/globals.css` + `components/effects/bubble-button.tsx` | Every call to action |
| Option wheel | `components/effects/option-wheel.tsx` | The category filter on `/work` |
| Film grain | `app/globals.css` (`.grain`, `.surface-*`, `.gradient-*`) | The stock every surface is printed on: under the content, not over it |

### Notes on the implementations

- **Drawn transition.** Leave and enter run in sequence, not concurrently: the App
  Router has a single container and enter cannot start until the new route has
  committed. The paper plane is an HTML element, not a child of the overlay SVG: that SVG is
  stretched to the viewport with `preserveAspectRatio="none"`, and anything inside it
  would be stretched (and, once rotated, sheared) with it. Instead the point on the
  path is read with `MotionPathPlugin.getPositionOnPath` in viewBox units and mapped
  through the SVG's own screen matrix, so the plane sits on the stroke at its true
  proportions. It rides the leave only; the uncover has no head to lead.
- **Film grain** is the resource's texture and timing but not its stacking. The
  original is a single fixed overlay above everything; here it is beneath the content
  (see Design › Grain).
- **Draw path on scroll** keeps its trigger exactly (`clamp()` on both
  ends so a section near the top of the document cannot load part-drawn, the reveal
  tied 1:1 to the scrollbar, `invalidateOnRefresh`) but not DrawSVGPlugin. DrawSVG
  strokes a path by measuring its length once and animating a dash; the bridge is
  re-projected every frame as the camera moves, so its length changes between frames
  and a dash measured on the first would be wrong on the second. The reveal is cut
  from the polyline instead, which is exact at any camera angle. (DrawSVGPlugin is
  still what strokes the page transition, where the path is fixed.)

### The bridge

`components/effects/howrah-bridge.tsx`, over the geometry in `-geometry.ts`.

The drawing is modelled, not traced: a 457.2m main span between two towers 84.7m above
the deck, 99.06m anchor arms, a 171.5m suspended span on a parallel chord, a 21.6m
deck, and panel points where the real truss has them. The top chord is polygonal (one
straight member per panel) because that is what a steel truss is; a smooth curve is
the tell of a drawing that was eyeballed.

Nothing is pre-projected. The camera orbits while the reader scrolls: it starts square
on to the bridge and far off, a side elevation, then swings round and rises until it is
looking down the length of the deck. Each of the 17 camera keys carries the scale and
offset that frame the whole bridge at that moment, so the composition holds all the way
round instead of drifting off the edge. The structure inks in near to far ahead of the
reader, a paper plane rides the head of the near top chord, and the whole drawing fades
out over the last stage. That is 679 points re-projected per frame, which is why it can
be done honestly rather than baked.

To re-frame the shot, change the camera in the generator and re-run it; the geometry
file is output, not source.
- **Progressive blur** is `position: absolute` rather than `fixed`, because here it is
  scoped to the header and to the hero rather than pinned to the viewport. Blur radii
  and mask stops are unchanged. Inside the header it sits at the resource's
  `z-index: 40`, so the header's own row is one above it.
- **Shutter transition** is the one resource whose source could not be recovered: it
  is not published anywhere in the clear. It is built from the resource's own
  description: ten shutters, 0.5s, 0.3s stagger from the end, `power3.in` out and
  `expo.out` back, the outgoing page lifting 15vh and the incoming arriving from 20vh.
  Treat its values as good rather than certain.
- **The option wheel** is vendored verbatim apart from a `"use client"`
  directive. Its two React Compiler lint rules are disabled for that file only, with the
  reason in the header comment. Its `fade` and `blur` props are eased off the library
  defaults, which were tuned for a full-screen demo.

## Conventions

**Everything is in `em`.** `app/globals.css` carries the scaling system: the root
font size is derived from the viewport width, so the whole composition scales
proportionally instead of stepping at breakpoints. A `px` value will break that.
`--gutter` is the page margin and is wide enough on desktop to clear the fixed
progress rail down the left edge.

**Breakpoints are not Tailwind's defaults.** `--breakpoint-tablet: 992px` and
`--breakpoint-mobile: 768px` exist so `max-tablet:` and `max-mobile:` reproduce
`max-width: 991px` and `max-width: 767px`.

**GSAP targets `data-*` attributes, never Tailwind classes,** so restyling cannot
silently break an animation. Every timeline is scoped with `useGSAP` so it is reverted
on unmount and on route change.

**Page transitions are guarded.** If a cover animation never completes (a backgrounded
tab suspends `requestAnimationFrame`, so GSAP stops advancing) a 3s guard navigates
anyway, and a matching guard on the way out restores the page. Without them a stalled
timeline would leave the router flag set and swallow every later link click. The
shutter's page slide is skipped while the spiral is pinned: a transformed ancestor
becomes the containing block of every `position: fixed` descendant, which is how
ScrollTrigger pins.

**Nothing reveals under a cover.** `Reveal` waits for the intro (`useLoaded`) and for
the transition (`useTransition().isBusy`), so copy rises once it can be seen. The
page wrap is one isolated stacking context, so nothing on a page can paint over the
menu or a cover, whatever its own z-index. Lenis is paused while the intro panel or
the menu is up; `overflow: hidden` alone only stops the user's own scrolling.

**The intro plays on every load.** It is the site's front door; only
`prefers-reduced-motion` skips it.

**ScrollTrigger distances are pixels.** It has no `vh` unit: `"+=495vh"` is 495px.
The spiral resolves its pin length from `window.innerHeight` in a function, and
`invalidateOnRefresh` re-resolves it.

**Reduced motion is a real path, not a stub.** Every animated element's resting state
is also its finished state, so `prefers-reduced-motion` leaves the page complete rather
than half-built.

## Admin

A small content admin for the studio's staff lives in `app/cms`, with its data in
Neon Postgres and uploads on Vercel Blob. Every variable it reads is described in
`.env.example`.

- **Opening it.** The admin is served at `/<ADMIN_PATH>`, where `ADMIN_PATH` is a
  server-only environment variable. The repository is public, so the address is
  never written in code: `/cms` itself always returns the site's 404, and an unset
  `ADMIN_PATH` means there is no admin at all. Sign in at `/<ADMIN_PATH>/login`.
- **First run.** With `DATABASE_URL` in `.env.local` (`vercel env pull .env.local`):

  ```bash
  npm run db:migrate   # applies db/migrations/*.sql not yet applied
  npm run db:seed      # writes the shipped content for keys with no row; never overwrites
  npm run admin:create -- --email you@example.com --name "Your Name"
  ```

  `admin:create` prompts for the password (hidden), or reads it from stdin or
  `ADMIN_PASSWORD`; it never takes one as an argument. Add `--reset` to set a new
  password on an existing account. Everyone after the first is added from the
  admin's Maintainers page with a temporary password.
- **Migrations** are plain SQL files in `db/migrations`, applied in name order and
  recorded in `schema_migrations`. Add a new numbered file; never edit an applied one.
- **Checks.** `npm run cms:check` proves every shipped default passes its schema
  (`lib/cms/schema.ts`) unchanged; run it after changing anything in `lib/content.ts`,
  `lib/reels.ts` or `lib/gallery.ts`. `npm run cms:check-auth` checks password
  hashing, the session cookie and `ADMIN_PATH` validation.
- **Without a database** the site builds and runs on the shipped content, and the
  admin's sign-in page says it is not connected.

## What still needs doing

- **The reel frames are placeholders**, the four architecture photographs already in
  `public/img`, cycled. Each ride names its own `frame` in `lib/content.ts`, so
  swapping in real stills is one line per ride and no component change.
- **The social profiles have no URLs yet**, so they render as plain text (in the
  footer and on `/contact`) rather than links that go nowhere. Put the real URLs in
  `SITE` in `lib/content.ts` and add them to the `href` column in
  `components/sections/contact-form.tsx` and the footer's column to turn them into
  links.
- **The paper plane and the grain crawl are worth a look on a real screen**: both are
  driven by `requestAnimationFrame`/CSS animation, which a backgrounded tab suspends,
  so they cannot be verified from screenshots of an inactive tab.
- **`components/naman-header.tsx`** is left over from the previous project in this repo.
  Nothing imports it. Delete it when you're sure it isn't wanted.
- **Fonts.** PP Neue Montreal is served from `app/fonts/`; check its licence with
  Pangram Pangram before shipping publicly. Geist Mono comes from `next/font/google`.
- **Check the third-party licences** before this ships commercially. The option wheel
  in `components/effects/option-wheel.tsx` is vendored under **MIT with the Commons
  Clause**, not plain MIT: its copyright notice has to stay in that file, and the
  component may be used inside a product but not resold or redistributed as a
  component. Confirm that fits what the client intends to do with this code.
