/**
 * The client's photography, grouped by shoot.
 *
 * Generated from their "website content" drive: every frame they supplied is
 * here, none is used twice, and the alt text is a description of what is
 * actually in the picture rather than of the folder it arrived in. Within a
 * shoot the strongest frame opens the strip and the rest follow behind it.
 *
 * Dimensions are the real ones, which the carousel needs: slides share a height
 * and take their width from the frame, so portrait and landscape can sit in the
 * same strip without either being cropped to fit.
 */

import { media } from "./media";

export type GalleryPhoto = {
  src: string;
  alt: string;
  /** Intrinsic pixel size of the served file. */
  w: number;
  h: number;
};

export type Shoot = {
  /** Names the set wherever it is shown, and to assistive tech. */
  label: string;
  photos: GalleryPhoto[];
};

export const GALLERY = {
  wedding: {
    label: "Wedding photography",
    photos: [
      { src: media("/img/wedding-foreheads-bw.jpg"), w: 1333, h: 2000, alt: "Black and white close-up of a bride and groom touching foreheads, her mehendi hand on his face" },
      { src: media("/img/wedding-carry.jpg"), w: 1336, h: 2000, alt: "Woman kisses a laughing man on the cheek as he carries her under a frescoed ceiling" },
      { src: media("/img/wedding-bougainvillea.jpg"), w: 2000, h: 1336, alt: "Couple in white posing playfully against a red-orange wall draped with bougainvillea" },
      { src: media("/img/wedding-rain-terrace.jpg"), w: 2000, h: 1336, alt: "Couple in white embracing in the rain on a carved terrace below a hilltop fort" },
      { src: media("/img/wedding-gateway.jpg"), w: 2000, h: 1336, alt: "Couple in white laughing together in front of a pink Rajasthani sandstone gateway" },
      { src: media("/img/wedding-lehenga.jpg"), w: 1333, h: 2000, alt: "Bride twirling in a flared red and gold lehenga in a carved haveli room" },
      { src: media("/img/gallery/wedding-dsc06415.jpg"), w: 1200, h: 1800, alt: "Bride in red lehenga bows to the groom's feet beneath a white floral wedding arch with sparklers" },
      { src: media("/img/gallery/wedding-dsc09362.jpg"), w: 1202, h: 1800, alt: "Silhouetted couple kissing at dusk above a bokeh city skyline" },
      { src: media("/img/gallery/wedding-dsc01752.jpg"), w: 1800, h: 1200, alt: "Couple on a lake parapet with pigeons in flight and a palace on the water behind" },
      { src: media("/img/gallery/wedding-dsc01928.jpg"), w: 1200, h: 1800, alt: "Couple running hand in hand through a puddle in the rain, water splashing" },
      { src: media("/img/gallery/wedding-dsc05192-2.jpg"), w: 1200, h: 1800, alt: "Black-and-white close two-shot of a smiling bride in kundan jewellery resting against the groom" },
      { src: media("/img/gallery/wedding-dsc05373.jpg"), w: 1800, h: 1200, alt: "Overhead view of a couple dancing, the bride's red lehenga bright against dark stone" },
      { src: media("/img/gallery/wedding-dsc08791.jpg"), w: 1202, h: 1800, alt: "Man carries a laughing woman beneath a pastel painted vaulted ceiling" },
      { src: media("/img/gallery/wedding-dsc09866.jpg"), w: 1202, h: 1800, alt: "Small figures of a couple in rain on a terrace beneath a vast hilltop fort" },
      { src: media("/img/gallery/wedding-dsc01033.jpg"), w: 1200, h: 1800, alt: "Laughing couple embracing in front of a pink heritage building" },
      { src: media("/img/gallery/wedding-dsc02021.jpg"), w: 1200, h: 1800, alt: "Man spinning a laughing woman off her feet in the rain on a flooded road" },
      { src: media("/img/gallery/wedding-dsc02047.jpg"), w: 1200, h: 1800, alt: "Couple embracing ankle-deep in floodwater on a misty hill road" },
      { src: media("/img/gallery/wedding-dsc05185.jpg"), w: 1800, h: 1200, alt: "Couple forehead to forehead under an ornate carved arch washed in red light" },
      { src: media("/img/gallery/wedding-dsc05372.jpg"), w: 1800, h: 1200, alt: "Overhead black-and-white view of a couple dancing alone in a dark stone courtyard" },
      { src: media("/img/gallery/wedding-dsc05467.jpg"), w: 1200, h: 1800, alt: "Couple smiling at camera in a colonnaded courtyard with red-lit arches behind" },
      { src: media("/img/gallery/wedding-dsc06372.jpg"), w: 1800, h: 1200, alt: "Bride walking under a white floral arch toward the groom as a hall of guests watches" },
      { src: media("/img/gallery/wedding-dsc06411.jpg"), w: 1200, h: 1800, alt: "Bride bending before the standing groom on a white floral mandap strewn with petals" },
      { src: media("/img/gallery/wedding-dsc08515.jpg"), w: 1202, h: 1800, alt: "Extreme close-up of a man kissing a laughing woman on the cheek in soft warm light" },
      { src: media("/img/gallery/wedding-dsc08775.jpg"), w: 1202, h: 1800, alt: "Man piggybacks a smiling woman beneath a painted scalloped archway" },
      { src: media("/img/gallery/wedding-dsc09830.jpg"), w: 1800, h: 1202, alt: "Couple laughing face to face beside a misty lake below hilltop fort ramparts" },
      { src: media("/img/gallery/wedding-dsc01901.jpg"), w: 1200, h: 1800, alt: "Couple in clear rain ponchos wading through a flooded road past a no-parking sign" },
      { src: media("/img/gallery/wedding-dsc04530.jpg"), w: 1200, h: 1800, alt: "Bride in red lehenga standing beside a carved door under a curved sandstone staircase" },
      { src: media("/img/gallery/wedding-dsc05197.jpg"), w: 1200, h: 1800, alt: "Seated couple in a red-lit carved alcove with the bride's lehenga fanned across the floor" },
      { src: media("/img/gallery/wedding-dsc05199.jpg"), w: 1200, h: 1800, alt: "Distant couple glimpsed through a dark stone archway, lit red in a far alcove" },
      { src: media("/img/gallery/wedding-dsc05246.jpg"), w: 1200, h: 1800, alt: "Groom in cream sherwani and turban standing full-length in a carved doorway" },
      { src: media("/img/gallery/wedding-dsc05398.jpg"), w: 1800, h: 1200, alt: "Tight crop on a laughing bride's nath, kundan necklaces and red embroidered blouse" },
      { src: media("/img/gallery/wedding-dsc08640.jpg"), w: 1800, h: 1202, alt: "Man lifts and spins a woman in white on a brick plaza before a pink palace facade" },
      { src: media("/img/gallery/wedding-dsc01916.jpg"), w: 1200, h: 1800, alt: "Couple dancing in the rain in clear ponchos against dense green foliage" },
      { src: media("/img/gallery/wedding-dsc02141.jpg"), w: 1200, h: 1800, alt: "Couple holding hands facing each other in floodwater on a hill road" },
      { src: media("/img/gallery/wedding-dsc04430.jpg"), w: 1200, h: 1800, alt: "Bride in a red lehenga framed in a lit doorway seen through a dark arch" },
      { src: media("/img/gallery/wedding-dsc05217.jpg"), w: 1200, h: 1800, alt: "Couple seated in a red-lit alcove, bride leaning on the groom's shoulder" },
      { src: media("/img/gallery/wedding-dsc01956.jpg"), w: 1200, h: 1800, alt: "Couple in rain ponchos standing arms-out in floodwater before a green flowering bank" },
      { src: media("/img/gallery/wedding-dsc06014.jpg"), w: 1200, h: 1800, alt: "Bride in pink-red lehenga standing in a home corridor beside arched wooden doors" },
      { src: media("/img/gallery/wedding-dsc01834-2.jpg"), w: 1800, h: 1200, alt: "Hilltop fort above a weathered arcaded wall across flat grey water" },
      { src: media("/img/gallery/wedding-dsc02175.jpg"), w: 1200, h: 1800, alt: "White car in the foreground of a flooded road with a couple embracing beyond it" },
    ],
  },
  interior: {
    label: "Interior photography",
    photos: [
      { src: media("/img/interior-bedroom.jpg"), w: 2000, h: 1333, alt: "Symmetrical bed head-on beneath a backlit dandelion plaster relief panel" },
      { src: media("/img/interior-living-room.jpg"), w: 2000, h: 1333, alt: "Living room with arched partition, wall-mounted TV, blush sofa and boucle tub chairs" },
      { src: media("/img/gallery/interior-untitled-hdr-58-recovered.jpg"), w: 1800, h: 1200, alt: "Backlit arched wall with gold Devanagari mantra lettering opening onto a living room" },
      { src: media("/img/gallery/interior-untitled-hdr-90-recovered.jpg"), w: 1800, h: 1200, alt: "Bedroom with backlit dandelion plaster relief, grey headboard and cushioned bed" },
      { src: media("/img/gallery/interior-untitled-hdr-100-recovered.jpg"), w: 1800, h: 1199, alt: "Cream bedroom with backlit floral relief headboard, upholstered bed, wardrobe and nightstand" },
      { src: media("/img/gallery/interior-untitled-hdr-32.jpg"), w: 1800, h: 1198, alt: "Hallway vanity with stone vessel basin, gold tap and backlit full-length mirror" },
      { src: media("/img/gallery/interior-untitled-hdr-48.jpg"), w: 1800, h: 1200, alt: "Blush sofa and two cream tub chairs around a round table in a pale living room" },
      { src: media("/img/gallery/interior-untitled-hdr-82-recovered.jpg"), w: 1800, h: 1200, alt: "Bedroom down its length: wardrobe wall, upholstered bed and backlit relief headboard" },
      { src: media("/img/gallery/interior-untitled-hdr-112-recovered.jpg"), w: 1800, h: 1200, alt: "Grey-beige bedroom with platform storage bed, backlit reed-panel headboard and curtained window" },
      { src: media("/img/gallery/interior-untitled-hdr-66-recovered.jpg"), w: 1800, h: 1200, alt: "Modular kitchen with steel side-by-side fridge, glossy taupe cabinets and marble backsplash" },
      { src: media("/img/gallery/interior-untitled-hdr-64-recovered.jpg"), w: 1200, h: 1800, alt: "Compact powder room with wall-hung toilet, patterned green tile strip and oval lit mirror" },
      { src: media("/img/gallery/interior-untitled-hdr-68-recovered.jpg"), w: 1800, h: 1200, alt: "Kitchen corner with quartz counter, sink, gas hob and marble slab backsplash by a window" },
      { src: media("/img/gallery/interior-untitled-hdr-76-recovered.jpg"), w: 1800, h: 1200, alt: "U-shaped kitchen with sink, gas hob, taupe gloss cabinets and fridge at the left" },
      { src: media("/img/gallery/interior-untitled-hdr-74-recovered.jpg"), w: 1800, h: 1200, alt: "Frontal kitchen wall with chimney hood, fluted-glass cabinets and three-burner gas hob" },
      { src: media("/img/gallery/interior-untitled-hdr-86-recovered.jpg"), w: 1800, h: 1203, alt: "Floor-to-ceiling bedroom wardrobes with gold handles beside the corner of a bed" },
    ],
  },
  corporate: {
    label: "Events and conferences",
    photos: [
      { src: media("/img/corporate-floor-canvas.jpg"), w: 2000, h: 1333, alt: "Elderly calligrapher brushing large blue letterforms on a floor canvas as a crowd photographs him" },
      { src: media("/img/corporate-speaker.jpg"), w: 2000, h: 1333, alt: "Young speaker with a microphone gesturing in front of a slide reading Changes in Letterform" },
      { src: media("/img/corporate-writer.jpg"), w: 2000, h: 1333, alt: "Older bearded man in glasses writing in a notebook, framed by blurred foreground figures" },
      { src: media("/img/corporate-exhibition.jpg"), w: 2000, h: 1343, alt: "Exhibition corridor with orange calligraphy signage, works on easels and a red opening ribbon" },
      { src: media("/img/gallery/corporate-dsc01549.jpg"), w: 1800, h: 1200, alt: "Presenter beside a screen addressing attendees around a U-shaped table under a chandelier-covered ceiling" },
      { src: media("/img/gallery/corporate-dsc01529.jpg"), w: 1800, h: 1200, alt: "Hotel staff in waistcoats seated around a boardroom table below a wall of framed archival photos" },
      { src: media("/img/gallery/corporate-dsc09317.jpg"), w: 1800, h: 1200, alt: "Speaker at a lectern facing an audience seated in blue theatre seats in an auditorium" },
      { src: media("/img/gallery/corporate-dsc09115.jpg"), w: 1800, h: 1200, alt: "Gallery room with paintings on wooden easels and red circular calligraphy discs on a pillar" },
      { src: media("/img/gallery/corporate-dsc09386.jpg"), w: 1800, h: 1200, alt: "School students holding certificates posed with two organisers under colourful tassel bunting" },
      { src: media("/img/gallery/corporate-dsc09445.jpg"), w: 1800, h: 1200, alt: "Large group of workshop participants posed behind a finished purple calligraphy canvas on the floor" },
      { src: media("/img/gallery/corporate-dsc09497.jpg"), w: 1800, h: 1200, alt: "Large group photo of around eighty people on auditorium steps beneath a Closing Ceremony slide" },
      { src: media("/img/gallery/corporate-dsc01552.jpg"), w: 1800, h: 1200, alt: "Row of ten hotel staff and a manager posed in a line in front of a red-lit screen" },
    ],
  },
  baby: {
    label: "Studio family portraits",
    photos: [
      { src: media("/img/studio-toddler.jpg"), w: 2000, h: 1333, alt: "Toddler in a rainbow-striped dress sitting on a white floor, laughing at the camera" },
      { src: media("/img/studio-baby-shoot.jpg"), w: 2000, h: 1333, alt: "Father seated on a white studio floor steadying a laughing toddler on its feet" },
      { src: media("/img/gallery/baby-dsc02687.jpg"), w: 1440, h: 1800, alt: "Young girl in a lilac tulle party dress bending toward camera holding out her skirt" },
      { src: media("/img/gallery/baby-dsc02728.jpg"), w: 1440, h: 1800, alt: "Close portrait of a young girl framing her face with both hands, smiling at camera" },
      { src: media("/img/gallery/baby-dsc01403.jpg"), w: 1440, h: 1800, alt: "Father lifting a laughing baby overhead while seated on a white studio floor" },
      { src: media("/img/gallery/baby-dsc01439.jpg"), w: 1440, h: 1800, alt: "Mother seated on a studio floor lifting a laughing baby above her" },
      { src: media("/img/gallery/baby-dsc01470.jpg"), w: 1440, h: 1800, alt: "Mother, father and laughing baby packed close together in a tight white-background portrait" },
      { src: media("/img/gallery/baby-dsc01412.jpg"), w: 1800, h: 1200, alt: "Toddler sitting on a white studio floor laughing with a fist raised, plush toys either side" },
      { src: media("/img/gallery/baby-dsc026434.jpg"), w: 1440, h: 1800, alt: "Toddler in a striped dress standing while disembodied adult hands hold her from off-frame" },
    ],
  },
  fitness: {
    label: "Fitness and athletes",
    photos: [
      { src: media("/img/fitness-pose.jpg"), w: 2000, h: 1333, alt: "Bald bodybuilder in a camo tank hitting a double biceps pose and grinning in a crowd" },
      { src: media("/img/gallery/fitness-dsc08001.jpg"), w: 1440, h: 1800, alt: "Bearded bodybuilder seated at a lat pulldown machine gripping the bar" },
      { src: media("/img/gallery/fitness-dsc08033.jpg"), w: 1440, h: 1800, alt: "Bald bodybuilder in a camo tank leaning on gym equipment wearing sunglasses" },
      { src: media("/img/gallery/fitness-dsc07952.jpg"), w: 1800, h: 1200, alt: "Woman in a white sports bra adjusting the console of a treadmill in a gym" },
      { src: media("/img/gallery/fitness-dsc08006.jpg"), w: 1440, h: 1800, alt: "Smiling muscular man sitting on a gym machine looking off to the side" },
      { src: media("/img/gallery/fitness-dsc08038.jpg"), w: 1440, h: 1800, alt: "Woman in black gym wear performing a seated leg extension on a machine" },
    ],
  },
  hotel: {
    label: "Hotels and resorts",
    photos: [
      { src: media("/img/hotel-washstand.jpg"), w: 1333, h: 2000, alt: "Antique wooden washstand with ceramic basin beside tall glazed doors" },
      { src: media("/img/gallery/hotel-dsc00314.jpg"), w: 1200, h: 1800, alt: "Four-poster canopy bed under a draped tent ceiling with an iron chandelier" },
      { src: media("/img/gallery/hotel-dji-0588.jpg"), w: 1350, h: 1800, alt: "Drone view of a beach, rock groyne and breaking waves beside a coastal town" },
      { src: media("/img/gallery/hotel-dsc00316.jpg"), w: 1200, h: 1800, alt: "White clawfoot bathtub on a timber floor beside a bright glazed door" },
      { src: media("/img/gallery/hotel-dsc00321.jpg"), w: 1200, h: 1800, alt: "Sitting area of a tented suite with white sofa, planter chair and floor lamp" },
    ],
  },
} as const satisfies Record<string, Shoot>;

export type ShootKey = keyof typeof GALLERY;

/** The shoots in the order the archive shows them, largest set first. */
export const SHOOTS = ["wedding", "interior", "corporate", "baby", "fitness", "hotel"] as const;
