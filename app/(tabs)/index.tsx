import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Dimensions,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Award,
  Cake,
  ChevronLeft,
  Coffee,
  Croissant,
  Flame,
  Heart,
  MapPin,
  Search,
  Star,
  UtensilsCrossed,
} from "lucide-react-native";
import {
  useFonts,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

type Chef = {
  id: string;
  city?: string | null;
  neighborhood?: string | null;
  is_open?: boolean | null;
  status?: "open" | "preorder" | "closed" | null;
  rating_avg?: number | string | null;
  total_orders?: number | string | null;
  users?: {
    full_name?: string | null;
  } | null;
  menu?: Array<{
    id?: string;
    name?: string | null;
    price?: number | string | null;
    image_url?: string | null;
  }> | null;
};

const SECTIONS = [
  {
    id: "kitchen",
    category: "popular",
    label: "الطبخ",
    sub: "أكلات شعبية",
    color: "#F2B233",
    bg: "#2A1E00",
    Icon: UtensilsCrossed,
  },
  {
    id: "sweets",
    category: "sweets",
    label: "الحلا",
    sub: "حلويات لذيذة",
    color: "#E8A0BF",
    bg: "#2A1220",
    Icon: Cake,
  },
  {
    id: "pastries",
    category: "pastries",
    label: "الفطائر",
    sub: "فطائر ومعجنات",
    color: "#A8D8A8",
    bg: "#0F2A0F",
    Icon: Croissant,
  },
  {
    id: "drinks",
    category: "drinks",
    label: "مشروبات",
    sub: "قهوة وعصائر",
    color: "#87CEEB",
    bg: "#0F1E2A",
    Icon: Coffee,
  },
];

function safeText(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function safeNumber(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function getChefStatus(chef: Chef): "open" | "preorder" | "closed" {
  if (chef.status === "open" || chef.status === "preorder" || chef.status === "closed") {
    return chef.status;
  }
  return chef.is_open ? "open" : "closed";
}

const CHEF_STATUS_UI: Record<
  "open" | "preorder" | "closed",
  { bg: string; dot: string; text: string; label: string }
> = {
  open:     { bg: "#14351F", dot: "#4CAF50", text: "#8AF0A5", label: "متاح" },
  preorder: { bg: "#3A2A0A", dot: "#F0A500", text: "#FFD27A", label: "حجز مسبق" },
  closed:   { bg: "#381818", dot: "#E53935", text: "#FF9A9A", label: "مغلق" },
};

export default function HomeScreen() {
  const router = useRouter();

  const [chefs, setChefs] = useState<Chef[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banners, setBanners] = useState<
    { id: string; title: string; subtitle: string | null; bg_color: string; text_color: string; target: string | null }[]
  >([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const favoriteKey = useMemo(() => {
    return userId ? `favorites_${userId}` : null;
  }, [userId]);

  const mostOrderedChefs = useMemo(() => {
    return [...chefs]
      .sort((a, b) => Number(b.total_orders || 0) - Number(a.total_orders || 0))
      .slice(0, 6);
  }, [chefs]);

  const loadSession = useCallback(async () => {
    const storedUser = await AsyncStorage.getItem("user");

    if (!storedUser) {
      setUserId(null);
      setFavorites([]);
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const id = user?.id ? String(user.id) : null;
      setUserId(id);

      if (id) {
        const savedFavorites = await AsyncStorage.getItem(`favorites_${id}`);
        setFavorites(savedFavorites ? JSON.parse(savedFavorites) : []);
      }
    } catch {
      await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
      setUserId(null);
      setFavorites([]);
    }
  }, []);

  const fetchChefs = useCallback(async (query = "", silent = false) => {
    const currentRequest = ++requestId.current;

    if (!silent) setLoading(true);
    if (query.trim()) setSearching(true);

    setError(null);

    try {
      const endpoint = query.trim()
        ? `${API}/api/chefs/search?q=${encodeURIComponent(query.trim())}`
        : `${API}/api/chefs`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      if (currentRequest !== requestId.current) return;

      if (!json?.success || !Array.isArray(json?.data)) {
        setChefs([]);
        setError("تعذر تحميل البيانات من الخادم");
        return;
      }

      setChefs(json.data);
    } catch {
      if (currentRequest !== requestId.current) return;
      setError("تعذر الاتصال بالخادم. تأكد من الإنترنت أو شغّل الباكند.");
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setSearching(false);
      }
    }
  }, []);

  const bootstrap = useCallback(async () => {
    await loadSession();
    await fetchChefs("", false);
  }, [fetchChefs, loadSession]);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [bootstrap])
  );

  // بانرات العروض من لوحة الأدمن — القسم يختفي كلياً عند غيابها
  useEffect(() => {
    fetch(`${API}/api/banners`)
      .then((r) => r.json())
      .then((j) => { if (j?.success && Array.isArray(j.data)) setBanners(j.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      fetchChefs(search, true);
    }, 450);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [fetchChefs, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSession();
    await fetchChefs(search, true);
  }, [fetchChefs, loadSession, search]);

  const toggleFavorite = useCallback(
    async (chefId: string) => {
      if (!favoriteKey) {
        router.push("/login" as never);
        return;
      }

      const nextFavorites = favorites.includes(chefId)
        ? favorites.filter((id) => id !== chefId)
        : [...favorites, chefId];

      setFavorites(nextFavorites);
      await AsyncStorage.setItem(favoriteKey, JSON.stringify(nextFavorites));
    },
    [favoriteKey, favorites, router]
  );

  const openChef = useCallback(
    (chefId: string) => {
      router.push(`/chef/${chefId}` as never);
    },
    [router]
  );

  const openSection = useCallback(
    (categoryId: string) => {
      router.push({
        pathname: "/(tabs)/categories",
        params: { category: categoryId },
      } as any);
    },
    [router]
  );

  const ListHeader = useCallback(() => {
    return (
      <View>
        <View style={s.hero}>
          <Text style={s.heroTitle}>من بيتنا لبيتك</Text>

          <View style={s.searchWrap}>
            <Search size={18} color="#F2B233" strokeWidth={1.8} />
            <TextInput
              style={s.searchInput}
              placeholder="ابحث عن شيف أو طبق..."
              placeholderTextColor="#7C6145"
              value={search}
              onChangeText={setSearch}
              textAlign="right"
              returnKeyType="search"
            />
            {searching ? <ActivityIndicator size="small" color="#F2B233" /> : null}
          </View>
        </View>

        {banners.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.bannersRow}
            contentContainerStyle={s.bannersContent}
          >
            {banners.map((b) => (
              <TouchableOpacity
                key={b.id}
                activeOpacity={b.target ? 0.85 : 1}
                onPress={() => { if (b.target) router.push(b.target as any); }}
                style={[
                  s.bannerCard,
                  { backgroundColor: b.bg_color },
                  banners.length === 1 && s.bannerCardFull,
                ]}
              >
                <Text style={[s.bannerTitle, { color: b.text_color }]}>{b.title}</Text>
                {b.subtitle ? (
                  <Text style={[s.bannerSub, { color: b.text_color }]}>{b.subtitle}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={s.sectionsRow}>
          {SECTIONS.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              activeOpacity={0.85}
              style={[s.sectionCard, { backgroundColor: sec.bg }]}
              onPress={() => openSection(sec.category)}
            >
              <View style={[s.sectionIconWrap, { borderColor: `${sec.color}44` }]}>
                <sec.Icon size={20} color={sec.color} strokeWidth={1.8} />
              </View>
              <Text style={[s.sectionLabel, { color: sec.color }]}>
                {sec.label}
              </Text>
              <Text style={s.sectionSub}>{sec.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Flame size={18} color="#F2B233" />
            <Text style={s.statValue}>{chefs.length}</Text>
            <Text style={s.statLabel}>أسرة منتجة</Text>
          </View>

          <View style={s.statCard}>
            <Award size={18} color="#F2B233" />
            <Text style={s.statValue}>
              {chefs.filter((chef) => getChefStatus(chef) !== "closed").length}
            </Text>
            <Text style={s.statLabel}>متاح الآن</Text>
          </View>
        </View>

        <View style={s.secHeader}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => openSection("all")}>
            <Text style={s.secMore}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={s.secTitle}>الأكثر طلبًا</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.topList}
        >
          {mostOrderedChefs.map((chef) => (
            <TouchableOpacity
              key={chef.id}
              activeOpacity={0.88}
              style={s.topCard}
              onPress={() => openChef(chef.id)}
            >
              <View style={s.topImgWrap}>
                <View style={[s.topImg, s.topImgPlaceholder]}>
                  <UtensilsCrossed size={30} color="#5A3A18" strokeWidth={1.5} />
                </View>

                <View style={s.topRatingBadge}>
                  <Star size={10} color="#F2B233" fill="#F2B233" />
                  <Text style={s.topRatingText}>
                    {safeNumber(chef.rating_avg, "0")}
                  </Text>
                </View>
              </View>

              <Text style={s.topChefName} numberOfLines={1}>
                {safeText(chef.users?.full_name, "أسرة منتجة")}
              </Text>
              <Text style={s.topChefBy} numberOfLines={1}>
                {safeText(chef.city, "")}
              </Text>
              <Text style={s.topPrice}>{safeNumber(chef.total_orders, "0")} طلب</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.secHeader}>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={s.secMore}>الأقرب لك</Text>
          </TouchableOpacity>
          <Text style={s.secTitle}>الأسر المميزة</Text>
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
            <Text style={s.errorTitle}>حدثت مشكلة</Text>
            <Text style={s.errorText}>{error}</Text>
            <Text style={s.errorRetry}>اضغط لإعادة المحاولة</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [chefs, error, mostOrderedChefs, onRefresh, openChef, openSection, search, searching]);

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      const isFavorite = favorites.includes(item.id);
      const city = safeText(item.city, "المدينة");
      const neighborhood = safeText(item.neighborhood, "الحي");
      const fullName = safeText(item.users?.full_name, "أسرة منتجة");
      const statusKey = getChefStatus(item);
      const statusUi = CHEF_STATUS_UI[statusKey];

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          style={s.chefCard}
          onPress={() => openChef(item.id)}
        >
          <View style={s.chefAvatarWrap}>
            <UtensilsCrossed size={24} color="#F2B233" strokeWidth={1.5} />
          </View>

          <View style={s.chefInfo}>
            <View style={s.chefNameRow}>
              <Text style={s.chefName} numberOfLines={1}>
                {fullName}
              </Text>
              <View style={[s.statusPill, { backgroundColor: statusUi.bg }]}>
                <View style={[s.statusDot, { backgroundColor: statusUi.dot }]} />
                <Text style={[s.statusText, { color: statusUi.text }]}>
                  {statusUi.label}
                </Text>
              </View>
            </View>

            <View style={s.chefCityRow}>
              <MapPin size={12} color="#8A6030" strokeWidth={1.5} />
              <Text style={s.chefCity} numberOfLines={1}>
                {city} · {neighborhood}
              </Text>
            </View>

            <View style={s.chefMeta}>
              <Star size={12} color="#F2B233" fill="#F2B233" />
              <Text style={s.chefRating}>
                {safeNumber(item.rating_avg, "0")}
              </Text>
              <Text style={s.chefOrders}>
                {safeNumber(item.total_orders, "0")} طلب
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={s.favBtn}
            onPress={() => toggleFavorite(item.id)}
          >
            <Heart
              size={20}
              color="#F2B233"
              fill={isFavorite ? "#F2B233" : "transparent"}
              strokeWidth={1.8}
            />
          </TouchableOpacity>

          <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8} />
        </TouchableOpacity>
      );
    },
    [favorites, openChef, toggleFavorite]
  );

  if (!fontsLoaded) {
    return (
      <View style={s.safe}>
        <ActivityIndicator color="#F2B233" style={{ marginTop: 120 }} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تجهيز زعفران...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <FlatList
        data={chefs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={ListHeader}
        renderItem={renderChef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F2B233"
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <UtensilsCrossed size={54} color="#5A3A18" strokeWidth={1.5} />
            <Text style={s.emptyTitle}>ما لقينا نتائج</Text>
            <Text style={s.emptyText}>جرّب تبحث باسم شيف أو طبق مختلف.</Text>
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
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    padding: 12,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.13)",
  },

  heroTitle: {
    color: "#FDF0DC",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "right",
    marginBottom: 8,
    fontFamily: "Almarai_800ExtraBold",
  },

  heroSub: {
    color: "#A98961",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    marginTop: 3,
    marginBottom: 10,
    fontFamily: "Almarai_400Regular",
  },

  bannersRow: { marginBottom: 4 },
  bannersContent: { paddingHorizontal: 16, gap: 10, flexDirection: "row-reverse" },
  bannerCard: {
    width: 290,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.15)",
  },
  bannerCardFull: {
    width: Dimensions.get("window").width - 32,
  },
  bannerTitle: { fontSize: 15, textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  bannerSub: { fontSize: 12, textAlign: "right", marginTop: 5, opacity: 0.9, fontFamily: "Almarai_400Regular" },

  searchWrap: {
    minHeight: 40,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#17100B",
    borderRadius: 16,
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

  sectionsRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },

  sectionCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: "Almarai_800ExtraBold",
    textAlign: "center",
  },

  sectionSub: {
    marginTop: 3,
    fontSize: 9,
    color: "#8A6030",
    fontFamily: "Almarai_400Regular",
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  statValue: {
    color: "#FDF0DC",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  statLabel: {
    color: "#8A6030",
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  secHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },

  secTitle: {
    fontSize: 17,
    color: "#FDF0DC",
    fontFamily: "Almarai_800ExtraBold",
  },

  secMore: {
    fontSize: 12,
    color: "#F2B233",
    fontFamily: "Almarai_700Bold",
  },

  topList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },

  topCard: {
    width: 142,
    backgroundColor: "#21160D",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
  },

  topImgWrap: {
    position: "relative",
  },

  topImg: {
    width: 142,
    height: 112,
    resizeMode: "cover",
  },

  topImgPlaceholder: {
    backgroundColor: "#2A1E00",
    alignItems: "center",
    justifyContent: "center",
  },

  topRatingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(23,16,11,0.88)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.16)",
  },

  topRatingText: {
    fontSize: 10,
    color: "#F2B233",
    fontFamily: "Almarai_700Bold",
  },

  topChefName: {
    fontSize: 13,
    color: "#FDF0DC",
    textAlign: "right",
    paddingHorizontal: 10,
    paddingTop: 9,
    fontFamily: "Almarai_800ExtraBold",
  },

  topChefBy: {
    fontSize: 10,
    color: "#8A6030",
    textAlign: "right",
    paddingHorizontal: 10,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  topPrice: {
    fontSize: 13,
    color: "#F2B233",
    textAlign: "right",
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 5,
    fontFamily: "Almarai_800ExtraBold",
  },

  banner: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: "#2A1E00",
    borderRadius: 26,
    padding: 18,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.15)",
  },

  bannerContent: {
    flex: 1,
    alignItems: "flex-end",
  },

  bannerKicker: {
    fontSize: 10,
    color: "#A98961",
    fontFamily: "Almarai_700Bold",
    marginBottom: 3,
  },

  bannerTitle: {
    fontSize: 19,
    color: "#F2B233",
    fontFamily: "Almarai_800ExtraBold",
    marginBottom: 4,
    textAlign: "right",
  },

  bannerSub: {
    fontSize: 12,
    color: "#A98961",
    fontFamily: "Almarai_400Regular",
    marginBottom: 12,
    textAlign: "right",
  },

  bannerBtn: {
    backgroundColor: "#F2B233",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  bannerBtnText: {
    fontSize: 12,
    color: "#17100B",
    fontFamily: "Almarai_800ExtraBold",
  },

  bannerIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#321717",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.25)",
  },

  errorTitle: {
    color: "#FFB0B0",
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorText: {
    color: "#FFCECE",
    textAlign: "right",
    marginTop: 5,
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  errorRetry: {
    color: "#F2B233",
    textAlign: "right",
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  chefCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#21160D",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
    gap: 11,
  },

  chefAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.16)",
  },

  chefInfo: {
    flex: 1,
  },

  chefNameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
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

  chefCityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginBottom: 7,
  },

  chefCity: {
    flex: 1,
    fontSize: 11,
    color: "#8A6030",
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  chefMeta: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
  },

  chefRating: {
    fontSize: 12,
    color: "#F2B233",
    fontFamily: "Almarai_700Bold",
  },

  chefOrders: {
    fontSize: 11,
    color: "#6D4E2D",
    fontFamily: "Almarai_400Regular",
  },

  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.07)",
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 56,
    gap: 9,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    textAlign: "center",
    color: "#FDF0DC",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptyText: {
    textAlign: "center",
    color: "#8A6030",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },
});