// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  زعفران — القاموس المركزي
//
//  النطاق: ما يراه العميل في رحلة الشراء فقط.
//  لوحات المتجر والمندوب ورسائل الأخطاء النادرة تبقى عربية عمداً —
//  مستخدموها عرب دائماً، وترجمتها كلفة بلا عائد.
//
//  الاستخدام:
//    const { lang } = useLang();
//    const tr = useMemo(() => t(lang), [lang]);
//    <Text>{tr.cart}</Text>
//
//  أي مفتاح ناقص في الإنجليزية يرجع للعربية تلقائياً — فلا نص فارغ أبداً.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ar = {
  // ── التبويبات والهيدر ──
  home: "الرئيسية",
  categories: "التصنيفات",
  myOrders: "طلباتي",
  favorites: "المفضلة",
  account: "حسابي",
  tagline: "من بيتنا لبيتك",
  searchPlaceholder: "ابحث عن متجر أو منتج...",
  chooseAddress: "اختر عنوانك",

  // ── المسارات ──
  trackNow: "اطلب الآن",
  trackNowSub: "جاهز اليوم",
  trackOccasion: "احجز لمناسبتك",
  trackOccasionSub: "بموعد مسبق",
  trackPantry: "من البيت",
  trackPantrySub: "مؤن تدوم معك",

  // ── الرئيسية ──
  seeAll: "عرض الكل",
  nearYou: "الأقرب لك",
  allStores: "كل المتاجر",
  liveNow: "على الهواء الآن",
  watchLive: "شاهد البث",
  store: "متجر",
  stores: "متجر",
  openNow: "متاح الآن",
  ordersCount: "طلب",
  noResults: "ما لقينا نتائج",
  noResultsSub: "جرّب تبحث باسم متجر أو منتج مختلف.",

  // ── حالات المتجر والمنتج ──
  statusOpen: "متاح",
  statusPreorder: "حجز مسبق",
  statusClosed: "مغلق",
  unavailable: "غير متاح",

  // ── صفحة المتجر والمنتج ──
  menu: "القائمة",
  addToCart: "أضف للسلة",
  quantity: "الكمية",
  prepTime: "وقت التحضير",
  minutes: "دقيقة",
  hours: "ساعة",
  currency: "ر.س",
  discount: "خصم",

  // ── السلة والطلب ──
  cart: "السلة",
  emptyCart: "سلتك فارغة",
  emptyCartSub: "تصفح المتاجر وأضف ما يعجبك.",
  browseStores: "تصفح المتاجر",
  subtotal: "المجموع",
  deliveryFee: "رسوم التوصيل",
  total: "الإجمالي",
  placeOrder: "أرسل الطلب",
  deliveryAddress: "عنوان التوصيل",
  paymentMethod: "طريقة الدفع",
  cash: "الدفع عند الاستلام",
  delivery: "توصيل",
  pickup: "استلام شخصي",
  notes: "ملاحظات",

  // ── الطلبات ──
  orderNumber: "رقم الطلب",
  active: "النشطة",
  history: "السجل",
  trackOrder: "متابعة الطلب",
  cancelOrder: "إلغاء الطلب",
  noOrders: "ما عندك طلبات بعد",

  // ── حالات الطلب ──
  pending: "بانتظار القبول",
  accepted: "تم القبول",
  preparing: "قيد التحضير",
  ready: "جاهز",
  delivering: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",

  // ── المفضلة ──
  favoritesEmpty: "ما عندك مفضلة بعد",
  favoritesEmptySub: "اضغط على القلب عند أي متجر، وراح يظهر هنا مباشرة.",

  // ── عام ──
  retry: "إعادة المحاولة",
  loading: "جارٍ التحميل…",
  error: "حدثت مشكلة",
  cancel: "إلغاء",
  confirm: "تأكيد",
  save: "حفظ",
  close: "إغلاق",
};

const en: Partial<Record<keyof typeof ar, string>> = {
  home: "Home",
  categories: "Categories",
  myOrders: "My Orders",
  favorites: "Favorites",
  account: "Account",
  tagline: "From our home to yours",
  searchPlaceholder: "Search for a store or product...",
  chooseAddress: "Choose your address",

  trackNow: "Order Now",
  trackNowSub: "Ready today",
  trackOccasion: "Book for an Occasion",
  trackOccasionSub: "Scheduled ahead",
  trackPantry: "Homemade Pantry",
  trackPantrySub: "Stocks that last",

  seeAll: "See all",
  nearYou: "Nearest to you",
  allStores: "All stores",
  liveNow: "Live now",
  watchLive: "Watch live",
  store: "store",
  stores: "stores",
  openNow: "Open now",
  ordersCount: "orders",
  noResults: "No results found",
  noResultsSub: "Try a different store or product name.",

  statusOpen: "Open",
  statusPreorder: "Pre-order",
  statusClosed: "Closed",
  unavailable: "Unavailable",

  menu: "Menu",
  addToCart: "Add to cart",
  quantity: "Quantity",
  prepTime: "Prep time",
  minutes: "min",
  hours: "hr",
  currency: "SAR",
  discount: "Off",

  cart: "Cart",
  emptyCart: "Your cart is empty",
  emptyCartSub: "Browse stores and add what you like.",
  browseStores: "Browse stores",
  subtotal: "Subtotal",
  deliveryFee: "Delivery fee",
  total: "Total",
  placeOrder: "Place order",
  deliveryAddress: "Delivery address",
  paymentMethod: "Payment method",
  cash: "Cash on delivery",
  delivery: "Delivery",
  pickup: "Pickup",
  notes: "Notes",

  orderNumber: "Order no.",
  active: "Active",
  history: "History",
  trackOrder: "Track order",
  cancelOrder: "Cancel order",
  noOrders: "No orders yet",

  pending: "Awaiting acceptance",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  delivering: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",

  favoritesEmpty: "No favorites yet",
  favoritesEmptySub: "Tap the heart on any store and it will appear here.",

  retry: "Retry",
  loading: "Loading…",
  error: "Something went wrong",
  cancel: "Cancel",
  confirm: "Confirm",
  save: "Save",
  close: "Close",
};

export type Dict = typeof ar;

// الإنجليزية تُدمج فوق العربية — أي مفتاح ناقص يرجع للعربية بدل نص فارغ
const EN_FULL: Dict = { ...ar, ...en } as Dict;

export function t(lang: string): Dict {
  return lang === "en" ? EN_FULL : ar;
}

export const isRTL = (lang: string) => lang !== "en";
