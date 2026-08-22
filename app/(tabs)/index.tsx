import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
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
  Store,
  X,
} from "lucide-react-native";
import {
  useFonts,
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";
const SUPPORT_WHATSAPP = "966544633113";

const SCREEN_W = Dimensions.get("window").width;
const BANNER_W = SCREEN_W - 32;          // بانر واحد بعرض الشاشة ناقص الهوامش
const BANNER_GAP = 10;
const BANNER_SNAP = BANNER_W + BANNER_GAP;
const BANNER_INTERVAL = 4500;            // مدة بقاء البانر قبل الانتقال التلقائي

type MenuItem = {
  id?: string;
  name?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  category?: string | null;
  status?: string | null;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  bg_color: string;
  text_color: string;
  target: string | null;
};

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
  menu?: MenuItem[] | null;
};

// المسميات هنا يجب أن تطابق شاشة التصنيفات حرفياً — أي اختلاف يربك المستخدم
const SECTIONS = [
  {
    id: "kitchen",
    category: "popular",
    label: "الطبخ",
    sub: "أطباق ومقبلات",
    color: "#F2B233",
    bg: "#2A1E00",
    Icon: Flame,
  },
  {
    id: "sweets",
    category: "sweets",
    label: "الحلا",
    sub: "حلويات وكيك",
    color: "#E8A0BF",
    bg: "#2A1220",
    Icon: Cake,
  },
  {
    id: "pastries",
    category: "pastries",
    label: "المعجنات",
    sub: "فطائر ومخبوزات",
    color: "#A8D8A8",
    bg: "#0F2A0F",
    Icon: Croissant,
  },
  {
    id: "drinks",
    category: "drinks",
    label: "القهوة",
    sub: "قهوة ومشروبات",
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

// أول صورة منتج متاحة — بديل صورة الغلاف غير الموجودة في جدول chefs
function chefImage(chef: Chef): string | null {
  const withImage = chef.menu?.find((item) => Boolean(item.image_url));
  return withImage?.image_url || null;
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  شريط البانرات: تدوير تلقائي + سحب بالإصبع + نقاط مؤشر
//  ملاحظة RTL: القائمة معكوسة بصرياً، لذا نحسب المؤشر من اليمين
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BannerCarousel({ banners }: { banners: Banner[] }) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  // السحب اليدوي يوقف التدوير التلقائي مؤقتاً حتى لا يقاطع المستخدم
  const pausedUntil = useRef(0);

  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;

    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;

      setIndex((prev) => {
        const next = (prev + 1) % count;
        scrollRef.current?.scrollTo({ x: next * BANNER_SNAP, animated: true });
        return next;
      });
    }, BANNER_INTERVAL);

    return () => clearInterval(timer);
  }, [count]);

  const onScrollEnd = useCallback((e: any) => {
    const x = e?.nativeEvent?.contentOffset?.x || 0;
    const current = Math.round(x / BANNER_SNAP);
    setIndex(Math.max(0, Math.min(current, count - 1)));
    // ثمانية ثوان هدنة بعد كل سحب يدوي
    pausedUntil.current = Date.now() + 8000;
  }, [count]);

  if (count === 0) return null;

  return (
    <View style={s.bannersWrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        onScrollBeginDrag={() => { pausedUntil.current = Date.now() + 8000; }}
        contentContainerStyle={s.bannersContent}
      >
        {banners.map((b) => (
          <View
            key={b.id}
            style={[s.bannerCard, { backgroundColor: b.bg_color }]}
          >
            <Text style={[s.bannerTitle, { color: b.text_color }]} numberOfLines={1}>
              {b.title}
            </Text>
            {b.subtitle ? (
              <Text style={[s.bannerSub, { color: b.text_color }]} numberOfLines={2}>
                {b.subtitle}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {count > 1 ? (
        <View style={s.dotsRow}>
          {banners.map((b, i) => (
            <View
              key={b.id}
              style={[s.dot, i === index && s.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

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
  const [banners, setBanners] = useState<Banner[]>([]);

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

  const notifyMeOnLaunch = useCallback(async () => {
    const message = "مرحباً، أبي تنبيه أول ما تفتح متاجر زعفران في منطقتي.";
    const waUrl  = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(waUrl);
    } catch {
      Alert.alert("تنبيه", `راسلنا على الرقم:\n0${SUPPORT_WHATSAPP.slice(3)}`);
    }
  }, []);

  const ListHeader = useMemo(() => {
    // لا متاجر ولا بحث: نخفي الإحصائيات والشرائط الفارغة ونترك رسالة الافتتاح وحدها
    if (chefs.length === 0 && !search.trim()) return null;

    return (
      <View>
        <BannerCarousel banners={banners} />

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
              <Text
                style={[s.sectionLabel, { color: sec.color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {sec.label}
              </Text>
              <Text style={s.sectionSub} numberOfLines={1} adjustsFontSizeToFit>
                {sec.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Store size={18} color="#F2B233" />
            <Text style={s.statValue}>{chefs.length}</Text>
            <Text style={s.statLabel}>متجر</Text>
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
          {mostOrderedChefs.map((chef) => {
            const cover = chefImage(chef);

            return (
              <TouchableOpacity
                key={chef.id}
                activeOpacity={0.88}
                style={s.topCard}
                onPress={() => openChef(chef.id)}
              >
                <View style={s.topImgWrap}>
                  {cover ? (
                    <Image source={{ uri: cover }} style={s.topImg} />
                  ) : (
                    <View style={[s.topImg, s.topImgPlaceholder]}>
                      <Store size={30} color="#5A3A18" strokeWidth={1.5} />
                    </View>
                  )}

                  <View style={s.topRatingBadge}>
                    <Star size={10} color="#F2B233" fill="#F2B233" />
                    <Text style={s.topRatingText}>
                      {safeNumber(chef.rating_avg, "0")}
                    </Text>
                  </View>
                </View>

                <Text style={s.topChefName} numberOfLines={1}>
                  {safeText(chef.users?.full_name, "متجر")}
                </Text>
                <Text style={s.topChefBy} numberOfLines={1}>
                  {safeText(chef.city, "")}
                </Text>
                <Text style={s.topPrice}>{safeNumber(chef.total_orders, "0")} طلب</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.secHeader}>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={s.secMore}>الأقرب لك</Text>
          </TouchableOpacity>
          <Text style={s.secTitle}>متاجر مميزة</Text>
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
  }, [banners, chefs, error, mostOrderedChefs, onRefresh, openChef, openSection, search]);

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      const isFavorite = favorites.includes(item.id);
      const city = safeText(item.city, "المدينة");
      const neighborhood = safeText(item.neighborhood, "الحي");
      const fullName = safeText(item.users?.full_name, "متجر");
      const statusKey = getChefStatus(item);
      const statusUi = CHEF_STATUS_UI[statusKey];
      const cover = chefImage(item);

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          style={s.chefCard}
          onPress={() => openChef(item.id)}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={s.chefAvatarImg} />
          ) : (
            <View style={s.chefAvatarWrap}>
              <Store size={24} color="#F2B233" strokeWidth={1.5} />
            </View>
          )}

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

  return (
    <View style={s.safe}>
      {/* البحث خارج FlatList — داخله كان يُعاد بناؤه مع كل حرف فيختفي الكيبورد */}
      <View style={s.hero}>
        <Text style={s.heroTitle}>من بيتنا لبيتك</Text>

        <View style={s.searchWrap}>
          <Search size={18} color="#F2B233" strokeWidth={1.8} />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث عن متجر أو منتج..."
            placeholderTextColor="#7C6145"
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator size="small" color="#F2B233" /> : null}
          {!searching && search.trim() ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setSearch("")}>
              <X size={17} color="#8A6030" strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تجهيز زعفران...</Text>
        </View>
      ) : (
        <FlatList
          data={chefs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={ListHeader}
          renderItem={renderChef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F2B233"
            />
          }
          ListEmptyComponent={
            search.trim() ? (
              <View style={s.emptyWrap}>
                <Store size={54} color="#5A3A18" strokeWidth={1.5} />
                <Text style={s.emptyTitle}>ما لقينا نتائج</Text>
                <Text style={s.emptyText}>جرّب تبحث باسم متجر أو منتج مختلف.</Text>
              </View>
            ) : (
              <View style={s.launchWrap}>
                <View style={s.launchIcon}>
                  <Store size={44} color="#F2B233" strokeWidth={1.4} />
                </View>

                <Text style={s.launchTitle}>زعفران يستقبل متاجره الأولى</Text>

                <Text style={s.launchText}>
                  لديك منتج بيتي — طبخ، حلا، معجنات، قهوة، أو مؤن؟ سجّل متجرك اليوم وكن من الأوائل في القصيم.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={s.launchPrimaryBtn}
                  onPress={() => router.push("/login?step=chef_register" as never)}
                >
                  <Text style={s.launchPrimaryText}>سجّل متجرك</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={s.launchGhostBtn}
                  onPress={notifyMeOnLaunch}
                >
                  <Text style={s.launchGhostText}>نبّهني عند الافتتاح</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
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

  // ━━ شريط البانرات ━━
  bannersWrap: {
    marginBottom: 12,
  },

  bannersContent: {
    paddingHorizontal: 16,
    gap: BANNER_GAP,
  },

  bannerCard: {
    width: BANNER_W,
    minHeight: 92,
    borderRadius: 20,
    padding: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },

  bannerTitle: {
    fontSize: 17,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  bannerSub: {
    fontSize: 12,
    lineHeight: 20,
    textAlign: "right",
    marginTop: 6,
    opacity: 0.92,
    fontFamily: "Almarai_400Regular",
  },

  dotsRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(242,178,51,0.25)",
  },

  dotActive: {
    width: 18,
    backgroundColor: "#F2B233",
  },

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
    gap: 8,
    marginBottom: 10,
  },

  sectionCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 5,
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
    backgroundColor: "#2A1E00",
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

  chefAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#2A1E00",
    resizeMode: "cover",
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

  launchWrap: {
    alignItems: "center",
    marginTop: 34,
    paddingHorizontal: 26,
  },

  launchIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  launchTitle: {
    textAlign: "center",
    color: "#FDF0DC",
    fontSize: 18,
    lineHeight: 30,
    fontFamily: "Almarai_800ExtraBold",
  },

  launchText: {
    textAlign: "center",
    color: "#A98961",
    fontSize: 13,
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 22,
    fontFamily: "Almarai_400Regular",
  },

  launchPrimaryBtn: {
    minWidth: 210,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: "#F2B233",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  launchPrimaryText: {
    color: "#17100B",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  launchGhostBtn: {
    minWidth: 210,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 24,
  },

  launchGhostText: {
    color: "#F2B233",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
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