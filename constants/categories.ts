import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import {
  Award,
  BadgeCheck,
  ChevronLeft,
  CircleOff,
  Filter,
  MapPin,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  UtensilsCrossed,
  X,
} from "lucide-react-native";

import { CATEGORIES, GENDERS } from "@/constants/categories";

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
    category?: string | null;
  }> | null;
};

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
  const n = numberValue(value);
  return n.toFixed(2).replace(".00", "");
}

function getCategoryLabel(id: string) {
  const found = CATEGORIES.find((cat: any) => cat.id === id);
  return found?.label?.ar || "كل التصنيفات";
}

function getGenderLabel(id: string) {
  const found = GENDERS.find((g: any) => g.id === id);
  return found?.label?.ar || "الكل";
}

export default function CategoriesScreen() {
  const router = useRouter();

  const [chefs, setChefs] = useState<Chef[]>([]);
  const [category, setCategory] = useState("all");
  const [gender, setGender] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const loadChefs = useCallback(async (silent = false) => {
    const currentRequest = ++requestId.current;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/chefs`);

      let json: any = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      if (currentRequest !== requestId.current) return;

      if (!response.ok) {
        setError(json?.message || `تعذر تحميل التصنيفات. رمز الخطأ: ${response.status}`);
        setChefs([]);
        return;
      }

      if (!json?.success || !Array.isArray(json?.data)) {
        setError("الخادم لم يرجع بيانات صحيحة.");
        setChefs([]);
        return;
      }

      setChefs(json.data);
    } catch {
      if (currentRequest !== requestId.current) return;
      setError("تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.");
      setChefs([]);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChefs(false);
    }, [loadChefs])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChefs(true);
  }, [loadChefs]);

  const resetFilters = useCallback(() => {
    setCategory("all");
    setGender("all");
    setSearch("");
  }, []);

  const filteredChefs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return chefs
      .filter((chef) => {
        const matchGender = gender === "all" || chef.users?.gender === gender;

        const matchCategory =
          category === "all" ||
          chef.menu?.some((item) => String(item.category || "") === category);

        const chefName = cleanText(chef.users?.full_name, "").toLowerCase();
        const city = cleanText(chef.city, "").toLowerCase();
        const neighborhood = cleanText(chef.neighborhood, "").toLowerCase();
        const menuNames = chef.menu?.map((item) => cleanText(item.name, "").toLowerCase()).join(" ") || "";

        const matchSearch =
          !q ||
          chefName.includes(q) ||
          city.includes(q) ||
          neighborhood.includes(q) ||
          menuNames.includes(q);

        return matchGender && matchCategory && matchSearch;
      })
      .sort((a, b) => {
        const openDiff = Number(Boolean(b.is_open)) - Number(Boolean(a.is_open));
        if (openDiff !== 0) return openDiff;

        const ratingDiff = numberValue(b.rating_avg) - numberValue(a.rating_avg);
        if (ratingDiff !== 0) return ratingDiff;

        return numberValue(b.total_orders) - numberValue(a.total_orders);
      });
  }, [category, chefs, gender, search]);

  const openChefsCount = useMemo(() => {
    return chefs.filter((chef) => chef.is_open).length;
  }, [chefs]);

  const selectedCategoryLabel = getCategoryLabel(category);
  const selectedGenderLabel = getGenderLabel(gender);

  const hasActiveFilters = category !== "all" || gender !== "all" || search.trim().length > 0;

  const openChef = useCallback(
    (id: string) => {
      router.push(`/chef/${id}` as any);
    },
    [router]
  );

  const Header = useCallback(() => {
    return (
      <View>
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={s.heroBadge}>
              <Sparkles size={13} color="#F2B233" strokeWidth={1.8} />
              <Text style={s.heroBadgeText}>اكتشف زعفران</Text>
            </View>

            {hasActiveFilters ? (
              <TouchableOpacity activeOpacity={0.85} style={s.resetBtn} onPress={resetFilters}>
                <X size={14} color="#F2B233" strokeWidth={2} />
                <Text style={s.resetText}>مسح</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={s.heroTitle}>التصنيفات</Text>
          <Text style={s.heroSub}>
            فلتر الأسر المنتجة حسب النوع، الشيف، الوجبات، والتقييم.
          </Text>

          <View style={s.searchBox}>
            <Search size={18} color="#F2B233" strokeWidth={1.8} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن شيف أو طبق أو حي..."
              placeholderTextColor="#7C6145"
              style={s.searchInput}
              textAlign="right"
              returnKeyType="search"
            />
            {search.trim() ? (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setSearch("")}>
                <X size={17} color="#8A6030" strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <UtensilsCrossed size={18} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.statValue}>{chefs.length}</Text>
            <Text style={s.statLabel}>أسرة منتجة</Text>
          </View>

          <View style={s.statCard}>
            <BadgeCheck size={18} color="#4CAF50" strokeWidth={1.8} />
            <Text style={s.statValue}>{openChefsCount}</Text>
            <Text style={s.statLabel}>متاح الآن</Text>
          </View>

          <View style={s.statCard}>
            <PackageSearch size={18} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.statValue}>{filteredChefs.length}</Text>
            <Text style={s.statLabel}>نتيجة</Text>
          </View>
        </View>

        <View style={s.filterTitleRow}>
          <Filter size={17} color="#F2B233" strokeWidth={1.8} />
          <Text style={s.filterTitle}>تصنيف الوجبات</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {CATEGORIES.map((cat: any) => {
            const Icon = cat.icon || UtensilsCrossed;
            const active = category === cat.id;

            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.88}
                style={[s.filterBtn, active && s.filterBtnActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Icon
                  size={16}
                  color={active ? "#17100B" : "#F2B233"}
                  strokeWidth={1.8}
                />
                <Text style={[s.filterText, active && s.filterTextActive]}>
                  {cat.label?.ar || cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.filterTitleRow}>
          <SlidersHorizontal size={17} color="#F2B233" strokeWidth={1.8} />
          <Text style={s.filterTitle}>نوع مقدم الخدمة</Text>
        </View>

        <View style={s.genderRow}>
          {GENDERS.map((g: any) => {
            const active = gender === g.id;

            return (
              <TouchableOpacity
                key={g.id}
                activeOpacity={0.88}
                style={[s.genderBtn, active && s.genderBtnActive]}
                onPress={() => setGender(g.id)}
              >
                <Text style={[s.genderText, active && s.genderTextActive]}>
                  {g.label?.ar || g.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.resultInfo}>
          <View style={s.resultTextWrap}>
            <Text style={s.resultTitle}>النتائج المطابقة</Text>
            <Text style={s.resultSub}>
              {selectedCategoryLabel} · {selectedGenderLabel}
            </Text>
          </View>

          <Text style={s.resultCount}>{filteredChefs.length}</Text>
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
            <RefreshCw size={17} color="#F2B233" strokeWidth={1.8} />
            <View style={s.errorTextWrap}>
              <Text style={s.errorTitle}>حدثت مشكلة</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    category,
    chefs.length,
    error,
    filteredChefs.length,
    gender,
    hasActiveFilters,
    onRefresh,
    openChefsCount,
    resetFilters,
    search,
    selectedCategoryLabel,
    selectedGenderLabel,
  ]);

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      const chefName = cleanText(item.users?.full_name, "أسرة منتجة");
      const city = cleanText(item.city, "المدينة");
      const neighborhood = cleanText(item.neighborhood, "الحي");
      const menuItems = item.menu?.slice(0, 4) || [];

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          style={s.card}
          onPress={() => openChef(String(item.id))}
        >
          <View style={s.avatarWrap}>
            <UtensilsCrossed size={24} color="#F2B233" strokeWidth={1.5} />
          </View>

          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
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
              <Text style={s.city} numberOfLines={1}>
                {city} · {neighborhood}
              </Text>
            </View>

            <View style={s.meta}>
              <Star size={12} color="#F2B233" fill="#F2B233" />
              <Text style={s.rating}>{numberValue(item.rating_avg).toFixed(1).replace(".0", "")}</Text>
              <Text style={s.orders}>{numberValue(item.total_orders)} طلب</Text>

              {item.is_open ? (
                <View style={s.featuredMini}>
                  <Award size={11} color="#F2B233" strokeWidth={1.8} />
                  <Text style={s.featuredMiniText}>مميز</Text>
                </View>
              ) : null}
            </View>

            {menuItems.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.menuScroll}
                contentContainerStyle={s.menuContent}
              >
                {menuItems.map((m) => (
                  <View key={String(m.id || m.name)} style={s.menuTag}>
                    <Text style={s.menuTagText} numberOfLines={1}>
                      {cleanText(m.name, "وجبة")}
                    </Text>
                    <Text style={s.menuTagPrice}>{money(m.price)} ر</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={s.noMenuText}>لا توجد وجبات ظاهرة حاليًا</Text>
            )}
          </View>

          <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8} />
        </TouchableOpacity>
      );
    },
    [openChef]
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل التصنيفات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={filteredChefs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderChef}
        ListHeaderComponent={Header}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F2B233"
          />
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
              {error ? "تعذر عرض النتائج" : "ما في نتائج لهذا التصنيف"}
            </Text>

            <Text style={s.emptySub}>
              {error
                ? "اضغط تحديث أو اسحب الشاشة لإعادة المحاولة."
                : "جرّب تغيير التصنيف أو نوع مقدم الخدمة أو البحث."}
            </Text>

            <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={error ? onRefresh : resetFilters}>
              <Text style={s.primaryBtnText}>{error ? "إعادة المحاولة" : "مسح الفلاتر"}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
  },

  listContent: {
    paddingBottom: 110,
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
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 30,
    padding: 18,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.13)",
  },

  heroTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  heroBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(242,178,51,0.09)",
    borderColor: "rgba(242,178,51,0.18)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },

  heroBadgeText: {
    color: "#F2B233",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  resetBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(242,178,51,0.06)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  resetText: {
    color: "#F2B233",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  heroTitle: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 26,
    lineHeight: 36,
    fontFamily: "Almarai_800ExtraBold",
  },

  heroSub: {
    color: "#A98961",
    textAlign: "right",
    marginTop: 5,
    marginBottom: 15,
    fontSize: 13,
    lineHeight: 23,
    fontFamily: "Almarai_400Regular",
  },

  searchBox: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
    paddingHorizontal: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 9,
  },

  searchInput: {
    flex: 1,
    height: 50,
    color: "#FDF0DC",
    fontSize: 13,
    fontFamily: "Almarai_400Regular",
  },

  statsRow: {
    flexDirection: "row-reverse",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  statCard: {
    flex: 1,
    minHeight: 82,
    borderRadius: 22,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  statValue: {
    color: "#FDF0DC",
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  statLabel: {
    color: "#8A6030",
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  filterTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  filterTitle: {
    color: "#FDF0DC",
    fontSize: 14,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 14,
  },

  filterBtn: {
    minHeight: 40,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#21160D",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
  },

  filterBtnActive: {
    backgroundColor: "#F2B233",
    borderColor: "#F2B233",
  },

  filterText: {
    fontSize: 12,
    color: "#F2B233",
    fontFamily: "Almarai_800ExtraBold",
  },

  filterTextActive: {
    color: "#17100B",
  },

  genderRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },

  genderBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: "#21160D",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
  },

  genderBtnActive: {
    backgroundColor: "rgba(242,178,51,0.12)",
    borderColor: "rgba(242,178,51,0.42)",
  },

  genderText: {
    fontSize: 12,
    color: "#8A6030",
    fontFamily: "Almarai_800ExtraBold",
  },

  genderTextActive: {
    color: "#F2B233",
  },

  resultInfo: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    padding: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  resultTextWrap: {
    flex: 1,
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

  resultCount: {
    minWidth: 42,
    textAlign: "center",
    color: "#F2B233",
    fontSize: 20,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#321717",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.22)",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  errorTextWrap: {
    flex: 1,
  },

  errorTitle: {
    color: "#FFB0B0",
    textAlign: "right",
    fontSize: 13,
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

  card: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: "#21160D",
    borderRadius: 23,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
    gap: 11,
  },

  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.16)",
  },

  info: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  name: {
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

  city: {
    flex: 1,
    fontSize: 11,
    color: "#8A6030",
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  meta: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
    marginBottom: 8,
  },

  rating: {
    fontSize: 12,
    color: "#F2B233",
    fontFamily: "Almarai_700Bold",
  },

  orders: {
    fontSize: 11,
    color: "#6D4E2D",
    fontFamily: "Almarai_400Regular",
  },

  featuredMini: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(242,178,51,0.08)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },

  featuredMiniText: {
    color: "#F2B233",
    fontSize: 9,
    fontFamily: "Almarai_700Bold",
  },

  menuScroll: {
    marginTop: 2,
  },

  menuContent: {
    gap: 6,
  },

  menuTag: {
    maxWidth: 120,
    backgroundColor: "rgba(242,178,51,0.07)",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.11)",
  },

  menuTagText: {
    fontSize: 11,
    color: "#FDF0DC",
    textAlign: "right",
    fontFamily: "Almarai_700Bold",
  },

  menuTagPrice: {
    fontSize: 10,
    color: "#F2B233",
    marginTop: 3,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  noMenuText: {
    color: "#6D4E2D",
    fontSize: 11,
    textAlign: "right",
    marginTop: 2,
    fontFamily: "Almarai_400Regular",
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 54,
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
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },
});