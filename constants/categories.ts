// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  زعفران — المصدر الوحيد للمسارات والتصنيفات
//
//  تستورده: app/(tabs)/index.tsx · app/(tabs)/categories.tsx · app/menu/index.tsx
//  أي تعديل هنا ينعكس على الشاشات الثلاث معًا — لا تعرّف تصنيفات محليًا في أي شاشة.
//
//  aliases: كل قيم menu_items.category المحتملة التي تنتمي لهذا التصنيف،
//  وتشمل القيم القديمة حتى لا يضيع منتج مسجّل قبل هذا التحديث.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  Cake,
  CalendarDays,
  ChefHat,
  Coffee,
  Croissant,
  Flame,
  Package,
  PackageCheck,
  Sparkles,
  Store,
  UtensilsCrossed,
  Zap,
} from "lucide-react-native";

export type TrackId = "now" | "occasion" | "pantry";

export type Track = {
  id: TrackId;
  label: string;
  sub: string;
  color: string;
  Icon: any;
};

export type Category = {
  id: string;
  label: string;
  track: TrackId;
  color: string;
  Icon: any;
  aliases: string[];
};

// ━━━ المسارات الثلاثة — هذا وحده ما يظهر في الرئيسية ━━━
export const TRACKS: Track[] = [
  {
    id: "now",
    label: "اطلب الآن",
    sub: "جاهز اليوم",
    color: "#F2B233",
    Icon: Zap,
  },
  {
    id: "occasion",
    label: "احجز لمناسبتك",
    sub: "بموعد مسبق",
    color: "#E8A0BF",
    Icon: CalendarDays,
  },
  {
    id: "pantry",
    label: "من البيت",
    sub: "مؤن تدوم معك",
    color: "#A8D8A8",
    Icon: Package,
  },
];

// ━━━ التصنيفات — تظهر داخل المسار بعد الدخول، لا في الرئيسية ━━━
export const CATEGORIES: Category[] = [
  {
    id: "rice",
    label: "أرز ومندي",
    track: "now",
    color: "#F2B233",
    Icon: Flame,
    aliases: ["rice", "mandi", "kabsa", "main", "mains"],
  },
  {
    id: "popular",
    label: "شعبيات",
    track: "now",
    color: "#F2B233",
    Icon: UtensilsCrossed,
    aliases: ["popular", "kitchen", "traditional", "stew", "soup"],
  },
  {
    id: "grills",
    label: "مشاوي وشاورما",
    track: "now",
    color: "#E07A5F",
    Icon: Flame,
    aliases: ["grills", "grill", "shawarma", "bbq", "meat"],
  },
  {
    id: "seafood",
    label: "سمك وبحريات",
    track: "now",
    color: "#87CEEB",
    Icon: UtensilsCrossed,
    aliases: ["seafood", "fish", "shrimp"],
  },
  {
    id: "sides",
    label: "سلطات وإيدامات",
    track: "now",
    color: "#A8D8A8",
    Icon: UtensilsCrossed,
    aliases: ["sides", "salad", "salads", "appetizers", "appetizer", "starters"],
  },
  {
    id: "pastries",
    label: "معجنات",
    track: "now",
    color: "#D4A574",
    Icon: Croissant,
    aliases: ["pastries", "pastry", "bakery", "bread", "pies", "pie"],
  },
  {
    id: "sweets",
    label: "حلويات",
    track: "now",
    color: "#E8A0BF",
    Icon: Cake,
    aliases: ["sweets", "sweet", "dessert", "desserts", "cake", "cakes"],
  },
  {
    id: "drinks",
    label: "قهوة ومشروبات",
    track: "now",
    color: "#B08968",
    Icon: Coffee,
    aliases: ["drinks", "drink", "coffee", "beverages", "juice", "juices", "tea"],
  },

  {
    id: "livestock",
    label: "ذبائح",
    track: "occasion",
    color: "#C1666B",
    Icon: ChefHat,
    aliases: ["livestock", "lamb", "goat", "sheep"],
  },
  {
    id: "poultry",
    label: "حمام وطيور",
    track: "occasion",
    color: "#C1666B",
    Icon: ChefHat,
    aliases: ["poultry", "pigeon", "chicken", "birds"],
  },
  {
    id: "catering",
    label: "تجهيز عزايم",
    track: "occasion",
    color: "#E8A0BF",
    Icon: Store,
    aliases: ["catering", "buffet", "events"],
  },

  {
    id: "spices",
    label: "بهارات",
    track: "pantry",
    color: "#D68C45",
    Icon: PackageCheck,
    aliases: ["spices", "spice"],
  },
  {
    id: "sauces",
    label: "شطات ومخللات",
    track: "pantry",
    color: "#C1666B",
    Icon: PackageCheck,
    aliases: ["sauces", "sauce", "pickles"],
  },
  {
    id: "honey",
    label: "عسل وسمن",
    track: "pantry",
    color: "#F2B233",
    Icon: PackageCheck,
    aliases: ["honey", "ghee"],
  },
  {
    id: "wraps",
    label: "ورق عنب وملفوف",
    track: "pantry",
    color: "#A8D8A8",
    Icon: PackageCheck,
    aliases: ["wraps", "vine_leaves", "cabbage"],
  },
  {
    id: "dairy",
    label: "ألبان وزبادي",
    track: "pantry",
    color: "#CFCFCF",
    Icon: PackageCheck,
    aliases: ["dairy", "yogurt", "laban", "cheese"],
  },
  {
    id: "nuts",
    label: "معمول ومكسرات",
    track: "pantry",
    color: "#B08968",
    Icon: PackageCheck,
    aliases: ["nuts", "maamoul", "dates"],
  },
];

// خيار "الكل" — يُضاف في الشاشات التي تحتاجه، وليس تصنيفًا حقيقيًا
export const ALL_CATEGORY: Category = {
  id: "all",
  label: "الكل",
  track: "now",
  color: "#F2B233",
  Icon: Sparkles,
  aliases: ["all"],
};

// ━━━ دوال مساعدة ━━━

export function categoriesOfTrack(track: TrackId): Category[] {
  return CATEGORIES.filter((c) => c.track === track);
}

export function findCategory(id?: string | null): Category | undefined {
  if (!id) return undefined;
  return CATEGORIES.find((c) => c.id === id);
}

export function categoryLabel(id?: string | null, fallback = "غير مصنف"): string {
  return findCategory(id)?.label || fallback;
}

export function findTrack(id?: string | null): Track | undefined {
  if (!id) return undefined;
  return TRACKS.find((t) => t.id === id);
}

// هل قيمة menu_items.category تنتمي لهذا التصنيف؟
export function itemMatchesCategory(itemCategory: unknown, categoryId: string): boolean {
  if (categoryId === "all") return true;

  const cat = findCategory(categoryId);
  if (!cat) return false;

  const value = String(itemCategory || "").trim().toLowerCase();
  if (!value) return false;

  return cat.id === value || cat.aliases.includes(value);
}

// هل قيمة menu_items.category تنتمي لهذا المسار؟
export function itemMatchesTrack(itemCategory: unknown, track: TrackId): boolean {
  return categoriesOfTrack(track).some((cat) => itemMatchesCategory(itemCategory, cat.id));
}