import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
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
  UtensilsCrossed,
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

const CATEGORIES = [
  {
    id: "all",
    label: "الكل",
    sub: "كل المنتجات",
    color: "#F2B233",
    bg: "rgba(242,178,51,0.10)",
    Icon: Sparkles,
    aliases: ["all"],
  },
  {
    id: "popular",
    label: "الطبخ",
    sub: "أكلات شعبية",
    color: "#F2B233",
    bg: "#2A1E00",
    Icon: UtensilsCrossed,
    aliases: ["popular", "kitchen", "rice", "sides"],
  },
  {
    id: "sweets",
    label: "الحلا",
    sub: "حلويات",
    color: "#E8A0BF",
    bg: "#2A1220",
    Icon: Cake,
    aliases: ["sweets", "dessert", "desserts"],
  },
  {
    id: "pastries",
    label: "المعجنات",
    sub: "فطائر ومخبوزات",
    color: "#A8D8A8",
    bg: "#0F2A0F",
    Icon: Croissant,
    aliases: ["pastries", "bakery"],
  },
  {
    id: "drinks",
    label: "القهاوي",
    sub: "قهوة ومشروبات",
    color: "#87CEEB",
    bg: "#0F1E2A",
    Icon: Coffee,
    aliases: ["drinks", "coffee", "beverages"],
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

function chefHasCategory(chef: Chef, categoryId: string) {
  if (categoryId === "all") return true;

  const meta = categoryMeta(categoryId);
  const aliases = meta.aliases;

  return chef.menu?.some((item) => {
    const itemCategory = cleanText(item.category, "").toLowerCase();
    return aliases.includes(itemCategory);
  });
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
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <selectedMeta.Icon size={14} color={selectedMeta.color} strokeWidth={1.8} />
            <Text style={[s.heroBadgeText, { color: selectedMeta.color }]}>
              {selectedMeta.label}
            </Text>
          </View>

          <Text style={s.heroTitle}>اختر تصنيفك</Text>
          <Text style={s.heroSub}>أكل · قهوة · حلا · معجنات</Text>

          <View style={s.searchWrap}>
            <Search size={18} color="#F2B233" strokeWidth={1.8} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن شيف أو طبق..."
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
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            const Icon = cat.Icon;

            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.88}
                style={[
                  s.categoryCard,
                  { backgroundColor: active ? cat.bg : "#21160D" },
                  active && { borderColor: `${cat.color}55` },
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <View
                  style={[
                    s.categoryIcon,
                    {
                      borderColor: `${cat.color}44`,
                      backgroundColor: active ? "rgba(0,0,0,0.12)" : "rgba(242,178,51,0.06)",
                    },
                  ]}
                >
                  <Icon size={20} color={cat.color} strokeWidth={1.8} />
                </View>

                <Text style={[s.categoryLabel, { color: active ? cat.color : "#FDF0DC" }]}>
                  {cat.label}
                </Text>

                <Text style={s.categorySub}>{cat.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.resultBox}>
          <View>
            <Text style={s.resultTitle}>النتائج</Text>
            <Text style={s.resultSub}>
              {selectedMeta.label} · {filteredChefs.length} نتيجة
            </Text>
          </View>

          {category !== "all" || search.trim() ? (
            <TouchableOpacity activeOpacity={0.85} style={s.resetBtn} onPress={resetFilters}>
              <Text style={s.resetText}>مسح</Text>
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
      const firstItem = item.menu?.find((m) => {
        if (category === "all") return Boolean(m.image_url);
        const aliases = categoryMeta(category).aliases;
        return aliases.includes(cleanText(m.category, "").toLowerCase());
      }) || item.menu?.[0];

      const chefName = cleanText(item.users?.full_name, "أسرة منتجة");
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
                {cleanText(firstItem?.name, "وجبات متنوعة")}
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
              {error ? "تعذر عرض النتائج" : "لا توجد نتائج مطابقة"}
            </Text>

            <Text style={s.emptySub}>
              {error
                ? "اسحب للتحديث أو اضغط على صندوق الخطأ لإعادة المحاولة."
                : "جرّب تصنيفًا آخر أو امسح البحث."}
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

  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.13)",
  },

  heroBadge: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(242,178,51,0.08)",
    borderColor: "rgba(242,178,51,0.16)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 8,
  },

  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  heroTitle: {
    color: "#FDF0DC",
    fontSize: 19,
    lineHeight: 28,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  heroSub: {
    color: "#A98961",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 6,
    marginBottom: 10,
    fontFamily: "Almarai_400Regular",
  },

  searchWrap: {
    minHeight: 44,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#17100B",
    borderRadius: 18,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  searchInput: {
    flex: 1,
    height: 44,
    color: "#FDF0DC",
    fontSize: 14,
    fontFamily: "Almarai_400Regular",
  },

  categoriesRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 14,
  },

  categoryCard: {
    width: 112,
    minHeight: 112,
    borderRadius: 22,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  categoryLabel: {
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
    textAlign: "center",
  },

  categorySub: {
    marginTop: 4,
    fontSize: 10,
    color: "#8A6030",
    fontFamily: "Almarai_400Regular",
    textAlign: "center",
  },

  resultBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    padding: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  resultTitle: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  resultSub: {
    color: "#8A6030",
    textAlign: "right",
    marginTop: 3,
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  resetBtn: {
    minHeight: 34,
    borderRadius: 13,
    paddingHorizontal: 14,
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
  },

  resetText: {
    color: "#F2B233",
    fontSize: 12,
    fontFamily: "Almarai_800ExtraBold",
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
