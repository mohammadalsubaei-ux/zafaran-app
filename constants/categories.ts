import {
  UtensilsCrossed,
  Wheat,
  Soup,
  Salad,
  ChefHat,
  Leaf,
  Flame,
} from "lucide-react-native";

export const CATEGORIES = [
  {
    id:    "all",
    label: { ar: "الكل",    en: "All" },
    icon:  UtensilsCrossed,
  },
  {
    id:    "rice",
    label: { ar: "أرز",     en: "Rice" },
    icon:  Wheat,
  },
  {
    id:    "popular",
    label: { ar: "شعبيات",  en: "Popular" },
    icon:  Soup,
  },
  {
    id:    "salad",
    label: { ar: "سلطات",   en: "Salads" },
    icon:  Salad,
  },
  {
    id:    "sides",
    label: { ar: "إيدامات", en: "Sides" },
    icon:  ChefHat,
  },
  {
    id:    "spices",
    label: { ar: "بهارات",  en: "Spices" },
    icon:  Leaf,
  },
  {
    id:    "sauces",
    label: { ar: "شطات",    en: "Sauces" },
    icon:  Flame,
  },
];

export const GENDERS = [
  { id: "all",    label: { ar: "الكل",    en: "All" } },
  { id: "female", label: { ar: "طباخات",  en: "������" } },
  { id: "male",   label: { ar: "طهاة",    en: "�����" } },
];
