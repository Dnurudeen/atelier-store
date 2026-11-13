import {
  Armchair,
  Baby,
  BookOpen,
  Dumbbell,
  Flower2,
  Footprints,
  Gem,
  Home,
  LayoutGrid,
  Palette,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tv,
  Watch,
  type LucideIcon,
} from "lucide-react";

const bySlug: Record<string, LucideIcon> = {
  "fine-art": Palette,
  art: Palette,
  fashion: Shirt,
  clothing: Shirt,
  ceramics: Flower2,
  sculpture: Gem,
  jewellery: Gem,
  jewelry: Gem,
  leatherwork: Footprints,
  shoes: Footprints,
  "home-decor": Home,
  home: Home,
  furniture: Armchair,
  beauty: Sparkles,
  "health-beauty": Sparkles,
  phones: Smartphone,
  electronics: Tv,
  accessories: Watch,
  books: BookOpen,
  baby: Baby,
  sports: Dumbbell,
  groceries: ShoppingBasket,
};

export function categoryIcon(slug?: string | null): LucideIcon {
  if (!slug) return LayoutGrid;
  if (bySlug[slug]) return bySlug[slug];
  const hit = Object.keys(bySlug).find((key) => slug.includes(key));
  return hit ? bySlug[hit] : LayoutGrid;
}
