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
  color: string;       // للوضع الليلي
  colorLight: string;  // للوضع النهاري — الألوان الفاتحة تذوب على الخلفية الفاتحة
  Icon: any;
};

export type Category = {
  id: string;
  label: string;
  track: TrackId;
  color: string;       // للوضع الليلي
  colorLight: string;  // للوضع النهاري
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
    colorLight: "#8A5E12",
    Icon: Zap,
  },
  {
    id: "occasion",
    label: "احجز لمناسبتك",
    sub: "بموعد مسبق",
    color: "#E8A0BF",
    colorLight: "#A3486D",
    Icon: CalendarDays,
  },
  {
    id: "pantry",
    label: "من البيت",
    sub: "مؤن تدوم معك",
    color: "#A8D8A8",
    colorLight: "#2E7A3C",
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
    colorLight: "#8A5E12",
    Icon: Flame,
    aliases: ["rice", "mandi", "kabsa", "main", "mains"],
  },
  {
    id: "popular",
    label: "شعبيات",
    track: "now",
    color: "#F2B233",
    colorLight: "#8A5E12",
    Icon: UtensilsCrossed,
    aliases: ["popular", "kitchen", "traditional", "stew", "soup"],
  },
  {
    id: "grills",
    label: "مشاوي وشاورما",
    track: "now",
    color: "#E07A5F",
    colorLight: "#A34527",
    Icon: Flame,
    aliases: ["grills", "grill", "shawarma", "bbq", "meat"],
  },
  {
    id: "seafood",
    label: "سمك وبحريات",
    track: "now",
    color: "#87CEEB",
    colorLight: "#1B6E96",
    Icon: UtensilsCrossed,
    aliases: ["seafood", "fish", "shrimp"],
  },
  {
    id: "sides",
    label: "سلطات وإيدامات",
    track: "now",
    color: "#A8D8A8",
    colorLight: "#2E7A3C",
    Icon: UtensilsCrossed,
    aliases: ["sides", "salad", "salads", "appetizers", "appetizer", "starters"],
  },
  {
    id: "pastries",
    label: "معجنات",
    track: "now",
    color: "#D4A574",
    colorLight: "#8A5E2A",
    Icon: Croissant,
    aliases: ["pastries", "pastry", "bakery", "bread", "pies", "pie"],
  },
  {
    id: "sweets",
    label: "حلويات",
    track: "now",
    color: "#E8A0BF",
    colorLight: "#A3486D",
    Icon: Cake,
    aliases: ["sweets", "sweet", "dessert", "desserts", "cake", "cakes"],
  },
  {
    id: "drinks",
    label: "قهوة ومشروبات",
    track: "now",
    color: "#B08968",
    colorLight: "#6E4A2A",
    Icon: Coffee,
    aliases: ["drinks", "drink", "coffee", "beverages", "juice", "juices", "tea"],
  },

  {
    id: "livestock",
    label: "ذبائح",
    track: "occasion",
    color: "#C1666B",
    colorLight: "#8E2F34",
    Icon: ChefHat,
    aliases: ["livestock", "lamb", "goat", "sheep"],
  },
  {
    id: "poultry",
    label: "حمام وطيور",
    track: "occasion",
    color: "#C1666B",
    colorLight: "#8E2F34",
    Icon: ChefHat,
    aliases: ["poultry", "pigeon", "chicken", "birds"],
  },
  {
    id: "catering",
    label: "تجهيز عزايم",
    track: "occasion",
    color: "#E8A0BF",
    colorLight: "#A3486D",
    Icon: Store,
    aliases: ["catering", "buffet", "events"],
  },

  {
    id: "spices",
    label: "بهارات",
    track: "pantry",
    color: "#D68C45",
    colorLight: "#8A4E12",
    Icon: PackageCheck,
    aliases: ["spices", "spice"],
  },
  {
    id: "sauces",
    label: "شطات ومخللات",
    track: "pantry",
    color: "#C1666B",
    colorLight: "#8E2F34",
    Icon: PackageCheck,
    aliases: ["sauces", "sauce", "pickles"],
  },
  {
    id: "honey",
    label: "عسل وسمن",
    track: "pantry",
    color: "#F2B233",
    colorLight: "#8A5E12",
    Icon: PackageCheck,
    aliases: ["honey", "ghee"],
  },
  {
    id: "wraps",
    label: "ورق عنب وملفوف",
    track: "pantry",
    color: "#A8D8A8",
    colorLight: "#2E7A3C",
    Icon: PackageCheck,
    aliases: ["wraps", "vine_leaves", "cabbage"],
  },
  {
    id: "dairy",
    label: "ألبان وزبادي",
    track: "pantry",
    color: "#CFCFCF",
    colorLight: "#5C5C5C",
    Icon: PackageCheck,
    aliases: ["dairy", "yogurt", "laban", "cheese"],
  },
  {
    id: "nuts",
    label: "معمول ومكسرات",
    track: "pantry",
    color: "#B08968",
    colorLight: "#6E4A2A",
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
    colorLight: "#8A5E12",
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


// اللون المناسب للمظهر الحالي — يمنع ذوبان ألوان الوضع الليلي على الخلفية الفاتحة
export function tone(item: { color: string; colorLight: string }, isDark: boolean): string {
  return isDark ? item.color : item.colorLight;
}