/**
 * Every word on the site.
 *
 * The copy is the client’s, taken from `social yatri.docx`. Their headings are
 * set in caps in that file; here they carry normal case and the display styles
 * do the shouting, which is the only liberty taken with the wording. Obvious
 * typos in the source (“bran”, “calender”, “roght”, “imposibble”) are corrected
 * and nothing else is reworded.
 *
 * Where a heading is written as two lines in the source, the break is preserved
 * as a separate array entry so the reveal animations can mask each line
 * independently.
 */

import type { ShootKey } from "./gallery";
import { media } from "./media";
import { REELS, type Reel, type ReelKey } from "./reels";

export const SITE = {
  name: "Social Yatri",
  /**
   * The client's own line, in their words and their transliteration. Left in
   * Hindi on purpose: translating it would cost the rhyme, which is the whole
   * reason it works. Carried with `lang="hi-Latn"` wherever it is shown, so a
   * screen reader does not read it as mangled English.
   */
  tagline: "Kyunki, Joh dikhta hai wahi toh bikta hai",
  description:
    "We combine strategy, creativity, content, branding, technology, and performance marketing to help businesses build a strong digital presence and grow online.",
  city: "Kolkata, West Bengal, India",
  email: "thesocialyatri@gmail.com",
  /*
   * Given as ten digits; the +91 is inferred from the Kolkata address, and the
   * href carries it because a bare local number does not dial from abroad.
   */
  phone: "+91 97073 44375",
  phoneHref: "tel:+919707344375",
  address: "91/6, Beltala Road, Bhawanipur, Kolkata 700026",
  /*
   * The handle alone, without the @ and without the URL: the profile address is
   * built from it below, so the footer and the contact page both link the
   * moment one of these is filled in.
   *
   * Note the spelling. The handle is "yaatri" with two a's and the email is
   * "yatri" with one; both are as the client gave them, and they are not a
   * typo introduced here.
   *
   * LinkedIn is still unconfirmed and is the last placeholder on the site. It
   * is held back rather than guessed: a wrong handle sends people to somebody
   * else's page, which is worse than an absent row.
   */
  instagram: "social.yatri",
  linkedin: "",
  madeIn: "Born in Kolkata. Built for the internet.",
  copyright: "© 2026 Social Yatri",
} as const;

/**
 * The direct contact list, in one place because the footer and the contact
 * page show the same rows and a second copy would eventually disagree with the
 * first.
 *
 * Every row that can be actioned carries an `href`: the phone dials, the email
 * opens a draft, the address opens the map, and the two profiles open the
 * profile. A row with an empty value is not shown at all rather than printed
 * as dead text, so nothing on the page looks like a link that does nothing.
 */
export const DIRECT: { label: string; value: string; href: string | null }[] = [
  { label: "Instagram", value: SITE.instagram, href: SITE.instagram ? `https://instagram.com/${SITE.instagram}` : null },
  { label: "LinkedIn", value: SITE.linkedin, href: SITE.linkedin ? `https://www.linkedin.com/company/${SITE.linkedin}` : null },
  { label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  { label: "Phone", value: SITE.phone, href: SITE.phoneHref },
  {
    label: "Address",
    value: SITE.address,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.address}, India`)}`,
  },
].filter((entry) => entry.value !== "");

export const NAV = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Work", href: "/work" },
  /*
   * The client asked for this one by name. /work is the video categories, so
   * the stills would otherwise only exist as a strip at the foot of that page,
   * which is not where you put a service you sell.
   */
  { label: "Photoshoot", href: "/photoshoot" },
  { label: "Studio", href: "/studio" },
  { label: "Connect", href: "/contact" },
] as const;

export const HERO = {
  /* Every line here is the client's, from the studio and services sections. */
  eyebrow: "Strategy · Content · Branding · Performance",
  headline: ["We turn brands into", "stories people remember."],
  lede: ["We make brands", "impossible to ignore."],
} as const;

export const ABOUT = {
  sign: "Studio",
  claim: "We turn brands into stories people remember.",
  body: [
    "At Social Yatri, we don’t believe marketing is just about posting content or running ads. We combine strategy, creativity, content, branding, technology, and performance marketing to help businesses build a strong digital presence and grow online.",
    "Because getting views is great. Getting followers is great. But building a brand that people remember and a marketing system that generates business is what really matters.",
  ],
  /* The turn in the client's own argument, set as the closing statement. */
  close: ["We connect", "the dots."],
} as const;

/* ---------------------------------------------------------------------------
 * Services
 * ------------------------------------------------------------------------- */

export type Service = {
  no: string;
  name: string;
  /** The client’s one-line promise for the stop. */
  desc: string;
  /** The site’s own shelf label, not the client’s. */
  tag: string;
  /** The paragraphs under the promise. */
  body: string[];
  /** What the stop covers: the client’s own list where they gave one. */
  detail: string[];
  /** The client only wrote a goal line for the first service. */
  goal?: string;
  /**
   * The client's designed cover for the stop, 16:10 with the line set into
   * the artwork. Shown on /services and surfaced on hover in the home index.
   */
  cover: Photo;
};

export const SERVICES: Service[] = [
  {
    no: "01",
    name: "Social Media Management",
    cover: { src: media("/img/services/social-media-management.jpg"), alt: "Man in sunglasses and a pinstripe suit points at the camera from behind a laptop, social media icons around him, captioned Your social media, handled strategically" },
    desc: "Your social media, handled strategically.",
    tag: "Ongoing",
    body: [
      "Your social media profile is often the first place potential customers discover your brand. We manage your social presence with a clear strategy instead of simply filling up your feed.",
      "From content planning and posting to community management and performance tracking, we take care of your social media while keeping your brand consistent and relevant.",
    ],
    detail: [
      "Social media strategy",
      "Monthly content calendars",
      "Instagram & Facebook management",
      "Creative posts & reels",
      "Captions and hashtags",
      "Community management",
      "Content scheduling",
      "Monthly performance reports",
    ],
    goal: "Build a consistent social presence that keeps your audience engaged and your brand top-of-mind.",
  },
  {
    no: "02",
    name: "Social Media Marketing",
    cover: { src: media("/img/services/social-media-marketing.jpg"), alt: "Curly-haired man in a red check shirt smiles at a laptop beside a yellow mug, captioned Your social media, handled strategically" },
    desc: "Get seen by the right people.",
    tag: "Growth",
    body: [
      "Social media is crowded. Standing out requires more than good-looking posts.",
      "Our social media marketing services combine creative content, audience research, platform strategy, and campaigns designed to increase your brand awareness, engagement, enquiries, and growth.",
    ],
    detail: [
      "We create marketing strategies specifically around your business, audience, industry, and goals.",
      "From organic growth to paid campaigns, we help turn social media attention into meaningful business opportunities.",
    ],
  },
  {
    no: "03",
    name: "Content Creation",
    cover: { src: media("/img/services/content-creation.jpg"), alt: "Black and white figure at a ship's wheel in smoke, captioned Create content" },
    desc: "Scroll-stopping content. Built for your brand.",
    tag: "Production",
    body: [
      "Content is at the heart of modern digital marketing.",
      "We create reels, videos, static creatives, carousels, product content, campaign creatives, and branded visual content that are designed to grab attention and communicate your message quickly.",
      "Our creative process combines storytelling, trends, visual design, and brand identity to create content that doesn’t just look good. It has a purpose.",
    ],
    detail: [
      "Instagram Reels",
      "Social media posts",
      "Carousels",
      "Product videos",
      "Brand videos",
      "Campaign creatives",
      "Promotional content",
      "Short-form videos",
    ],
  },
  {
    no: "04",
    name: "Content Strategy",
    cover: { src: media("/img/services/content-strategy.jpg"), alt: "Man pulling a baffled face at a laptop, captioned Scroll-stopping content, built for your brand" },
    desc: "Don’t just create content. Create content with a reason.",
    tag: "Foundation",
    body: [
      "Posting consistently is easy. Knowing what to post, why to post it, and how it supports your business goals is where strategy comes in.",
      "Our content strategy connects your brand goals with what your audience actually wants to watch, read, and share.",
    ],
    detail: [
      "We identify content pillars, audience interests, formats, trends, storytelling opportunities, and campaign ideas to create a structured content roadmap.",
      "Strategy first. Content second. Growth follows.",
    ],
  },
  {
    no: "05",
    name: "UGC Videos",
    cover: { src: media("/img/services/ugc-video.jpg"), alt: "Woman in white being filmed on a phone rig, captioned Make your brand feel real" },
    desc: "Make your brand feel real.",
    tag: "Production",
    body: [
      "People trust people.",
      "Our UGC video content is designed to make your products and services feel authentic, relatable, and native to social media.",
    ],
    detail: [
      "From product reviews and testimonials to unboxings, demonstrations, talking-head videos, and lifestyle content, we create UGC-style videos that help brands connect with audiences on a more personal level.",
      "Perfect for Instagram, Facebook, YouTube Shorts, and paid advertising campaigns.",
    ],
  },
  {
    no: "06",
    name: "Branding",
    cover: { src: media("/img/services/branding.jpg"), alt: "Man painted red with garlands beside a coffee cup labelled Brand, captioned Build a brand people recognize" },
    desc: "Build a brand people recognize.",
    tag: "Design",
    body: [
      "Your brand is more than a logo.",
      "We help businesses build a strong and consistent brand identity across digital and offline touchpoints.",
      "From visual identity to brand communication, we create branding systems that make your business look professional, memorable, and recognizable.",
    ],
    detail: [
      "Brand identity",
      "Logo design",
      "Brand colour systems",
      "Typography",
      "Visual direction",
      "Brand guidelines",
      "Creative communication",
      "Social media branding",
    ],
  },
  {
    no: "07",
    name: "Personal Branding",
    cover: { src: media("/img/services/personal-branding.jpg"), alt: "White-bearded man in a black waistcoat points at the camera from a desk, captioned Turn your expertise into influence" },
    desc: "Turn your expertise into influence.",
    tag: "1:1",
    body: [
      "People connect with people before they connect with businesses.",
      "Our personal branding services help founders, entrepreneurs, professionals, consultants, and creators establish a strong online identity and become recognizable voices in their industries.",
    ],
    detail: [
      "We help you define your positioning, develop content pillars, create content, and build a consistent presence across social platforms.",
      "Your expertise is valuable. We help the internet see it.",
    ],
  },
  {
    no: "08",
    name: "Ad Films & Product Shoots",
    cover: { src: media("/img/services/ad-product-shoots.jpg"), alt: "Man in a suit holding a monkey beside a penguin, a camera on him, captioned Make your product impossible to ignore" },
    desc: "Make your product impossible to ignore.",
    tag: "Production",
    body: [
      "Your product deserves more than a basic photograph.",
      "We create professional product shoots, advertising films, promotional videos, and campaign content designed to showcase your product through strong visuals and storytelling.",
    ],
    detail: [
      "From concept development and scripting to production and post-production, we create visual content that can be used across your website, social media, advertisements, and marketing campaigns.",
      "Shoot it. Tell the story. Make people want it.",
    ],
  },
  {
    no: "09",
    name: "Website Development",
    cover: { src: media("/img/services/website-development.jpg"), alt: "Man in a black suit at a laptop, captioned Your website should work as hard as your brand" },
    desc: "Your website should work as hard as your brand.",
    tag: "Build",
    body: [
      "Your website is more than an online brochure. It should communicate your value, build trust, create a great user experience, and turn visitors into customers.",
      "We develop modern, responsive, user-friendly websites that combine design, functionality, content, SEO fundamentals, and conversion-focused thinking.",
    ],
    detail: [
      "Business websites",
      "Landing pages",
      "Portfolio websites",
      "Responsive design",
      "UI/UX",
      "SEO-friendly structure",
      "Conversion-focused layouts",
      "Website content integration",
    ],
  },
  {
    no: "10",
    name: "Performance Marketing",
    cover: { src: media("/img/services/performance-marketing.jpg"), alt: "Two men at a laptop with a rising bar chart, captioned Spend smarter, grow faster" },
    desc: "Spend smarter. Grow faster.",
    tag: "Paid",
    body: [
      "Great creative gets attention. Great performance marketing turns that attention into measurable results.",
      "Our performance marketing services use paid advertising, audience targeting, creative testing, campaign optimisation, and data analysis to help businesses generate leads, sales, enquiries, and conversions.",
      "We continuously analyse campaign performance and optimise what matters, helping you make better use of your advertising budget.",
    ],
    detail: [
      "Meta Ads",
      "Google Ads",
      "Lead generation campaigns",
      "Conversion campaigns",
      "Retargeting",
      "Audience targeting",
      "Creative testing",
      "Campaign optimisation",
      "Performance reporting",
    ],
  },
];

/**
 * The anchor a service's section carries on /services, and the home page
 * links to. Built from the name so the two can never disagree.
 */
export function serviceId(service: { name: string }) {
  return service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const SERVICES_INTRO = {
  sign: "Services",
  question: "What do we actually do?",
  sub: "We turn brands into stories people remember.",
  body: [
    "At Social Yatri, we don’t believe marketing is just about posting content or running ads. We combine strategy, creativity, content, branding, technology, and performance marketing to help businesses build a strong digital presence and grow online.",
    "From your first Instagram post to your next big campaign, we help you look better, communicate better, reach the right audience, and convert attention into business.",
    "Whether you’re a startup, local business, growing brand, or established company, our services are designed to create meaningful digital growth.",
  ],
} as const;

/** The client’s closing argument on the services page. */
export const WHY = {
  sign: "Why us",
  question: [
    "We don’t just manage your marketing.",
    "We become part of your growth journey.",
  ],
  list: [
    "There are agencies that create content.",
    "There are agencies that run ads.",
    "There are agencies that build websites.",
  ],
  turn: "We connect the dots.",
  body: [
    "At Social Yatri, our approach brings together content + strategy + branding + technology + performance so every part of your digital presence works together.",
    "Because getting views is great. Getting followers is great. But building a brand that people remember and a marketing system that generates business is what really matters.",
  ],
  ask: "Ready to take your brand further?",
  close: "Let’s build something people can’t scroll past.",
} as const;

/* ---------------------------------------------------------------------------
 * Work
 * ------------------------------------------------------------------------- */

export type Photo = { src: string; alt: string; focus?: string };

type WorkBase = {
  slug: string;
  /** The client's own name for the category. */
  title: string;
  /**
   * The shoot this category has photography for, keyed into `lib/gallery.ts`.
   * Only four of them do: the rest of the drive is video, which is how the
   * client works.
   */
  shoot?: ShootKey;
};

/**
 * A category of work.
 *
 * These are the client's own ten, given by name with the cover clip named by
 * filename for each. They replace an earlier set of nine invented pieces: the
 * drive is filed by category, the brief is written by category, and a piece
 * that exists only on this site is a piece nobody can be shown.
 *
 * The two halves of the type are exclusive on purpose. A category is either
 * video-led, in which case its clip is the head of its reel list, or it is
 * photography, in which case it names a still. There is no third case, and
 * nothing here can end up with neither. The designed cover sits across both:
 * it is what the wall shows when there is one, and the clip's poster or the
 * still is what the wall falls back to when there is not.
 */
export type Work = WorkBase & {
  /**
   * The client's designed cover for the wall, where they sent one. Nine of
   * the ten have one, 4:5 or 3:4 as they arrived, and it carries its own size
   * so a card can take the cover's shape instead of cropping it to a preset
   * one. Cafe has none and shows the poster of its cover clip.
   */
  cover?: Photo & { w: number; h: number };
} & ({ reels: ReelKey; frame?: Photo } | { reels?: undefined; frame: Photo });

/**
 * What the wall shows for a piece: the cover still, plus the clip behind it
 * where there is one, so a card can play on hover.
 *
 * Derived rather than stored. The still is the client's designed cover when
 * they sent one and otherwise the poster of the head of the category's reel
 * list; either way that head clip rides along for the hover, so naming a
 * different clip means reordering the list and nothing else.
 *
 * `w` and `h` come back only with a designed cover, and they mean the still
 * has a shape of its own for the card to take. A poster is a frame of a 9:16
 * clip and carries none, so the card keeps the wall's default shape and crops
 * the frame to it.
 */
export function workCover(work: Work): Photo & { reel?: Reel; w?: number; h?: number } {
  const reel = work.reels ? REELS[work.reels]?.[0] : undefined;
  if (work.cover) return { ...work.cover, reel };
  if (reel) return { src: reel.poster, alt: reel.alt, reel };
  if (work.frame) return work.frame;
  /*
   * A video-led category whose reel list is empty. The type cannot catch this
   * one, because it only knows the key is declared and not that anything is
   * filed under it. Failing loudly at build is the point: the alternative is
   * an empty `src`, which silently makes the browser fetch the page again as
   * an image.
   */
  throw new Error(`Work "${work.slug}" names reels "${work.reels}", which has no clips.`);
}

/*
 * The covers are the client's: nine stills from one drive folder, named "2",
 * "2 2" and so on, with nothing to say which category each belongs to. Each
 * is placed by what it shows, which is the same person, set, product or room
 * as the category's own clips and photographs; the note on each entry says
 * what matched. Cafe is the one they sent no cover for, so it keeps its
 * clip's poster. `w` and `h` are the size of the file under /img/work-covers,
 * where the two 3:4 covers arrived at 707 by 942 and are not upscaled.
 */
export const WORKS: Work[] = [
  {
    slug: "clothing",
    title: "Clothing",
    reels: "clothing",
    // The woman, the orange kurta, the gramophone and the carved screen are
    // the cover clip's.
    cover: {
      src: media("/img/work-covers/clothing.jpg"),
      w: 707,
      h: 942,
      alt: "Woman in an orange kurta set with gold embroidery walks towards the camera through a black and white room, a gramophone on a table to her left and a carved wooden screen and white blossoms behind her",
    },
  },
  {
    slug: "cafe",
    title: "Cafe",
    reels: "cafe",
    // Sent later than the other nine, in the same 3:4 as the clothing and
    // fitness covers: the beachfront terrace of the cafe reels from the air.
    cover: {
      src: media("/img/work-covers/cafe.jpg"),
      w: 900,
      h: 1200,
      alt: "White and blue beachfront cafe with a rooftop terrace, palms and a sunset over the sea behind it, from the air",
    },
  },
  {
    slug: "fitness",
    title: "Fitness",
    reels: "fitness",
    shoot: "fitness",
    // The athlete from the fitness clip, in the same magenta top, black
    // shorts and pink trainers.
    cover: {
      src: media("/img/work-covers/fitness.jpg"),
      w: 707,
      h: 942,
      alt: "Athlete in a magenta crop top and black shorts grimaces as she whips a pair of battle ropes across the green turf of a gym",
    },
  },
  {
    slug: "hotel-and-resort",
    title: "Hotel & Resort",
    reels: "hotel-and-resort",
    shoot: "hotel",
    // The peaked safari tent of the cover clip's drone shot, seen from the
    // ground.
    cover: {
      src: media("/img/work-covers/hotel-and-resort.jpg"),
      w: 1024,
      h: 1280,
      alt: "Peaked canvas safari tent on a paved platform, seen through a frame of sunlit green leaves under a blue sky",
    },
  },
  {
    slug: "co-living-space",
    title: "Co-Living Space",
    reels: "co-living-space",
    // The man from the Koliving clips, in the same maroon shirt, inside one
    // of the rooms this time.
    cover: {
      src: media("/img/work-covers/co-living-space.jpg"),
      w: 1024,
      h: 1280,
      alt: "Man in a maroon shirt throws his arms wide in a bright twin room with two beds, two desks, a magenta steel wardrobe and plants on the shelves",
    },
  },
  {
    slug: "product-spotlight",
    title: "Product Spotlight",
    reels: "product-spotlight",
    // The same model, coat and pair of olive ribbed suitcases as the cover
    // clip, drawn rather than photographed.
    cover: {
      src: media("/img/work-covers/product-spotlight.jpg"),
      w: 1024,
      h: 1280,
      alt: "Illustration of a woman in a yellow coat, white crop top and jeans sitting on an olive ribbed suitcase, a smaller matching case in front, against a blue gradient",
    },
  },
  {
    slug: "store-video",
    title: "Store Video",
    reels: "store-video",
    // The Fashor storefront and the woman in pink with a green dupatta from
    // the cover clip, drawn rather than photographed.
    cover: {
      src: media("/img/work-covers/store-video.jpg"),
      w: 1024,
      h: 1280,
      alt: "Illustration of a smiling woman in a pale pink dress and teal dupatta with open palms outside the Fashor store, its gold sign above her and a second sign in Tamil to her left",
    },
  },
  /*
   * Video only, at the user's request: the forty wedding photographs are on
   * /photoshoot, where the client asked for the photography to live, and no
   * longer repeat under the films here.
   */
  {
    slug: "wedding-content",
    title: "Wedding Content",
    reels: "wedding-content",
    // The one wedding still among the nine. Whether this couple appears in
    // the wedding clips is not confirmed.
    cover: {
      src: media("/img/work-covers/wedding-content.jpg"),
      w: 1024,
      h: 1280,
      alt: "Laughing bride in a blush floral lehenga and groom in a cream sherwani and turban raise their joined hands as gold confetti falls, smoke at their feet and white lotus props either side",
    },
  },
  {
    slug: "interior",
    title: "Interior",
    reels: "interior",
    shoot: "interior",
    // The living room of the interior shoot: the same curved sofa, boucle
    // armchairs and oval marble table as interior-living-room.jpg.
    cover: {
      src: media("/img/work-covers/interior.jpg"),
      w: 1024,
      h: 1280,
      alt: "Cream living room with a curved beige sofa, two boucle armchairs and an oval marble coffee table holding a laptop and white flowers, wall panels edged in gold behind",
    },
  },
  /*
   * Given a cover clip by the client but left out of the list of ten they
   * wrote above it. Kept, because dropping it would drop two files they asked
   * for by name; flagged, because the list and the covers disagree.
   */
  {
    slug: "personal-branding",
    title: "Personal Branding",
    reels: "personal-branding",
    // The man from the cover clip, same beard, checked blazer and flag pin,
    // on a courtroom set.
    cover: {
      src: media("/img/work-covers/personal-branding.jpg"),
      w: 1024,
      h: 1280,
      alt: "Bearded man in a checked blazer and black-framed glasses sits at a desk with a gavel and law books, brass scales of justice behind him",
    },
  },
];

/**
 * The home page's six featured cards wear covers of their own, sent by the
 * client cut to the exact shapes those cards have always had: 4:3, 3:4, 1:1,
 * 4:3, 3:4, 4:3 in the order the cards run. They are for the home page only;
 * /work keeps the covers on `WORKS` above. Keyed by slug so a reorder of
 * `WORKS` cannot put a cover on the wrong piece.
 */
export const HOME_COVERS: Partial<Record<Work["slug"], Photo & { w: number; h: number }>> = {
  clothing: { src: media("/img/home-covers/clothing.jpg"), w: 1200, h: 900, alt: "Woman in an orange embroidered kurta set beside a gramophone and a carved screen" },
  cafe: { src: media("/img/home-covers/cafe.jpg"), w: 900, h: 1200, alt: "White Greek-style building of The Beach Terrace with palms and bougainvillea at dusk" },
  fitness: { src: media("/img/home-covers/fitness.jpg"), w: 1080, h: 1080, alt: "Athlete in a magenta top hauls blue battle ropes on turf in a gym" },
  "hotel-and-resort": { src: media("/img/home-covers/hotel-and-resort.jpg"), w: 1200, h: 900, alt: "Peaked safari tent in sunlit grassland seen through leaves" },
  "co-living-space": { src: media("/img/home-covers/co-living-space.jpg"), w: 900, h: 1200, alt: "Man with arms open in a PG twin room with a magenta wardrobe and a window" },
  "product-spotlight": { src: media("/img/home-covers/product-spotlight.jpg"), w: 1200, h: 900, alt: "Woman in a beige coat and jeans sits on two olive hardshell suitcases against a blue sky" },
};

/**
 * The photography page.
 *
 * The client asked for "all types of photos, wedding, corporates, product".
 * Wedding and corporate are both here. There is no product photography
 * anywhere in what they supplied, so no product set is claimed: the product
 * work they sent is all video, and it is on /work under Product Spotlight.
 */
export const PHOTOSHOOT = {
  sign: "Photoshoot",
  question: ["Every frame", "we shot."],
  sub: "Weddings, interiors, events, studio portraits, fitness and hotels. The full set, not a selection.",
  sets: "6 shoots",
} as const;

export const WORK_INTRO = {
  sign: "Our work",
  question: "We make brands impossible to ignore.",
  sub: "From scroll-stopping content to campaigns that deliver. Here’s what we’ve created.",
} as const;

/* ---------------------------------------------------------------------------
 * Numbers
 * ------------------------------------------------------------------------- */

export const GROWTH = {
  sign: "Growth",
  question: "Okay… but did it work?",
  sub: "Here’s the part that actually matters.",
  before: { label: "Before", value: "50,000", unit: "followers" },
  after: { label: "After", value: "4,50,000", unit: "followers" },
  deltaLabel: "Change",
  delta: "+800%",
  cells: [
    { target: 450000, suffix: "", label: "Cumulative reach" },
    { target: 111, suffix: "%", label: "Avg. engagement lift, 90 days" },
    { target: 450000, suffix: "", label: "Followers grown organically" },
    { target: 3, suffix: " cities", label: "Where the content travels" },
  ],
} as const;

export const PROCESS = {
  sign: "The process",
  question: "How we cook.",
  sub: "Eight stages, zero guesswork.",
  steps: [
    {
      no: "01",
      title: "Find the problem",
      body: "Why isn’t this brand landing yet? We start there, not with a content calendar.",
    },
    {
      no: "02",
      title: "Stalk the audience",
      body: "Who they follow, what they save, why they scroll past everything else.",
    },
    {
      no: "03",
      title: "Cook the strategy",
      body: "Pillars, positioning, a plan built for this brand, not a template.",
    },
    {
      no: "04",
      title: "Make the content",
      body: "Shoot, design, write. Built to be watched, not scrolled past.",
    },
    { no: "05", title: "Post", body: "Right platform, right format, right moment." },
    {
      no: "06",
      title: "Watch the numbers",
      body: "Reach, saves, shares, replies: the stuff that actually means something.",
    },
    {
      no: "07",
      title: "Double down",
      body: "More of what worked. Less of what didn’t. No ego about it.",
    },
    { no: "08", title: "Grow", body: "Compounding, organic, increasingly self-sustaining." },
  ],
} as const;

/* ---------------------------------------------------------------------------
 * Studio
 * ------------------------------------------------------------------------- */

export const KOLKATA = {
  sign: "Home turf",
  question: ["Born in Kolkata.", "Built for the internet."],
  cards: [
    {
      title: "We think different. We create louder.",
      body: "Strategy, content and campaigns that make brands impossible to scroll past.",
    },
    {
      title: "Local vibe. Global scroll.",
      body: "Rooted in Kolkata, creating content that travels far beyond it.",
    },
    {
      title: "Ideas start here. Impact takes them further.",
      body: "From strategy to storytelling, we turn brand thought into digital experiences.",
    },
    {
      title: "No boring content",
      body: "Every street has a story. So does every brand, if you look properly.",
    },
  ],
} as const;

/* ---------------------------------------------------------------------------
 * Clients
 *
 * The client supplied two case studies with real figures. Nothing here is
 * rounded up or invented. Where they gave no number, there is no number.
 * ------------------------------------------------------------------------- */

export type CaseStudy = {
  name: string;
  claim: string | readonly string[];
  intro: string[];
  metrics: { value: string; label: string; note: string }[];
  did: string[];
  result: string[];
  frame: string;
  alt: string;
  /**
   * `object-position` for the frame. The case-study frames are shown at 3:2
   * on the home page and 4:5 on /studio, and a tall poster needs to say where
   * its subject is if both crops are to keep the face.
   */
  focus?: string;
  /**
   * The brand's logo, sent by the client for the home page, where it stands
   * in for the frame: set small on a field of the logo's own background colour
   * so the card keeps the frame's shape. /studio still shows the frame.
   */
  logo?: Photo & { bg: string };
  /** The client's clips for this brand, keyed into `lib/reels.ts`. */
  reels?: ReelKey;
};

export const CLIENTS = {
  sign: "Clients",
  question: "People who rode with us.",
  sub: "We don’t just create content. We create growth.",
  /*
   * Two of the client's three paragraphs. The third ("From premium co-living
   * and PG brands in Kolkata to fashion and lifestyle businesses...") only
   * previewed the two case studies that follow it, and the user asked for
   * this section's copy cut down.
   */
  body: [
    "Good marketing should be more than likes, views, and followers.",
    "At Social Yatri we focus on creating content and digital strategies that help brands build visibility, grow their audience, and become more relevant in the digital space.",
  ],
  cases: [
    {
      name: "Koliving",
      logo: { src: media("/img/clients/koliving-mark.jpg"), alt: "Koliving logo", bg: "#ffb901" },
      claim: "From 300 followers to 5,000+, and 15M+ views.",
      intro: [
        "Koliving is a premium PG and co-living brand in Kolkata, offering modern living spaces for students and young professionals.",
        "When we started working with the brand, the challenge wasn’t simply to post more content. It was to make Koliving more visible, relatable, and memorable to its target audience.",
        "We developed a content-led social media strategy focused on creating engaging, relatable, and shareable content designed specifically for the Kolkata audience.",
      ],
      metrics: [
        {
          value: "300 → 5,000+",
          label: "The growth",
          note: "A significant increase in their social media audience, helping Koliving establish a much stronger digital presence.",
        },
        {
          value: "15M+",
          label: "The reach",
          note: "Our content strategy helped the brand generate approximately 15 million+ views, dramatically increasing its visibility and introducing Koliving to a much wider audience.",
        },
      ],
      did: [
        "Social media strategy",
        "Content strategy",
        "Short-form video content",
        "Reels & creative content",
        "Audience-focused storytelling",
        "Trend-based content",
        "Organic social media growth",
      ],
      result: [
        "Koliving went from having a relatively small social media presence to building a significantly larger audience and generating millions of views through organic content.",
        "From being another PG brand to becoming a brand people started noticing.",
      ],
      reels: "co-living-space",
      frame: media("/img/interior-bedroom.jpg"),
      alt: "Symmetrical bed head-on beneath a backlit plaster relief panel",
    },
    {
      name: "EnvyMe Fashion",
      /*
       * The client sent a Fashor logo for this card. Fashor is the store in
       * the Store Video work; the case study copy names EnvyMe Fashion. Used
       * as sent, and flagged to the client to confirm which brand this is.
       */
      logo: { src: media("/img/clients/fashor-mark.jpg"), alt: "Fashor logo", bg: "#ffffff" },
      /*
       * Two authored lines. As one string the browser broke it between the
       * figure and its unit ("From 12K to 4.1" / "lakh+ followers.") on every
       * screen, and a no-break space does not survive the line splitter.
       */
      claim: ["From 12K to", "4.1 lakh+ followers."],
      intro: [
        "EnvyMe Fashion is a premium women’s wear boutique focused on stylish, contemporary fashion for women.",
        "The goal was simple but ambitious: make the brand impossible to ignore on social media.",
        "Instead of relying only on traditional fashion photography, we built a content approach designed around high-volume reach, fashion storytelling, engaging short-form videos, and content formats that audiences naturally want to watch and share.",
      ],
      metrics: [
        {
          value: "12,000 → 4,10,000+",
          label: "The growth",
          note: "We helped EnvyMe Fashion grow its social media audience from approximately 12K followers to 4.1 lakh+ followers, creating a dramatically stronger digital presence for the brand.",
        },
      ],
      did: [
        "Social media marketing",
        "Content strategy",
        "Reels & short-form videos",
        "Fashion-focused content",
        "Creative campaigns",
        "Trend-driven content",
        "Organic audience growth",
        "Brand positioning",
      ],
      result: [
        "EnvyMe Fashion transformed its social media presence, growing from a 12K-follower fashion boutique into a 4.1 lakh+ follower digital fashion brand.",
        "The growth wasn’t about chasing numbers alone. It was about creating content people wanted to watch, share, follow, and remember.",
      ],
      reels: "clothing",
      /*
       * A frame of EnvyMe's own reels. It replaces a bridal photograph from a
       * wedding shoot in Rajasthan, which was another client's work standing
       * in for this one.
       */
      frame: media("/video/posters/clothing-03.jpg"),
      alt: "Woman in a white floral anarkali stands barefoot before carved wooden screens hung with marigold strings",
      focus: "50% 35%",
    },
  ] satisfies CaseStudy[],
  closing: {
    title: ["Real brands. Real growth.", "Your brand could be next."],
    body: [
      "Every business has a different audience, story, and growth opportunity.",
      "That’s why we don’t believe in copy-paste marketing strategies.",
      "At Social Yatri, we combine social media marketing, content creation, content strategy, branding, and performance-driven thinking to build digital growth strategies around your business.",
    ],
    goalsLead: "Whether your goal is:",
    goals: [
      "More followers.",
      "More reach.",
      "More brand awareness.",
      "More enquiries.",
      "More customers.",
    ],
    goalsClose: "We build the strategy to get you there.",
  },
} as const;

/* ---------------------------------------------------------------------------
 * Editorial photography
 *
 * The frames that are not a piece of work in their own right: the opening
 * still, the studio pages, the note beside the contact form. They live here
 * rather than being pulled out of `WORKS` by index, because a slot reaching for
 * `WORKS[6]` silently changes meaning the moment the work list is reordered.
 * ------------------------------------------------------------------------- */

export const PHOTOS: Record<"showreel" | "studioNote", Photo> = {
  /**
   * The studio section's large frame, the one that grows to the viewport and
   * lands beside the closing claim.
   *
   * The crew at work: a frame from their own behind-the-scenes footage of the
   * Zensu shoot, cut from the 4K source. Two of the team are directing a model
   * seated on one of the suitcases, one of them holding up a laptop.
   *
   * It replaces a wedding photograph, which was a piece of client work sitting
   * where a picture of the studio should be. The client asked for the founder
   * with the team. There is no such photograph anywhere in what they have
   * supplied, and the one clip titled "Founder story" turned out to be a
   * client advert (Aurex Electricals) whose subject is that client's founder,
   * so nothing here is captioned as the founder. This is the team on set,
   * which is true, and it can be swapped the day a team photograph arrives.
   */
  showreel: {
    src: media("/img/studio-crew-zensu.jpg"),
    alt: "Two of the crew direct a model seated on a suitcase on the Zensu set, one of them showing her a laptop",
    focus: "50% 45%",
  },
  /**
   * Square, beside the studio note on the home page.
   *
   * One of the crew bent over the camera on its tripod, the warehouse studio
   * and the suitcases behind him: another frame from the same Zensu
   * behind-the-scenes clip as the large frame above, 3.4 seconds later and a
   * different shot. It replaces a wedding photograph of a couple, which was
   * client work where the studio itself should be.
   */
  studioNote: {
    src: media("/img/studio-crew-camera.jpg"),
    alt: "One of the crew bends over a camera on a tripod in the warehouse studio, suitcases lined up behind him",
    focus: "50% 50%",
  },
};

/* ---------------------------------------------------------------------------
 * The rest
 * ------------------------------------------------------------------------- */

export const CONNECT = {
  sign: "Connect",
  question: "Let’s grow your brand.",
  sub: "Your next growth story could be the one we tell here.",
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "company", label: "Company", type: "text", required: false },
    { name: "phone", label: "Phone", type: "tel", required: false },
    { name: "email", label: "Email", type: "email", required: true },
    {
      name: "need",
      label: "What do you need help with?",
      type: "text",
      required: false,
      placeholder: "Social media, content, video…",
    },
  ],
  messageLabel: "Message",
  submit: "Start your journey →",
  submitHover: "Start your journey →",
  confirmed: "Thank you.",
  confirmedSub: "We’ll be in touch.",
} as const;

/** The strip that scrolls across the seam between two sections. */
export const MARQUEE = [
  "No boring content",
  "Born in Kolkata. Built for the internet.",
  "We make brands impossible to ignore.",
];
