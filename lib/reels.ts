/**
 * The client's video, cut down for the web.
 *
 * Generated from their "website content" drive. The sources are 4K vertical
 * phone footage (15 to 90 seconds, 6 to 775MB each), which is why nothing
 * here is the original: each clip is scaled to a 1280px long edge, its audio
 * carried at 96k, and given a poster cut from its own first second. Every
 * clip runs its full length. The first pull capped them at twelve seconds to
 * keep the folder small, and the client noticed the cut.
 *
 * Grouped by the folder they arrived in, which is also the slot they fill.
 * Several of these exist only because the photography could not honestly cover
 * that slot: there is no product photography anywhere in the drive, and no
 * shop floor for the fashion client.
 */

import { media } from "./media";

export type Reel = {
  src: string;
  poster: string;
  /** What the clip shows, for anyone who cannot watch it. */
  alt: string;
  /** Intrinsic size of the transcoded file. */
  w: number;
  h: number;
};

/**
 * The client's own categories, given category by category with the cover clip
 * named by filename. The key is the work slug, so a piece and its footage
 * cannot drift apart.
 *
 * A key is absent when the category is photography rather than video, which
 * the callers read as "no clips here" and fall back to the shoot.
 */
export type ReelKey =
  | "clothing"
  | "cafe"
  | "fitness"
  | "hotel-and-resort"
  | "co-living-space"
  | "product-spotlight"
  | "store-video"
  | "wedding-content"
  | "interior"
  | "personal-branding";

/**
 * Cover first in every list. The client named the cover for each category by
 * filename, and the pages take the head of the list, so the order here is the
 * instruction rather than a preference.
 */
export const REELS: Partial<Record<ReelKey, Reel[]>> = {
  clothing: [
    // Cover: 1006 (1)(1).mov
    { src: media("/video/reels/clothing-05.mp4"), poster: media("/video/posters/clothing-05.jpg"), w: 720, h: 1280, alt: "Smiling woman in an embroidered orange kurta stands by a brass gong and carved wooden screen" },
    { src: media("/video/reels/clothing-03.mp4"), poster: media("/video/posters/clothing-03.jpg"), w: 720, h: 1280, alt: "Woman in a blush floral anarkali turns beside a carved wooden screen hung with marigold garlands" },
    { src: media("/video/reels/clothing-02.mp4"), poster: media("/video/posters/clothing-02.jpg"), w: 720, h: 1280, alt: "Model in a bright multicoloured printed kurta and dupatta poses with a makeup brush by marigold strands" },
    { src: media("/video/reels/clothing-01.mp4"), poster: media("/video/posters/clothing-01.jpg"), w: 720, h: 1280, alt: "Woman in a cream kurta holds up two festive ethnic outfits on hangers beside marigold garlands" },
    { src: media("/video/reels/clothing-04.mp4"), poster: media("/video/posters/clothing-04.jpg"), w: 720, h: 1280, alt: "Two women in matching teal and pink bandhani kurta sets walk hand in hand past a gold-flecked wall" },
    { src: media("/video/reels/clothing-06.mp4"), poster: media("/video/posters/clothing-06.jpg"), w: 720, h: 1280, alt: "Out-of-focus film clapperboard fills the frame; behind it a clothing rack and a woman seated on a rug" },
  ],

  cafe: [
    // Cover: copy_353A2058. A beachfront terrace rather than a coffee shop,
    // which is what the client filed under cafe and what they named.
    { src: media("/video/reels/cat-cafe-03.mp4"), poster: media("/video/posters/cat-cafe-03.jpg"), w: 720, h: 1280, alt: "Drone view of a blue and white beachfront terrace restaurant above the sea, captioned This is not Greece" },
    { src: media("/video/reels/cat-cafe-01.mp4"), poster: media("/video/posters/cat-cafe-01.jpg"), w: 720, h: 1280, alt: "Three women walk out of a stone doorway under a shell-crusted wall at Scrapyard, captioned a brunch date" },
    { src: media("/video/reels/cat-cafe-02.mp4"), poster: media("/video/posters/cat-cafe-02.jpg"), w: 720, h: 1280, alt: "Woman in a red top at a bar counter, backlit spirit shelves and glass pendant lamps behind her" },
  ],

  fitness: [
    { src: media("/video/reels/cat-fitness-01.mp4"), poster: media("/video/posters/cat-fitness-01.jpg"), w: 720, h: 1280, alt: "Athlete in a pink crop top points across a floodlit indoor turf arena beside a large orange cooling fan" },
  ],

  "hotel-and-resort": [
    // Cover: 442B0420.
    { src: media("/video/reels/cat-hotel-01.mp4"), poster: media("/video/posters/cat-hotel-01.jpg"), w: 720, h: 1280, alt: "Drone view of a single safari tent on a green creek island by the sea, marked The Alampara" },
    { src: media("/video/reels/cat-hotel-03.mp4"), poster: media("/video/posters/cat-hotel-03.jpg"), w: 720, h: 1280, alt: "Drone view of surf breaking over black rocks onto an orange sand beach lined with resort roofs" },
    { src: media("/video/reels/cat-hotel-02.mp4"), poster: media("/video/posters/cat-hotel-02.jpg"), w: 720, h: 1280, alt: "Drone shot of low cloud drifting over a forested river valley at sunrise, a village on the far bank" },
    { src: media("/video/reels/cat-hotel-04.mp4"), poster: media("/video/posters/cat-hotel-04.jpg"), w: 720, h: 1280, alt: "Man stands in the doorway of a thatched resort cottage beside a hanging chair, titled Perfect Monsoon" },
  ],

  interior: [
    // Cover: 1748470192562896 copy.MP4
    { src: media("/video/reels/cat-interior-02.mp4"), poster: media("/video/posters/cat-interior-02.jpg"), w: 720, h: 1280, alt: "Couple in festive dress open a carved cream door onto a hall with a backlit prayer inscribed on the wall" },
    { src: media("/video/reels/cat-interior-03.mp4"), poster: media("/video/posters/cat-interior-03.jpg"), w: 720, h: 1280, alt: "Bedroom with a grey upholstered bed below a backlit plaster relief of dandelion heads" },
    { src: media("/video/reels/cat-interior-01.mp4"), poster: media("/video/posters/cat-interior-01.jpg"), w: 720, h: 1280, alt: "Fluted entrance door standing open under a beaded toran, a gold sunburst motif on the wall beyond" },
  ],

  "wedding-content": [
    // A spread across all seven folders the client filed the wedding footage
    // under: the ceremony, the families, the party and the cutaways, rather
    // than seven versions of the same shot.
    { src: media("/video/reels/wed-couple-04.mp4"), poster: media("/video/posters/wed-couple-04.jpg"), w: 720, h: 1280, alt: "Bride and groom in cream and rose garlands laugh through smoke at night, titled The Moment We Have Been Waiting For" },
    { src: media("/video/reels/wed-couple-01.mp4"), poster: media("/video/posters/wed-couple-01.jpg"), w: 720, h: 1280, alt: "Bride in red and groom in ivory stand before a mirrored backdrop under chandeliers as a photographer crouches to shoot" },
    { src: media("/video/reels/wed-couple-03.mp4"), poster: media("/video/posters/wed-couple-03.jpg"), w: 720, h: 1280, alt: "Couple hold an aarti plate beneath a mandap hung with strands of jasmine and red roses" },
    { src: media("/video/reels/wed-event-01.mp4"), poster: media("/video/posters/wed-event-01.jpg"), w: 720, h: 1280, alt: "Groom and veiled bride on a lit stage under a lighting truss beside a red floral arch at night" },
    { src: media("/video/reels/wed-emotional-02.mp4"), poster: media("/video/posters/wed-emotional-02.jpg"), w: 720, h: 1280, alt: "Bride in a blush lehenga faces an older woman in a magenta banarasi who reaches out to touch her face" },
    { src: media("/video/reels/wed-funcousins-01.mp4"), poster: media("/video/posters/wed-funcousins-01.jpg"), w: 720, h: 1280, alt: "Five men in yellow kurtas crowd the lens pulling faces on a waterside deck at a haldi" },
    { src: media("/video/reels/wed-transition-02.mp4"), poster: media("/video/posters/wed-transition-02.jpg"), w: 720, h: 1280, alt: "Overhead shot of a dozen bangled hands reaching into a ring around a brass thali" },
    { src: media("/video/reels/wed-storytelling-01.mp4"), poster: media("/video/posters/wed-storytelling-01.jpg"), w: 720, h: 1280, alt: "Woman in an embroidered pastel outfit speaks to camera in a garden strung with fairy lights at night" },
    { src: media("/video/reels/wed-transition-01.mp4"), poster: media("/video/posters/wed-transition-01.jpg"), w: 720, h: 1280, alt: "Man kisses a laughing woman in a gold sequinned gown under a canopy of disco balls and foliage" },
    { src: media("/video/reels/wed-afterparty-02.mp4"), poster: media("/video/posters/wed-afterparty-02.jpg"), w: 720, h: 1280, alt: "Couple dance beside a lit dartboard in a games room, captioned an after party" },
    { src: media("/video/reels/wed-emotional-03.mp4"), poster: media("/video/posters/wed-emotional-03.jpg"), w: 720, h: 1280, alt: "Man in a printed sherwani throws his arms wide on a confetti-covered stage under red lights" },
    { src: media("/video/reels/wed-funcousins-02.mp4"), poster: media("/video/posters/wed-funcousins-02.jpg"), w: 720, h: 1280, alt: "Groom-to-be in cream dances while six relatives tug him back towards a flower-framed neon sign" },
    { src: media("/video/reels/wed-storytelling-02.mp4"), poster: media("/video/posters/wed-storytelling-02.jpg"), w: 720, h: 1280, alt: "Woman in a magenta lehenga makes a heart with her mehendi hands on a terrace above the sea" },
    // The third storytelling clip (IMG_2326), asked for by name: an 85 second edit.
    { src: media("/video/reels/wed-storytelling-03.mp4"), poster: media("/video/posters/wed-storytelling-03.jpg"), w: 720, h: 1280, alt: "Couple in yellow and green embrace beside a pool under white umbrellas, captioned POV: this is what winning at love looks like" },
    { src: media("/video/reels/wed-emotional-01.mp4"), poster: media("/video/posters/wed-emotional-01.jpg"), w: 720, h: 1280, alt: "Man in a mustard kurta and sunglasses speaks to camera beside sunflowers, titled One Person Many Emotions" },
    { src: media("/video/reels/wed-couple-02.mp4"), poster: media("/video/posters/wed-couple-02.jpg"), w: 720, h: 1280, alt: "Engaged couple hold out their palms beside a wall of magenta roses as nicknames appear above their hands" },
    { src: media("/video/reels/wed-funcousins-03.mp4"), poster: media("/video/posters/wed-funcousins-03.jpg"), w: 720, h: 1280, alt: "Friends kneel in a ring around a seated man, hands outstretched, in a wood-panelled hotel room" },
    { src: media("/video/reels/wed-event-03.mp4"), poster: media("/video/posters/wed-event-03.jpg"), w: 720, h: 1280, alt: "Couple in matching navy outfits dance away from a lit dartboard, their initials printed across the backs" },
    { src: media("/video/reels/wed-afterparty-01.mp4"), poster: media("/video/posters/wed-afterparty-01.jpg"), w: 720, h: 1280, alt: "Guests in white dance on a dark floor under coloured lights at a late-night reception" },
    { src: media("/video/reels/wed-transition-03.mp4"), poster: media("/video/posters/wed-transition-03.jpg"), w: 720, h: 1280, alt: "Man in grey loungewear stands centre frame with four friends ranged behind him in a hotel room" },
    { src: media("/video/reels/wed-event-02.mp4"), poster: media("/video/posters/wed-event-02.jpg"), w: 720, h: 1280, alt: "Woman in a khaki bomber jacket pulls a stricken face against a marble wall, captioned Sad" },
  ],

  "co-living-space": [
    // Cover: koliving 2.MP4. The client's Koliving work, shot around the
    // college its residents study at rather than inside the building.
    { src: media("/video/reels/pgbrand-03.mp4"), poster: media("/video/posters/pgbrand-03.jpg"), w: 720, h: 1280, alt: "Man walks toward camera on a leafy college footpath, with a yellow caption reading St. Xaviers College" },
    { src: media("/video/reels/pgbrand-02.mp4"), poster: media("/video/posters/pgbrand-02.jpg"), w: 720, h: 1280, alt: "Man in a black shirt stands at the yellow gate of St. Xavier's College, the college name set over the frame" },
    { src: media("/video/reels/pgbrand-01.mp4"), poster: media("/video/posters/pgbrand-01.jpg"), w: 720, h: 1280, alt: "Yellow Kolkata taxi rolling up a leafy lane as a woman with a suitcase flags it down from the kerb" },
    // The client asked for this one here rather than under a viral branding
    // heading of its own.
    { src: media("/video/reels/viral-01.mp4"), poster: media("/video/posters/viral-01.jpg"), w: 720, h: 1280, alt: "Seven people lined up against a white wall below a bold yellow \"Introducing\" caption in a vertical reel" },
  ],

  "product-spotlight": [
    // Cover: copy_02D7D94A. The client merged their suitcase and product
    // folders into this one category.
    // Poster cut at 9.2s, past the rack-focus opener: the first three seconds
    // of this clip are deliberately out of focus and a still from them read as
    // an image that had failed to load.
    { src: media("/video/reels/product-01.mp4"), poster: media("/video/posters/product-01.jpg"), w: 720, h: 1280, alt: "Model in a beige coat and jeans sits on an olive hardshell suitcase in a white studio, captioned Strong" },
    { src: media("/video/reels/suitcase-01.mp4"), poster: media("/video/posters/suitcase-01.jpg"), w: 720, h: 1280, alt: "Model in a cream trench coat sits on an olive hardshell suitcase in a white studio, a second case beside her" },
    { src: media("/video/reels/product-03.mp4"), poster: media("/video/posters/product-03.jpg"), w: 720, h: 1280, alt: "A smiling woman rests her hand on a dark trolley suitcase on a street below a red sandstone fort" },
    { src: media("/video/reels/suitcase-02.mp4"), poster: media("/video/posters/suitcase-02.jpg"), w: 720, h: 1280, alt: "Close-up of a hand gripping the black telescoping handle of a rolling suitcase, tiled floor blurred behind" },
    { src: media("/video/reels/product-02.mp4"), poster: media("/video/posters/product-02.jpg"), w: 720, h: 1280, alt: "A young man in a black ZENSU polo talks to camera, hands open, behind a wooden table by a cream wall" },
  ],

  "store-video": [
    // Cover: 0910(1).MOV
    { src: media("/video/reels/store-01.mp4"), poster: media("/video/posters/store-01.jpg"), w: 720, h: 1280, alt: "Woman in a pale pink kurta set posing on a sunlit pavement outside the Fashor clothing store" },
    { src: media("/video/reels/store-02.mp4"), poster: media("/video/posters/store-02.jpg"), w: 720, h: 1280, alt: "Man walks past Hedonne's lit glass storefront under leafy branches; overlaid title reads a girl's day at Hedonne" },
    { src: media("/video/reels/store-03.mp4"), poster: media("/video/posters/store-03.jpg"), w: 720, h: 1280, alt: "Two women browse a backlit liquor store wall stacked with vodka and tequila bottles beneath an Absolut sign" },
  ],

  "personal-branding": [
    // Cover: final_2.mp4, plus copy_2F5FE4BD which the client asked for here
    // by name. That second file is also the ninth card of the home showreel,
    // so it is the same transcode rather than a second copy of the footage.
    { src: media("/video/reels/personal-04.mp4"), poster: media("/video/posters/personal-04.jpg"), w: 720, h: 1280, alt: "Bearded man in a checked blazer and green glasses at a wooden office desk, framed certificates behind" },
    { src: media("/video/reels/home-03.mp4"), poster: media("/video/posters/home-03.jpg"), w: 720, h: 1280, alt: "Man in a white shirt speaks to camera at a desk against warm wood panelling, captioned Har Brand" },
    { src: media("/video/reels/personal-02.mp4"), poster: media("/video/posters/personal-02.jpg"), w: 720, h: 1280, alt: "Man in a coral polo reaches for a book on a lit yellow shelf; trophies above, channel logo top-left" },
    { src: media("/video/reels/personal-01.mp4"), poster: media("/video/posters/personal-01.jpg"), w: 720, h: 1280, alt: "Man in a coral polo gestures mid-sentence at his desk, exposed brick behind him, laptop open beside him" },
  ],
};

/**
 * The showreel that turns in the home page hero.
 *
 * The client's own "home screen" folder: a spread of what they do rather than a
 * set of finished pieces. The order and the titles are theirs, given file by
 * file, so both are recorded here exactly as sent rather than derived from the
 * footage or from the filenames, which are camera exports and carry no meaning.
 *
 * Seven of the nine titles are also work items in the brief; "Raw takes" and
 * "Gen-Z fashion" are not, and are the client's own additions.
 *
 * The posters here are not frames of the footage. The client designed a cover
 * for each card, with the title set into the artwork, so `poster` points at
 * those (`/img/covers`, 720x1280 from their 1080x1920 originals) and `alt`
 * describes the cover rather than the clip's first second. The frame-cut
 * posters stay in `/video/posters`, where the personal-branding reel above
 * still uses the one for home-03.
 *
 * Four of the nine clips are the same transcode as a category reel above,
 * byte for byte, because the client filed the same footage in both folders.
 * Those cards point at the category's file (store-01, product-01,
 * personal-04, pgbrand-03) rather than at a second copy of it, so a visitor
 * who has watched one has the other in cache.
 */
export type ShowreelClip = Reel & {
  /** The client's name for the piece, along the foot of the card. */
  title: string;
};

export const SHOWREEL: ShowreelClip[] = [
  {
    src: media("/video/reels/home-04.mp4"),
    poster: media("/img/covers/home-04.jpg"),
    w: 720,
    h: 1280,
    title: "Beyond the feed",
    alt: "Man in a rust shirt with a lapel mic holds up a palm under a big STOP graphic on yellow, cartoon faces crowding behind him.",
  },
  {
    src: media("/video/reels/home-06.mp4"),
    poster: media("/img/covers/home-06.jpg"),
    w: 720,
    h: 1280,
    title: "Product talking head",
    alt: "Man in a teal patterned shirt carries a wooden plank over his shoulder against a yellow backdrop, wood samples and a plant beside him.",
  },
  {
    src: media("/video/reels/home-08.mp4"),
    poster: media("/img/covers/home-08.jpg"),
    w: 720,
    h: 1280,
    title: "Raw takes",
    alt: "Aerial view of a cricket stadium at golden hour, a red cricket ball bursting through cracked glass over the IPL logo on the outfield.",
  },
  {
    src: media("/video/reels/pgbrand-03.mp4"),
    poster: media("/img/covers/home-09.jpg"),
    w: 720,
    h: 1280,
    title: "Viral branding",
    alt: "Man in a maroon shirt strides down a sunlit corridor of yellow doors and potted plants, arms spread wide.",
  },
  {
    src: media("/video/reels/home-05.mp4"),
    poster: media("/img/covers/home-05.jpg"),
    w: 720,
    h: 1280,
    title: "Gen-Z fashion",
    alt: "Two women in black embroidered kurtas pose against a cream backdrop as a yellow drape sweeps behind them.",
  },
  {
    src: media("/video/reels/personal-04.mp4"),
    poster: media("/img/covers/home-07.jpg"),
    w: 720,
    h: 1280,
    title: "Personal branding",
    alt: "Bearded man in green glasses and a check blazer sits at an executive desk, a globe and brass scales of justice on the shelves behind.",
  },
  {
    src: media("/video/reels/product-01.mp4"),
    poster: media("/img/covers/home-02.jpg"),
    w: 720,
    h: 1280,
    title: "Product spotlight",
    alt: "Model in a beige coat and jeans sits on an olive hardshell suitcase on a yellow backdrop, a smaller case in front.",
  },
  {
    src: media("/video/reels/store-01.mp4"),
    poster: media("/img/covers/home-01.jpg"),
    w: 720,
    h: 1280,
    title: "Store stories",
    alt: "Woman in a pale pink kurta lies across a spread of green Fashor Luxe shopping bags.",
  },
  {
    src: media("/video/reels/home-03.mp4"),
    poster: media("/img/covers/home-03.jpg"),
    w: 720,
    h: 1280,
    title: "Founder story",
    alt: "Man in a white shirt stands with arms crossed on a factory floor, a yellow mark behind him.",
  },
];
