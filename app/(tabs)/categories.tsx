import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import {
  Cake,
  ChevronLeft,
  CircleOff,
  Coffee,
  Croissant,
  Flame,
  ImageOff,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

type Chef = {
  id: string;
  city?: string | null;
  neighborhood?: string | null;
  is_open?: boolean | null;
  rating_avg?: number | string | null;
  total_orders?: number | string | null;
  users?: {
    full_name?: string | null;
    gender?: string | null;
  } | null;
  menu?: Array<{
    id?: string;
    name?: string | null;
    price?: number | string | null;
    image_url?: string | null;
    category?: string | null;
  }> | null;
};

// المسميات هنا يجب أن تطابق أقسام الشاشة الرئيسية حرفياً
// aliases: كل قيم menu_items.category المحتملة التي تنتمي لهذا التصنيف
// أي قيمة غير مذكورة هنا لن تظهر إلا تحت "الكل"
const CATEGORIES = [
  {
    id: "all",
    label: "الكل",
    color: "#F2B233",
    Icon: Sparkles,
    aliases: ["all"],
  },
  {
    id: "popular",
    label: "الطبخ",
    color: "#F2B233",
    Icon: Flame,
    aliases: [
      "popular", "kitchen", "main", "mains", "rice",
      "appetizers", "appetizer", "starters", "sides", "stew", "soup", "salad",
      "spices", "sauces",
    ],
  },
  {
    id: "sweets",
    label: "الحلا",
    color: "#E8A0BF",
    Icon: Cake,
    aliases: ["sweets", "sweet", "dessert", "desserts", "cake", "cakes"],
  },
  {
    id: "pastries",
    label: "المعجنات",
    color: "#A8D8A8",
    Icon: Croissant,
    aliases: ["pastries", "pastry", "bakery", "bread", "pies", "pie"],
  },
  {
    id: "drinks",
    label: "القهوة",
    color: "#87CEEB",
    Icon: Coffee,
    aliases: ["drinks", "drink", "coffee", "beverages", "juice", "juices", "tea"],
  },
];

function cleanText(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return `${numberValue(value).toFixed(2).replace(".00", "")} ر.س`;
}

function firstParam(value: unknown, fallback = "all") {
  if (Array.isArray(value)) return String(value[0] || fallback);
  if (value === null || value === undefined) return fallback;
  return String(value || fallback);
}

function categoryMeta(id: string) {
  return CATEGORIES.find((cat) => cat.id === id) || CATEGORIES[0];
}

function itemInCategory(item: { category?: string | null }, categoryId: string) {
  if (categoryId === "all") return true;
  const aliases = categoryMeta(categoryId).aliases;
  return aliases.includes(cleanText(item.category, "").toLowerCase());
}

function chefHasCategory(chef: Chef, categoryId: string) {
  if (categoryId === "all") return true;
  return chef.menu?.some((item) => itemInCategory(item, categoryId));
}

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialCategory = firstParam(params.category, "all");

  const [chefs, setChefs] = useState<Chef[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const loadChefs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/api/chefs`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(`تعذر تحميل التصنيفات. رمز الخطأ: ${res.status}`);
        setChefs([]);
        return;
      }

      if (!json?.success || !Array.isArray(json.data)) {
        setError("الخادم لم يرجع بيانات صحيحة.");
        setChefs([]);
        return;
      }

      setChefs(json.data);
    } catch {
      setError("تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.");
      setChefs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const incomingCategory = firstParam(params.category, "all");
      setCategory(incomingCategory);
      loadChefs(false);
    }, [loadChefs, params.category])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChefs(true);
  }, [loadChefs]);

  // عدد المتاجر ضمن كل تصنيف — يستخدم لتخفيت التصنيف الفارغ
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    CATEGORIES.forEach((cat) => {
      counts[cat.id] =
        cat.id === "all"
          ? chefs.length
          : chefs.filter((chef) => chefHasCategory(chef, cat.id)).length;
    });

    return counts;
  }, [chefs]);

  const filteredChefs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return chefs
      .filter((chef) => {
        const matchCategory = chefHasCategory(chef, category);

        const chefName = cleanText(chef.users?.full_name, "").toLowerCase();
        const city = cleanText(chef.city, "").toLowerCase();
        const neighborhood = cleanText(chef.neighborhood, "").toLowerCase();
        const menuNames =
          chef.menu?.map((m) => cleanText(m.name, "").toLowerCase()).join(" ") || "";

        const matchSearch =
          !q ||
          chefName.includes(q) ||
          city.includes(q) ||
          neighborhood.includes(q) ||
          menuNames.includes(q);

        return matchCategory && matchSearch;
      })
      .sort((a, b) => {
        const openDiff = Number(Boolean(b.is_open)) - Number(Boolean(a.is_open));
        if (openDiff !== 0) return openDiff;

        const ratingDiff = numberValue(b.rating_avg) - numberValue(a.rating_avg);
        if (ratingDiff !== 0) return ratingDiff;

        return numberValue(b.total_orders) - numberValue(a.total_orders);
      });
  }, [category, chefs, search]);

  const selectedMeta = categoryMeta(category);

  const openChef = useCallback(
    (chefId: string) => {
      router.push(`/chef/${chefId}` as any);
    },
    [router]
  );

  const clearSearch = useCallback(() => {
    setSearch("");
  }, []);

  const resetFilters = useCallback(() => {
    setCategory("all");
    setSearch("");
  }, []);

  const ListHeader = useCallback(() => {
    return (
      <View>
        {/* البحث أولاً — التصنيفات تحته مباشرة كصف فلترة واحد بلا تمرير أفقي */}
        <View style={s.searchWrap}>
          <Search size={18} color="#F2B233" strokeWidth={1.8} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن متجر أو منتج..."
            placeholderTextColor="#7C6145"
            style={s.searchInput}
            textAlign="right"
            returnKeyType="search"
          />

          {search.trim() ? (
            <TouchableOpacity activeOpacity={0.85} onPress={clearSearch}>
              <X size={17} color="#8A6030" strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.filterRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            const Icon = cat.Icon;
            const isEmpty = (categoryCounts[cat.id] || 0) === 0;

            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.85}
                style={[
                  s.filterChip,
                  active && { backgroundColor: `${cat.color}1F`, borderColor: `${cat.color}66` },
                  isEmpty && !active && s.filterChipEmpty,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Icon
                  size={17}
                  color={active ? cat.color : "#8A6030"}
                  strokeWidth={1.9}
                />

                <Text
                  style={[s.filterLabel, active && { color: cat.color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.resultRow}>
          <Text style={s.resultText}>
            {selectedMeta.label} · {filteredChefs.length} متجر
          </Text>

          {category !== "all" || search.trim() ? (
            <TouchableOpacity activeOpacity={0.85} onPress={resetFilters}>
              <Text style={s.resetText}>مسح الفلتر</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
            <RefreshCw size={17} color="#F2B233" strokeWidth={1.8} />
            <View style={s.errorInfo}>
              <Text style={s.errorTitle}>حدثت مشكلة</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    category,
    categoryCounts,
    clearSearch,
    error,
    filteredChefs.length,
    onRefresh,
    resetFilters,
    search,
    selectedMeta,
  ]);

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      // نعرض منتجاً من التصنيف المختار تحديداً، ونفضّل الذي له صورة
      const inCategory = item.menu?.filter((m) => itemInCategory(m, category)) || [];
      const firstItem =
        inCategory.find((m) => Boolean(m.image_url)) ||
        inCategory[0] ||
        item.menu?.find((m) => Boolean(m.image_url)) ||
        item.menu?.[0];

      const chefName = cleanText(item.users?.full_name, "متجر");
      const city = cleanText(item.city, "المدينة");
      const neighborhood = cleanText(item.neighborhood, "الحي");

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={s.chefCard}
          onPress={() => openChef(String(item.id))}
        >
          {firstItem?.image_url ? (
            <Image source={{ uri: firstItem.image_url }} style={s.chefImage} />
          ) : (
            <View style={s.chefImagePlaceholder}>
              <ImageOff size={26} color="#6D4E2D" strokeWidth={1.5} />
            </View>
          )}

          <View style={s.chefInfo}>
            <View style={s.nameRow}>
              <Text style={s.chefName} numberOfLines={1}>
                {chefName}
              </Text>

              <View
                style={[
                  s.statusPill,
                  { backgroundColor: item.is_open ? "#14351F" : "#381818" },
                ]}
              >
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: item.is_open ? "#4CAF50" : "#E53935" },
                  ]}
                />

                <Text
                  style={[
                    s.statusText,
                    { color: item.is_open ? "#8AF0A5" : "#FF9A9A" },
                  ]}
                >
                  {item.is_open ? "متاح" : "مغلق"}
                </Text>
              </View>
            </View>

            <View style={s.cityRow}>
              <MapPin size={12} color="#8A6030" strokeWidth={1.5} />
              <Text style={s.cityText} numberOfLines={1}>
                {city} · {neighborhood}
              </Text>
            </View>

            <View style={s.menuPreview}>
              <Text style={s.menuName} numberOfLines={1}>
                {cleanText(firstItem?.name, "منتجات متنوعة")}
              </Text>

              {firstItem?.price ? (
                <Text style={s.menuPrice}>{money(firstItem.price)}</Text>
              ) : null}
            </View>

            <View style={s.metaRow}>
              <Star size={12} color="#F2B233" fill="#F2B233" />
              <Text style={s.ratingText}>
                {numberValue(item.rating_avg).toFixed(1).replace(".0", "")}
              </Text>
              <Text style={s.ordersText}>{numberValue(item.total_orders)} طلب</Text>
            </View>
          </View>

          <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8} />
        </TouchableOpacity>
      );
    },
    [category, openChef]
  );

  if (!fontsLoaded || loading) {
    return (
      <View style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل التصنيفات...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <FlatList
        data={filteredChefs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderChef}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F2B233" />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              {error ? (
                <RefreshCw size={54} color="#5A3A18" strokeWidth={1.5} />
              ) : (
                <CircleOff size={54} color="#5A3A18" strokeWidth={1.5} />
              )}
            </View>

            <Text style={s.emptyTitle}>
              {error ? "تعذر عرض النتائج" : `لا يوجد متاجر في ${selectedMeta.label} حالياً`}
            </Text>

            <Text style={s.emptySub}>
              {error
                ? "اسحب للتحديث أو اضغط على صندوق الخطأ لإعادة المحاولة."
                : "جرّب تصنيفًا آخر أو تصفح كل المتاجر."}
            </Text>

            {!error ? (
              <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={resetFilters}>
                <Text style={s.primaryBtnText}>عرض الكل</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
  },

  listContent: {
    paddingBottom: 118,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  loadingText: {
    color: "#FDF0DC",
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
  },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 46,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#21160D",
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  searchInput: {
    flex: 1,
    height: 46,
    color: "#FDF0DC",
    fontSize: 14,
    fontFamily: "Almarai_400Regular",
  },

  // صف الفلترة: خمسة تصنيفات على سطر واحد بلا تمرير أفقي
  filterRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 6,
  },

  filterChip: {
    flex: 1,
    minHeight: 58,
    borderRadius: 15,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    paddingVertical: 8,
    gap: 5,
  },

  filterChipEmpty: {
    opacity: 0.42,
  },

  filterLabel: {
    color: "#A98961",
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Almarai_700Bold",
  },

  resultRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginTop: 16,
    marginBottom: 10,
  },

  resultText: {
    color: "#A98961",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  resetText: {
    color: "#F2B233",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#321717",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.22)",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  errorInfo: {
    flex: 1,
  },

  errorTitle: {
    color: "#FFB0B0",
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorText: {
    color: "#FFCECE",
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    lineHeight: 18,
    fontFamily: "Almarai_400Regular",
  },

  chefCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 11,
    backgroundColor: "#21160D",
    borderRadius: 23,
    padding: 13,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
    gap: 12,
  },

  chefImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#2A1E00",
  },

  chefImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#2A1E00",
    alignItems: "center",
    justifyContent: "center",
  },

  chefInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  chefName: {
    flex: 1,
    fontSize: 14,
    color: "#FDF0DC",
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 9,
    fontFamily: "Almarai_700Bold",
  },

  cityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginBottom: 7,
  },

  cityText: {
    flex: 1,
    fontSize: 11,
    color: "#8A6030",
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  menuPreview: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 7,
  },

  menuName: {
    flex: 1,
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  menuPrice: {
    color: "#F2B233",
    fontSize: 12,
    fontFamily: "Almarai_800ExtraBold",
  },

  metaRow: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
  },

  ratingText: {
    fontSize: 12,
    color: "#F2B233",
    fontFamily: "Almarai_700Bold",
  },

  ordersText: {
    fontSize: 11,
    color: "#6D4E2D",
    fontFamily: "Almarai_400Regular",
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 56,
    paddingHorizontal: 26,
  },

  emptyIcon: {
    width: 108,
    height: 108,
    borderRadius: 38,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    textAlign: "center",
    color: "#FDF0DC",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    textAlign: "center",
    color: "#8A6030",
    fontSize: 12,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 18,
    fontFamily: "Almarai_400Regular",
  },

  primaryBtn: {
    minWidth: 160,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F2B233",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  primaryBtnText: {
    color: "#17100B",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },
});