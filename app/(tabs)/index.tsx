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
import { clearToken } from "@/utils/authFetch";
import {
  Award,
  ChevronLeft,
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

import { TRACKS, itemMatchesTrack, tone, type TrackId } from "@/constants/categories";
import { useTheme, type Colors } from "@/context/ThemeContext";
import { useLang } from "@/context/LanguageContext";
import { t as dict } from "@/constants/i18n";

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

type Offer = {
  id: string;
  menu_item_id?: string | null;
  title?: string | null;
  discount_type?: "percent" | "fixed" | null;
  discount_value?: number | string | null;
  max_discount_amount?: number | string | null;
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
  is_live?: boolean | null;
  live_url?: string | null;
  tier?: { id: string; label: string; color: string; show_badge: boolean } | null;
  offers?: Offer[] | null;
};

// المسميات هنا يجب أن تطابق شاشة التصنيفات حرفياً — أي اختلاف يربك المستخدم
// المسارات من المصدر الموحّد constants/categories

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
// أولوية عرض المنتج على عرض المتجر العام — مطابقة لما يفعله الخادم حرفياً
function offerFor(chef: Chef, menuItemId?: string | null): Offer | null {
  const list = Array.isArray(chef.offers) ? chef.offers : [];
  if (list.length === 0) return null;

  return (
    list.find((o) => o.menu_item_id && o.menu_item_id === menuItemId) ||
    list.find((o) => !o.menu_item_id) ||
    null
  );
}

function priceAfterOffer(basePrice: number, offer: Offer | null): number {
  if (!offer) return basePrice;

  let off =
    offer.discount_type === "percent"
      ? basePrice * (Number(offer.discount_value || 0) / 100)
      : Number(offer.discount_value || 0);

  if (offer.max_discount_amount != null) {
    off = Math.min(off, Number(offer.max_discount_amount));
  }

  const final = basePrice - off;
  return final > 0 ? Math.round(final * 100) / 100 : basePrice;
}

// شارة الخصم على بطاقة المتجر — أعلى خصم متاح فيه
function bestDiscountLabel(chef: Chef): string | null {
  const list = Array.isArray(chef.offers) ? chef.offers : [];
  if (list.length === 0) return null;

  const percents = list
    .filter((o) => o.discount_type === "percent")
    .map((o) => Number(o.discount_value || 0));

  if (percents.length > 0) {
    return `خصم ${Math.max(...percents)}%`;
  }

  const fixed = list.map((o) => Number(o.discount_value || 0));
  return `خصم ${Math.max(...fixed)} ر.س`;
}

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
  open:     { bgKey: "successSoft", dotKey: "success", textKey: "success", label: "متاح" },
  preorder: { bgKey: "goldSoft",    dotKey: "gold",    textKey: "gold",    label: "حجز مسبق" },
  closed:   { bgKey: "dangerSoft",  dotKey: "danger",  textKey: "danger",  label: "مغلق" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  شريط البانرات: تدوير تلقائي + سحب بالإصبع + نقاط مؤشر
//  ملاحظة RTL: القائمة معكوسة بصرياً، لذا نحسب المؤشر من اليمين
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BannerCarousel({ banners }: { banners: Banner[] }) {
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
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
  const { c, isDark } = useTheme();
  const { lang } = useLang();
  const tr = useMemo(() => dict(lang), [lang]);
  const s = useMemo(() => make_s(c), [c]);

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

  // المتاجر التي تبث الآن — الخادم يوقف البث تلقائياً بعد أربع ساعات
  const liveChefs = useMemo(
    () => chefs.filter((chef) => Boolean(chef.is_live)),
    [chefs]
  );

  // متاجر كل مسار — المتجر ينتمي للمسار إن كان لديه منتج واحد على الأقل من تصنيفاته
  const chefsByTrack = useMemo(() => {
    const map: Record<string, Chef[]> = { now: [], occasion: [], pantry: [] };

    chefs.forEach((chef) => {
      const menu = Array.isArray(chef.menu) ? chef.menu : [];

      TRACKS.forEach((track) => {
        if (menu.some((it) => itemMatchesTrack(it?.category, track.id))) {
          map[track.id].push(chef);
        }
      });
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    });

    return map;
  }, [chefs]);

  // منتجات البطاقة: المتاح أولًا ثم الحجز المسبق ثم غير المتاح — بحد أقصى ستة
  const cardItems = useCallback((chef: Chef) => {
    const menu = Array.isArray(chef.menu) ? chef.menu : [];
    const rank = (st?: string | null) =>
      st === "available" ? 0 : st === "preorder" ? 1 : 2;

    return [...menu].sort((a, b) => rank(a?.status) - rank(b?.status)).slice(0, 6);
  }, [])

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
      await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role", "cart_state"]);
      clearToken();
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
      // إحداثيات العنوان المختار — الخادم يحتسب بها القرب في ترتيب المتاجر
      const [[, uLat], [, uLng]] = await AsyncStorage.multiGet([
        "last_address_lat",
        "last_address_lng",
      ]);

      const geo = uLat && uLng ? `lat=${uLat}&lng=${uLng}` : "";

      const endpoint = query.trim()
        ? `${API}/api/chefs/search?q=${encodeURIComponent(query.trim())}`
        : `${API}/api/chefs${geo ? `?${geo}` : ""}`;

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

  const openLive = useCallback(
    (chef: Chef) => {
      const url = String(chef.live_url || "").trim();

      // لا رابط أو تعذّر الفتح: نفتح صفحة المتجر بدل أن نترك الضغطة بلا نتيجة
      if (!url) {
        openChef(chef.id);
        return;
      }

      Linking.openURL(url).catch(() => openChef(chef.id));
    },
    [openChef]
  );

  const openTrack = useCallback(
    (trackId: TrackId) => {
      router.push({
        pathname: "/(tabs)/categories",
        params: { track: trackId, category: "all" },
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
    // لا متاجر إطلاقًا: نخفي الإحصائيات والشرائط الفارغة (سواء كان هناك بحث أو لا)
    if (chefs.length === 0) return null;

    return (
      <View>
        <BannerCarousel banners={banners} />

        <View style={s.sectionsRow}>
          {TRACKS.map((track) => (
            <TouchableOpacity
              key={track.id}
              activeOpacity={0.85}
              style={[s.sectionCard, { borderColor: `${tone(track, isDark)}55` }]}
              onPress={() => openTrack(track.id)}
            >
              <View style={[s.sectionIconWrap, { borderColor: `${tone(track, isDark)}66` }]}>
                <track.Icon size={22} color={tone(track, isDark)} strokeWidth={1.8} />
              </View>
              <Text
                style={[s.sectionLabel, { color: tone(track, isDark) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {track.id === "now" ? tr.trackNow : track.id === "occasion" ? tr.trackOccasion : tr.trackPantry}
              </Text>
              <Text style={s.sectionSub} numberOfLines={1} adjustsFontSizeToFit>
                {track.id === "now" ? tr.trackNowSub : track.id === "occasion" ? tr.trackOccasionSub : tr.trackPantrySub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Store size={18} color={c.gold} />
            <Text style={s.statValue}>{chefs.length}</Text>
            <Text style={s.statLabel}>متجر</Text>
          </View>

          <View style={s.statCard}>
            <Award size={18} color={c.gold} />
            <Text style={s.statValue}>
              {chefs.filter((chef) => getChefStatus(chef) !== "closed").length}
            </Text>
            <Text style={s.statLabel}>متاح الآن</Text>
          </View>
        </View>

        {liveChefs.length > 0 ? (
          <View>
            <View style={s.secHeader}>
              <View />
              <View style={s.liveTitleRow}>
                <View style={s.liveDot} />
                <Text style={s.liveSecTitle}>{tr.liveNow}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.railFixed}
              contentContainerStyle={s.topList}
            >
              {liveChefs.map((chef) => {
                const cover = chefImage(chef);

                return (
                  <TouchableOpacity
                    key={`live-${chef.id}`}
                    activeOpacity={0.88}
                    style={s.topCard}
                    onPress={() => openChef(chef.id)}
                  >
                    <View style={[s.topImgWrap, s.liveImgWrap]}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={s.topImg} />
                      ) : (
                        <View style={[s.topImg, s.topImgPlaceholder]}>
                          <Store size={30} color={c.textMuted} strokeWidth={1.5} />
                        </View>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={s.liveBadge}
                        onPress={() => openLive(chef)}
                      >
                        <View style={s.liveBadgeDot} />
                        <Text style={s.liveBadgeText}>{tr.watchLive}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={s.topChefName} numberOfLines={1}>
                      {safeText(chef.users?.full_name, "متجر")}
                    </Text>
                    <Text style={s.topChefBy} numberOfLines={1}>
                      {safeText(chef.city, "")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {TRACKS.map((track) => {
          const list = chefsByTrack[track.id] || [];
          if (list.length === 0) return null;

          return (
            <View key={`rail-${track.id}`}>
              <View style={s.secHeader}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => openTrack(track.id)}>
                  <Text style={s.secMore}>{tr.seeAll}</Text>
                </TouchableOpacity>
                <Text style={[s.secTitle, { color: tone(track, isDark) }]}>
                  {track.id === "now" ? tr.trackNow : track.id === "occasion" ? tr.trackOccasion : tr.trackPantry}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.railFixed}
                contentContainerStyle={s.topList}
              >
                {list.map((chef) => {
                  const cover = chefImage(chef);

                  return (
                    <TouchableOpacity
                      key={`${track.id}-${chef.id}`}
                      activeOpacity={0.88}
                      style={s.topCard}
                      onPress={() => openChef(chef.id)}
                    >
                      <View style={s.topImgWrap}>
                        {cover ? (
                          <Image source={{ uri: cover }} style={s.topImg} />
                        ) : (
                          <View style={[s.topImg, s.topImgPlaceholder]}>
                            <Store size={30} color={c.textMuted} strokeWidth={1.5} />
                          </View>
                        )}

                        <View style={s.topRatingBadge}>
                          <Star size={10} color={c.gold} fill={c.gold} />
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
                      <Text style={s.topPrice}>
                        {safeNumber(chef.total_orders, "0")} طلب
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}

        {chefs.length > 0 ? (
          <View style={s.secHeader}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => openTrack("now")}>
              <Text style={s.secMore}>{tr.nearYou}</Text>
            </TouchableOpacity>
            <Text style={s.secTitle}>{tr.allStores}</Text>
          </View>
        ) : null}

        {error ? (
          <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
            <Text style={s.errorTitle}>حدثت مشكلة</Text>
            <Text style={s.errorText}>{error}</Text>
            <Text style={s.errorRetry}>اضغط لإعادة المحاولة</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [c, s, tr, isDark, banners, chefs, chefsByTrack, liveChefs, error, onRefresh, openChef, openLive, openTrack, search]);

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      const isFavorite = favorites.includes(item.id);
      const city = safeText(item.city, "المدينة");
      const neighborhood = safeText(item.neighborhood, "الحي");
      const fullName = safeText(item.users?.full_name, "متجر");
      const statusKey = getChefStatus(item);
      const statusUi = CHEF_STATUS_UI[statusKey];
      const cover = chefImage(item);

      const items = cardItems(item);
      const discountLabel = bestDiscountLabel(item);

      return (
        <View style={s.chefCardWrap}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={s.chefCard}
          onPress={() => openChef(item.id)}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={s.chefAvatarImg} />
          ) : (
            <View style={s.chefAvatarWrap}>
              <Store size={24} color={c.gold} strokeWidth={1.5} />
            </View>
          )}

          <View style={s.chefInfo}>
            <View style={s.chefNameRow}>
              <Text style={s.chefName} numberOfLines={1}>
                {fullName}
              </Text>
              <View style={[s.statusPill, { backgroundColor: c[statusUi.bgKey as keyof typeof c] }]}>
                <View style={[s.statusDot, { backgroundColor: c[statusUi.dotKey as keyof typeof c] }]} />
                <Text style={[s.statusText, { color: c[statusUi.textKey as keyof typeof c] }]}>
                  {statusUi.label}
                </Text>
              </View>
            </View>

            <View style={s.chefCityRow}>
              <MapPin size={12} color={c.textSoft} strokeWidth={1.5} />
              <Text style={s.chefCity} numberOfLines={1}>
                {city} · {neighborhood}
              </Text>
            </View>

            <View style={s.chefMeta}>
              <Star size={12} color={c.gold} fill={c.gold} />
              <Text style={s.chefRating}>
                {safeNumber(item.rating_avg, "0")}
              </Text>
              <Text style={s.chefOrders}>
                {safeNumber(item.total_orders, "0")} طلب
              </Text>

              {item.tier?.show_badge ? (
                <View style={[s.tierBadge, { borderColor: item.tier.color }]}>
                  <Text style={[s.tierBadgeText, { color: item.tier.color }]}>
                    {item.tier.label}
                  </Text>
                </View>
              ) : null}

              {discountLabel ? (
                <View style={s.discountBadge}>
                  <Text style={s.discountBadgeText}>{discountLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={s.favBtn}
            onPress={() => toggleFavorite(item.id)}
          >
            <Heart
              size={20}
              color={c.gold}
              fill={isFavorite ? c.gold : "transparent"}
              strokeWidth={1.8}
            />
          </TouchableOpacity>

          <ChevronLeft size={18} color={c.textMuted} strokeWidth={1.8} />
        </TouchableOpacity>

        {items.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.railFixed}
            contentContainerStyle={s.itemStrip}
          >
            {items.map((it) => {
              const off  = it?.status === "unavailable";
              const base = Number(it?.price || 0);
              const cut  = priceAfterOffer(base, offerFor(item, it?.id));
              const hasCut = cut < base;

              return (
                <TouchableOpacity
                  key={it.id}
                  activeOpacity={0.85}
                  style={[s.itemCard, off && s.itemCardOff]}
                  onPress={() => openChef(item.id)}
                >
                  {it.image_url ? (
                    <Image source={{ uri: it.image_url }} style={s.itemImg} />
                  ) : (
                    <View style={[s.itemImg, s.itemImgPlaceholder]}>
                      <Store size={18} color={c.textMuted} strokeWidth={1.5} />
                    </View>
                  )}

                  <Text style={s.itemName} numberOfLines={1}>
                    {safeText(it.name, "منتج")}
                  </Text>

                  {off ? (
                    <Text style={s.itemPrice}>{tr.unavailable}</Text>
                  ) : hasCut ? (
                    <View style={s.priceRow}>
                      <Text style={s.itemPrice}>{cut} ر.س</Text>
                      <Text style={s.itemPriceOld}>{base}</Text>
                    </View>
                  ) : (
                    <Text style={s.itemPrice}>{`${safeNumber(it.price, "0")} ر.س`}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
        </View>
      );
    },
    [c, s, tr, cardItems, favorites, openChef, toggleFavorite]
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
      {/* البحث خارج FlatList — داخله كان يُعاد بناؤه مع كل حرف فيختفي الكيبورد */}
      <View style={s.hero}>
        <Text style={s.heroTitle}>من بيتنا لبيتك</Text>

        <View style={s.searchWrap}>
          <Search size={18} color={c.gold} strokeWidth={1.8} />
          <TextInput
            style={s.searchInput}
            placeholder={tr.searchPlaceholder}
            placeholderTextColor={c.textMuted}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator size="small" color={c.gold} /> : null}
          {!searching && search.trim() ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setSearch("")}>
              <X size={17} color={c.textSoft} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
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
              tintColor={c.gold}
            />
          }
          ListEmptyComponent={
            search.trim() ? (
              <View style={s.emptyWrap}>
                <Store size={54} color={c.textMuted} strokeWidth={1.5} />
                <Text style={s.emptyTitle}>{tr.noResults}</Text>
                <Text style={s.emptyText}>{tr.noResultsSub}</Text>
              </View>
            ) : (
              <View style={s.launchWrap}>
                <View style={s.launchIcon}>
                  <Store size={44} color={c.gold} strokeWidth={1.4} />
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

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
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
    color: c.text,
    fontSize: 14,
    fontFamily: "Almarai_700Bold",
  },

  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    padding: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },

  heroTitle: {
    color: c.text,
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
    borderColor: c.border,
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
    backgroundColor: c.goldBorder,
  },

  dotActive: {
    width: 18,
    backgroundColor: c.gold,
  },

  searchWrap: {
    minHeight: 40,
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: c.bg,
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },

  searchInput: {
    flex: 1,
    height: 44,
    color: c.text,
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
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
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
    color: c.textSoft,
    fontFamily: "Almarai_400Regular",
    textAlign: "center",
  },

  liveTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  liveSecTitle: { color: c.danger, fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger },
  liveImgWrap: { borderWidth: 2, borderColor: c.danger, borderRadius: 18 },
  liveBadge: { position: "absolute", bottom: 6, right: 6, flexDirection: "row-reverse", alignItems: "center", gap: 5, backgroundColor: c.danger, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  liveBadgeText: { color: "#FFFFFF", fontSize: 9.5, fontFamily: "Almarai_800ExtraBold" },

  chefCardWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: c.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },

  itemStrip: { flexDirection: "row-reverse", alignItems: "flex-start", paddingHorizontal: 12, paddingBottom: 12, gap: 9 },
  itemCard: { width: 78 },
  itemCardOff: { opacity: 0.45 },
  itemImg: { width: 78, height: 62, borderRadius: 12, backgroundColor: c.surfaceAlt },
  itemImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  itemName: { color: c.text, fontSize: 10.5, textAlign: "center", marginTop: 5, fontFamily: "Almarai_700Bold" },
  priceRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 },
  itemPriceOld: { color: c.textMuted, fontSize: 9.5, textDecorationLine: "line-through", fontFamily: "Almarai_400Regular" },
  tierBadge: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  tierBadgeText: { fontSize: 9.5, fontFamily: "Almarai_800ExtraBold" },
  discountBadge: { backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.danger, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  discountBadgeText: { color: c.danger, fontSize: 9.5, fontFamily: "Almarai_800ExtraBold" },
  itemPrice: { color: c.gold, fontSize: 11, textAlign: "center", fontFamily: "Almarai_800ExtraBold" },

  railFixed: {
    flexGrow: 0,
    flexShrink: 0,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  statValue: {
    color: c.text,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  statLabel: {
    color: c.textSoft,
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
    color: c.text,
    fontFamily: "Almarai_800ExtraBold",
  },

  secMore: {
    fontSize: 12,
    color: c.gold,
    fontFamily: "Almarai_700Bold",
  },

  topList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },

  topCard: {
    width: 142,
    backgroundColor: c.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.goldSoft,
  },

  topImgWrap: {
    position: "relative",
  },

  topImg: {
    width: 142,
    height: 112,
    resizeMode: "cover",
    backgroundColor: c.surfaceAlt,
  },

  topImgPlaceholder: {
    backgroundColor: c.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  topRatingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: c.bg,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  topRatingText: {
    fontSize: 10,
    color: c.gold,
    fontFamily: "Almarai_700Bold",
  },

  topChefName: {
    fontSize: 13,
    color: c.text,
    textAlign: "right",
    paddingHorizontal: 10,
    paddingTop: 9,
    fontFamily: "Almarai_800ExtraBold",
  },

  topChefBy: {
    fontSize: 10,
    color: c.textSoft,
    textAlign: "right",
    paddingHorizontal: 10,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  topPrice: {
    fontSize: 13,
    color: c.gold,
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
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
  },

  errorTitle: {
    color: c.danger,
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorText: {
    color: c.danger,
    textAlign: "right",
    marginTop: 5,
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  errorRetry: {
    color: c.gold,
    textAlign: "right",
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  chefCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    gap: 11,
  },

  chefAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  chefAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
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

  chefCityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginBottom: 7,
  },

  chefCity: {
    flex: 1,
    fontSize: 11,
    color: c.textSoft,
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
    color: c.gold,
    fontFamily: "Almarai_700Bold",
  },

  chefOrders: {
    fontSize: 11,
    color: c.textMuted,
    fontFamily: "Almarai_400Regular",
  },

  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  launchTitle: {
    textAlign: "center",
    color: c.text,
    fontSize: 18,
    lineHeight: 30,
    fontFamily: "Almarai_800ExtraBold",
  },

  launchText: {
    textAlign: "center",
    color: c.textSoft,
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
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  launchPrimaryText: {
    color: c.bg,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  launchGhostBtn: {
    minWidth: 210,
    minHeight: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 24,
  },

  launchGhostText: {
    color: c.gold,
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
    color: c.text,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptyText: {
    textAlign: "center",
    color: c.textSoft,
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },
});