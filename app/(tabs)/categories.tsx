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
  ChevronLeft,
  CircleOff,
  ImageOff,
  MapPin,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react-native";

import {
  ALL_CATEGORY,
  TRACKS,
  categoriesOfTrack,
  findCategory,
  findTrack,
  itemMatchesCategory,
  tone,
  type TrackId,
} from "@/constants/categories";
import { useTheme, type Colors } from "@/context/ThemeContext";

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
  return findCategory(id) || ALL_CATEGORY;
}

function itemInCategory(item: { category?: string | null }, categoryId: string) {
  return itemMatchesCategory(item.category, categoryId);
}

function chefHasCategory(chef: Chef, categoryId: string) {
  if (categoryId === "all") return true;
  return chef.menu?.some((item) => itemInCategory(item, categoryId));
}

export default function CategoriesScreen() {
  const router = useRouter();
  const { c, isDark } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const params = useLocalSearchParams();

  const initialCategory = firstParam(params.category, "all");
  const initialTrack = firstParam(params.track, "now") as TrackId;

  const [chefs, setChefs] = useState<Chef[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [track, setTrack] = useState<TrackId>(initialTrack);
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
  const trackMeta = findTrack(track) || TRACKS[0];
  const visibleCategories = useMemo(
    () => [ALL_CATEGORY, ...categoriesOfTrack(track)],
    [track]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    visibleCategories.forEach((cat) => {
      counts[cat.id] =
        cat.id === "all"
          ? chefs.length
          : chefs.filter((chef) => chefHasCategory(chef, cat.id)).length;
    });

    return counts;
  }, [chefs, visibleCategories]);

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

  const selectedMeta = category === "all" ? { ...ALL_CATEGORY, label: trackMeta.label } : categoryMeta(category);

  const openChef = useCallback(
    (chefId: string) => {
      router.push(`/chef/${chefId}` as any);
    },
    [router]
  );

  const resetFilters = useCallback(() => {
    setCategory("all");
    setSearch("");
  }, []);

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
              <ImageOff size={26} color={c.textMuted} strokeWidth={1.5} />
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
                  { backgroundColor: item.is_open ? c.successSoft : c.dangerSoft },
                ]}
              >
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: item.is_open ? c.success : c.danger },
                  ]}
                />

                <Text
                  style={[
                    s.statusText,
                    { color: item.is_open ? c.success : c.danger },
                  ]}
                >
                  {item.is_open ? "متاح" : "مغلق"}
                </Text>
              </View>
            </View>

            <View style={s.cityRow}>
              <MapPin size={12} color={c.textSoft} strokeWidth={1.5} />
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
              <Star size={12} color={c.gold} fill={c.gold} />
              <Text style={s.ratingText}>
                {numberValue(item.rating_avg).toFixed(1).replace(".0", "")}
              </Text>
              <Text style={s.ordersText}>{numberValue(item.total_orders)} طلب</Text>
            </View>
          </View>

          <ChevronLeft size={18} color={c.textMuted} strokeWidth={1.8} />
        </TouchableOpacity>
      );
    },
    [c, s, category, openChef]
  );

  if (!fontsLoaded) {
    return (
      <View style={s.safe}>
        <ActivityIndicator color={c.gold} style={{ marginTop: 120 }} />
      </View>
    );
  }

  return (
    <View style={s.safe}>
      {/* البحث والفلترة خارج FlatList — داخله كان الحقل يُعاد بناؤه مع كل حرف فيختفي الكيبورد */}
      <View style={s.searchWrap}>
        <Search size={18} color={c.gold} strokeWidth={1.8} />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث عن متجر أو منتج..."
          placeholderTextColor={c.textMuted}
          style={s.searchInput}
          textAlign="right"
          returnKeyType="search"
        />

        {search.trim() ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSearch("")}>
            <X size={17} color={c.textSoft} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.railFixed}
        contentContainerStyle={s.trackRow}
      >
        {TRACKS.map((t) => {
          const on = track === t.id;
          const TIcon = t.Icon;

          return (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.85}
              style={[
                s.trackChip,
                on && { backgroundColor: `${tone(t, isDark)}1F`, borderColor: `${tone(t, isDark)}80` },
              ]}
              onPress={() => {
                setTrack(t.id);
                setCategory("all");
              }}
            >
              <TIcon size={16} color={on ? tone(t, isDark) : c.textSoft} strokeWidth={1.9} />
              <Text style={[s.trackChipText, on && { color: tone(t, isDark) }]} numberOfLines={1}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.railFixed}
        contentContainerStyle={s.filterRow}
      >
        {visibleCategories.map((cat) => {
          const active = category === cat.id;
          const Icon = cat.Icon;
          const isEmpty = (categoryCounts[cat.id] || 0) === 0;

          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.85}
              style={[
                s.filterChip,
                active && { backgroundColor: `${tone(cat, isDark)}1F`, borderColor: `${tone(cat, isDark)}80` },
                isEmpty && !active && s.filterChipEmpty,
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Icon
                size={17}
                color={active ? tone(cat, isDark) : c.textSoft}
                strokeWidth={1.9}
              />

              <Text
                style={[s.filterLabel, active && { color: tone(cat, isDark) }]}
                numberOfLines={2}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.resultRow}>
        <Text style={s.resultText}>
          {selectedMeta.label}{filteredChefs.length > 0 ? ` · ${filteredChefs.length} متجر` : ""}
        </Text>

        {category !== "all" || search.trim() ? (
          <TouchableOpacity activeOpacity={0.85} onPress={resetFilters}>
            <Text style={s.resetText}>مسح الفلتر</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
          <RefreshCw size={17} color={c.gold} strokeWidth={1.8} />
          <View style={s.errorInfo}>
            <Text style={s.errorTitle}>حدثت مشكلة</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>جاري تحميل التصنيفات...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChefs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderChef}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                {error ? (
                  <RefreshCw size={54} color={c.textMuted} strokeWidth={1.5} />
                ) : (
                  <CircleOff size={54} color={c.textMuted} strokeWidth={1.5} />
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
      )}
    </View>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
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
    color: c.text,
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
  },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 46,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },

  searchInput: {
    flex: 1,
    height: 46,
    color: c.text,
    fontSize: 14,
    fontFamily: "Almarai_400Regular",
  },

  // صف الفلترة: خمسة تصنيفات على سطر واحد بلا تمرير أفقي
  railFixed: {
    flexGrow: 0,
    flexShrink: 0,
  },

  trackRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },

  trackChip: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
  },

  trackChipText: {
    color: c.text,
    fontSize: 13.5,
    fontFamily: "Almarai_700Bold",
  },

  filterRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 6,
  },

  filterChip: {
    minWidth: 104,
    height: 66,
    borderRadius: 15,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },

  filterChipEmpty: {
    opacity: 0.42,
  },

  filterLabel: {
    color: c.text,
    fontSize: 12,
    lineHeight: 17,
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
    color: c.textSoft,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  resetText: {
    color: c.gold,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    padding: 13,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  errorInfo: {
    flex: 1,
  },

  errorTitle: {
    color: c.danger,
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorText: {
    color: c.danger,
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
    backgroundColor: c.surface,
    borderRadius: 23,
    padding: 13,
    borderWidth: 1,
    borderColor: c.goldSoft,
    gap: 12,
  },

  chefImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: c.surfaceAlt,
  },

  chefImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: c.surfaceAlt,
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
    color: c.text,
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
    color: c.textSoft,
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
    color: c.text,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  menuPrice: {
    color: c.gold,
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
    color: c.gold,
    fontFamily: "Almarai_700Bold",
  },

  ordersText: {
    fontSize: 11,
    color: c.textMuted,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    textAlign: "center",
    color: c.text,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    textAlign: "center",
    color: c.textSoft,
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
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },
});