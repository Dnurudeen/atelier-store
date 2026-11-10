import type { Banner, Category, Product, Store } from "./api";
import { media } from "./media";

export const demoCategories: Category[] = [
  {
    id: 1,
    name: "Fine Art",
    slug: "fine-art",
    description: "Original paintings and drawings by Nigerian artists",
    image: media.category("fine-art"),
  },
  {
    id: 2,
    name: "Fashion",
    slug: "fashion",
    description: "Handcrafted apparel and textiles",
    image: media.category("fashion"),
  },
  {
    id: 3,
    name: "Ceramics",
    slug: "ceramics",
    description: "Pottery and ceramic vessels",
    image: media.category("ceramics"),
  },
  {
    id: 4,
    name: "Sculpture",
    slug: "sculpture",
    description: "Wood, bronze, and mixed media sculpture",
    image: media.category("sculpture"),
  },
  {
    id: 5,
    name: "Leatherwork",
    slug: "leatherwork",
    description: "Handmade leather shoes, bags, and accessories",
    image: media.category("leatherwork"),
  },
  {
    id: 6,
    name: "Home Decor",
    slug: "home-decor",
    description: "Furniture and decorative craft for living spaces",
    image: media.category("home-decor"),
  },
];

export const demoStores: Store[] = [
  {
    id: 1,
    name: "Adebayo Studio",
    slug: "adebayo-studio",
    logo: media.makerAvatar(1),
    banner: media.makerBanner(1),
    bio: "Contemporary oil paintings exploring Nigerian urban life and heritage.",
    location: "Lagos",
    rating: 4.9,
    products_count: 18,
    status: "approved",
    shipping_fee: 2500,
    seller_score: { score: 4.7, shipping_speed: 0.92, customer_rating: 4.9, cancellation_rate: 0.04, return_rate: 0.02, orders: 18 },
  },
  {
    id: 2,
    name: "Clay & Ember",
    slug: "clay-and-ember",
    logo: media.makerAvatar(2),
    banner: media.makerBanner(2),
    bio: "Hand thrown ceramics and sculptural vessels from Abuja.",
    location: "Abuja",
    rating: 4.8,
    products_count: 24,
    status: "approved",
    shipping_fee: 3000,
    seller_score: { score: 4.5, shipping_speed: 0.88, customer_rating: 4.8, cancellation_rate: 0.06, return_rate: 0.03, orders: 14 },
  },
  {
    id: 3,
    name: "Okafor Leather",
    slug: "okafor-leather",
    logo: media.makerAvatar(3),
    banner: media.makerBanner(3),
    bio: "Bespoke leather footwear and bags crafted in Aba.",
    location: "Aba",
    rating: 4.7,
    products_count: 31,
    status: "approved",
    shipping_fee: 2000,
    seller_score: { score: 4.4, shipping_speed: 0.84, customer_rating: 4.6, cancellation_rate: 0.08, return_rate: 0.04, orders: 11 },
  },
  {
    id: 4,
    name: "Heritage Weave",
    slug: "heritage-weave",
    logo: media.makerAvatar(4),
    banner: media.makerBanner(4),
    bio: "Handwoven textiles and ready to wear fashion rooted in Yoruba craft.",
    location: "Ibadan",
    rating: 4.9,
    products_count: 22,
    status: "approved",
    shipping_fee: 2500,
    seller_score: { score: 4.8, shipping_speed: 0.95, customer_rating: 4.9, cancellation_rate: 0.02, return_rate: 0.01, orders: 16 },
  },
];

const productSeeds = [
  { name: "Lagos Twilight Canvas", price: 185000, category: demoCategories[0], store: demoStores[0], img: 1 },
  { name: "Indigo Heritage Polo", price: 42000, category: demoCategories[1], store: demoStores[3], img: 2 },
  { name: "Carved Earth Vessel", price: 68000, category: demoCategories[2], store: demoStores[1], img: 3 },
  { name: "Hand Lasted Oxford", price: 95000, category: demoCategories[4], store: demoStores[2], img: 4 },
  { name: "Ancestral Figure Sculpture", price: 220000, category: demoCategories[3], store: demoStores[0], img: 5 },
  { name: "Terracotta Table Set", price: 54000, category: demoCategories[2], store: demoStores[1], img: 6 },
  { name: "Woven Accent Throw", price: 38000, category: demoCategories[5], store: demoStores[3], img: 7 },
  { name: "Market Morning Oil", price: 150000, category: demoCategories[0], store: demoStores[0], img: 8 },
  { name: "Saddle Leather Tote", price: 78000, category: demoCategories[4], store: demoStores[2], img: 9 },
  { name: "Cedar Side Table", price: 125000, category: demoCategories[5], store: demoStores[1], img: 10 },
  { name: "Adire Wrap Dress", price: 62000, category: demoCategories[1], store: demoStores[3], img: 11 },
  { name: "Bronze Mask Relief", price: 198000, category: demoCategories[3], store: demoStores[0], img: 12 },
  { name: "Harbor Light Study", price: 96000, category: demoCategories[0], store: demoStores[0], img: 13 },
  { name: "Quiet Compound", price: 128000, category: demoCategories[0], store: demoStores[0], img: 14 },
  { name: "Red Earth Field", price: 74000, category: demoCategories[0], store: demoStores[0], img: 15 },
  { name: "Studio Window", price: 88000, category: demoCategories[0], store: demoStores[0], img: 16 },
  { name: "Indigo Camp Shirt", price: 36000, category: demoCategories[1], store: demoStores[3], img: 17 },
  { name: "Burgundy Wrap", price: 54000, category: demoCategories[1], store: demoStores[3], img: 18 },
  { name: "Ivory Weave Polo", price: 41000, category: demoCategories[1], store: demoStores[3], img: 19 },
  { name: "Market Day Scarf", price: 22000, category: demoCategories[1], store: demoStores[3], img: 20 },
  { name: "Speckled Serving Bowl", price: 28000, category: demoCategories[2], store: demoStores[1], img: 21 },
  { name: "Banded Terracotta Vase", price: 46000, category: demoCategories[2], store: demoStores[1], img: 22 },
  { name: "Nesting Clay Cups", price: 24000, category: demoCategories[2], store: demoStores[1], img: 23 },
  { name: "Crimson Line Platter", price: 32000, category: demoCategories[2], store: demoStores[1], img: 24 },
  { name: "Standing Wood Figure", price: 176000, category: demoCategories[3], store: demoStores[0], img: 25 },
  { name: "Panel Mask", price: 142000, category: demoCategories[3], store: demoStores[0], img: 26 },
  { name: "Bronze Field Bird", price: 98000, category: demoCategories[3], store: demoStores[0], img: 27 },
  { name: "Stacked Clay Form", price: 86000, category: demoCategories[3], store: demoStores[1], img: 28 },
  { name: "Aba Oxford", price: 88000, category: demoCategories[4], store: demoStores[2], img: 29 },
  { name: "Saddle Tote", price: 72000, category: demoCategories[4], store: demoStores[2], img: 30 },
  { name: "Chestnut Belt", price: 18000, category: demoCategories[4], store: demoStores[2], img: 31 },
  { name: "Woven Sandal", price: 34000, category: demoCategories[4], store: demoStores[2], img: 32 },
  { name: "Indigo Chair Throw", price: 29000, category: demoCategories[5], store: demoStores[3], img: 33 },
  { name: "Cedar Nightstand", price: 112000, category: demoCategories[5], store: demoStores[1], img: 34 },
  { name: "Clay Table Lamp", price: 48000, category: demoCategories[5], store: demoStores[1], img: 35 },
  { name: "Carved Serving Boards", price: 26000, category: demoCategories[5], store: demoStores[1], img: 36 },
];

export const demoProducts: Product[] = productSeeds.map((seed, index) => ({
  id: index + 1,
  name: seed.name,
  slug: seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  description:
    "Crafted with care by a verified Atelier Nigeria maker. Each piece is unique, signed by the artisan, and ships with a certificate of authenticity.",
  price: seed.price,
  compare_at_price: index % 3 === 0 ? Math.round(seed.price * 1.18) : null,
  stock: 5 + (index % 8),
  status: "published",
  is_featured: index < 8,
  rating: 4.5 + (index % 5) * 0.1,
  reviews_count: 4 + index * 2,
  category: seed.category,
  store: seed.store,
  images: [
    { id: index * 10 + 1, url: media.product(seed.img), is_primary: true },
    ...(seed.img <= 12
      ? [{ id: index * 10 + 2, url: media.detail(seed.img), is_primary: false }]
      : []),
  ],
  is_sponsored: index % 9 === 0,
  specs:
    seed.category.slug === "fine-art" || seed.category.slug === "sculpture"
      ? { medium: "Oil and pigment", dimensions: "80 × 100 cm" }
      : { materials: "Made by hand in Nigeria", dimensions: "See maker note" },
  reviews:
    index === 0
      ? [
          {
            id: 1,
            rating: 5,
            comment: "The color in person is even richer than the photo. Packed with care.",
            user: { id: 1, name: "Ada Okafor" },
          },
        ]
      : [],
  variants:
    seed.category.slug === "fashion" || seed.category.slug === "leatherwork"
      ? [
          {
            id: index * 10 + 3,
            name: "Indigo / M",
            stock: 3,
            attributes: { color: "Indigo", size: "M" },
          },
          {
            id: index * 10 + 4,
            name: "Cream / L",
            stock: 2,
            price: seed.price + 2000,
            attributes: { color: "Cream", size: "L" },
          },
        ]
      : [],
  tags: [],
}));

export const demoBanners: Banner[] = [
  {
    id: 1,
    title: "Creators and Handcrafted Excellence",
    subtitle: "Nigeria's marketplace for artisans, painters, and makers.",
    image: media.hero(1),
    cta_label: "Shop the collection",
    cta_url: "/shop",
    is_active: true,
  },
  {
    id: 2,
    title: "Meet the Makers Behind Every Piece",
    subtitle: "Discover original art, ceramics, leather, and furniture.",
    image: media.hero(2),
    cta_label: "Explore artisans",
    cta_url: "/makers",
    is_active: true,
  },
  {
    id: 3,
    title: "Join as a Vendor Today",
    subtitle: "Turn your craft into a thriving business on Atelier Nigeria.",
    image: media.hero(3),
    cta_label: "Become a vendor",
    cta_url: "/become-a-vendor",
    is_active: true,
  },
];
