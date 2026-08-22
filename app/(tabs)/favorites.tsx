import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AlertCircle,
  ChevronLeft,
  Heart,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
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
  rating_avg?: number | string | null;
  total_orders?: number | string | null;
  users?: {
    full_name?: string | null;
  } | null;
};

type UserSession = {
  id?: string | number | null;
  role?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

function text(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const clean = String(value).trim();
  return clean.length ? clean : fallback;
}

function num(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id)).filter(Boolean))];
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

  const [chefs, setChefs] = useState<Chef[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const favoriteKey = useMemo(() => {
    return userId ? `favorites_${userId}` : null;
  }, [userId]);

  const openLogin = useCallback(() => {
    router.push("/login" as any);
  }, [router]);

  const openHome = useCallback(() => {
    router.push("/(tabs)" as any);
  }, [router]);

  const openChef = useCallback(
    (chefId: string) => {
      router.push(`/chef/${chefId}` as any);
    },
    [router]
  );

  const loadFavorites = useCallback(
    async (silent = false) => {
      const currentRequest = ++requestId.current;

      if (!silent) setLoading(true);
      setError(null);

      try {
        const storedUser = await AsyncStorage.getItem("user");

        if (!storedUser) {
          setUserId(null);
          setFavoriteIds([]);
          setChefs([]);
          return;
        }

        let user: UserSession;

        try {
          user = JSON.parse(storedUser);
        } catch {
          await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
          setUserId(null);
          setFavoriteIds([]);
          setChefs([]);
          setError("جلسة الدخول غير صالحة. سجل دخولك مرة ثانية.");
          return;
        }

        const id = user?.id ? String(user.id) : null;

        if (!id) {
          setUserId(null);
          setFavoriteIds([]);
          setChefs([]);
          setError("لم يتم العثور على رقم المستخدم.");
          return;
        }

        setUserId(id);

        const key = `favorites_${id}`;
        const saved = await AsyncStorage.getItem(key);
        const ids = normalizeIds(saved ? JSON.parse(saved) : []);

        setFavoriteIds(ids);

        if (ids.length === 0) {
          setChefs([]);
          return;
        }

        const response = await fetch(`${API}/api/chefs`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();

        if (currentRequest !== requestId.current) return;

        if (!json?.success || !Array.isArray(json?.data)) {
          setChefs([]);
          setError("الخادم رجّع بيانات غير متوقعة.");
          return;
        }

        const foundChefs: Chef[] = json.data.filter((chef: Chef) =>
          ids.includes(String(chef.id))
        );

        const aliveIds = foundChefs.map((chef) => String(chef.id));

        if (aliveIds.length !== ids.length) {
          await AsyncStorage.setItem(key, JSON.stringify(aliveIds));
          setFavoriteIds(aliveIds);
        }

        setChefs(foundChefs);
      } catch {
        if (currentRequest !== requestId.current) return;
        setError("تعذر تحميل المفضلة. تأكد من الاتصال أو جرّب مرة ثانية.");
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadFavorites(false);
    }, [loadFavorites])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites(true);
  }, [loadFavorites]);

  const removeFavorite = useCallback(
    async (chefId: string) => {
      if (!favoriteKey) {
        openLogin();
        return;
      }

      setRemovingId(chefId);

      const previousChefs = chefs;
      const previousIds = favoriteIds;

      const nextIds = favoriteIds.filter((id) => id !== chefId);
      const nextChefs = chefs.filter((chef) => String(chef.id) !== chefId);

      setFavoriteIds(nextIds);
      setChefs(nextChefs);

      try {
        await AsyncStorage.setItem(favoriteKey, JSON.stringify(nextIds));
      } catch {
        setFavoriteIds(previousIds);
        setChefs(previousChefs);
        setError("ما قدرنا نحذف المتجر من المفضلة. حاول مرة ثانية.");
      } finally {
        setRemovingId(null);
      }
    },
    [chefs, favoriteIds, favoriteKey, openLogin]
  );

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      const chefId = String(item.id);
      const fullName = text(item.users?.full_name, "متجر");
      const city = text(item.city, "المدينة");
      const neighborhood = text(item.neighborhood, "الحي");
      const isRemoving = removingId === chefId;

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          style={s.card}
          onPress={() => openChef(chefId)}
        >
          <View style={s.avatarWrap}>
            <Store size={25} color={c.gold} strokeWidth={1.5} />
          </View>

          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {fullName}
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
              <Text style={s.city} numberOfLines={1}>
                {city} · {neighborhood}
              </Text>
            </View>

            <View style={s.meta}>
              <Star size={12} color={c.gold} fill={c.gold} />
              <Text style={s.rating}>{num(item.rating_avg)}</Text>
              <Text style={s.orders}>{num(item.total_orders)} طلب</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[s.heartBtn, isRemoving && s.heartBtnDisabled]}
            onPress={() => removeFavorite(chefId)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color={c.gold} />
            ) : (
              <Heart size={20} color={c.gold} fill={c.gold} strokeWidth={1.8} />
            )}
          </TouchableOpacity>

          <ChevronLeft size={18} color={c.textMuted} strokeWidth={1.8} />
        </TouchableOpacity>
      );
    },
    [c, s, openChef, removeFavorite, removingId]
  );

  const Header = useCallback(() => {
    return (
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.badge}>
            <Sparkles size={13} color={c.gold} />
            <Text style={s.badgeText}>مختاراتك</Text>
          </View>

          <Text style={s.title}>المفضلة</Text>
        </View>

        <Text style={s.subtitle}>
          كل المتاجر اللي حفظتها تلقاها هنا بسرعة.
        </Text>

        <View style={s.summaryCard}>
          <View style={s.summaryIcon}>
            <ShieldCheck size={22} color={c.gold} strokeWidth={1.7} />
          </View>

          <View style={s.summaryTextWrap}>
            <Text style={s.summaryTitle}>{chefs.length} في المفضلة</Text>
            <Text style={s.summarySub}>
              اضغط على القلب لإزالة المتجر من القائمة.
            </Text>
          </View>
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
            <AlertCircle size={18} color={c.danger} />
            <View style={s.errorTextWrap}>
              <Text style={s.errorTitle}>حدثت مشكلة</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
            <RefreshCw size={17} color={c.gold} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [chefs.length, error, onRefresh]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={c.gold} style={{ marginTop: 90 }} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>جاري تحميل مفضلتك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userId) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.guestWrap}>
          <View style={s.guestIcon}>
            <Heart size={54} color={c.gold} strokeWidth={1.4} />
          </View>

          <Text style={s.guestTitle}>سجل دخولك أولًا</Text>
          <Text style={s.guestSub}>
            عشان نحفظ مفضلتك ونربطها بحسابك.
          </Text>

          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openLogin}>
            <Text style={s.primaryBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={s.secondaryBtn} onPress={openHome}>
            <Text style={s.secondaryBtnText}>تصفح بدون تسجيل</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={chefs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderChef}
        ListHeaderComponent={Header}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.gold}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Heart size={54} color={c.textMuted} strokeWidth={1.5} />
            </View>

            <Text style={s.emptyTitle}>ما عندك مفضلة بعد</Text>
            <Text style={s.emptySub}>
              اضغط على القلب عند أي متجر، وراح يظهر هنا مباشرة.
            </Text>

            <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openHome}>
              <Text style={s.primaryBtnText}>تصفح المتاجر</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
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

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },

  headerTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  title: {
    fontSize: 24,
    color: c.text,
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  subtitle: {
    color: c.textSoft,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 22,
    fontFamily: "Almarai_400Regular",
  },

  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.goldSoft,
    borderColor: c.goldBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    color: c.gold,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  summaryCard: {
    marginTop: 16,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
  },

  summaryTextWrap: {
    flex: 1,
  },

  summaryTitle: {
    color: c.text,
    textAlign: "right",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  summarySub: {
    color: c.textSoft,
    textAlign: "right",
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  errorBox: {
    marginTop: 12,
    borderRadius: 18,
    padding: 13,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  errorTextWrap: {
    flex: 1,
  },

  errorTitle: {
    color: c.danger,
    textAlign: "right",
    fontSize: 13,
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

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: c.surface,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: c.goldSoft,
    gap: 11,
  },

  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.goldBorder,
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

  city: {
    flex: 1,
    fontSize: 11,
    color: c.textSoft,
    textAlign: "right",
    fontFamily: "Almarai_400Regular",
  },

  meta: {
    flexDirection: "row-reverse",
    gap: 6,
    alignItems: "center",
  },

  rating: {
    fontSize: 12,
    color: c.gold,
    fontFamily: "Almarai_700Bold",
  },

  orders: {
    fontSize: 11,
    color: c.textMuted,
    fontFamily: "Almarai_400Regular",
  },

  heartBtn: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
  },

  heartBtnDisabled: {
    opacity: 0.65,
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 26,
  },

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 17,
    color: c.text,
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 12,
    lineHeight: 21,
    color: c.textSoft,
    fontFamily: "Almarai_400Regular",
    textAlign: "center",
  },

  guestWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  guestIcon: {
    width: 112,
    height: 112,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 22,
  },

  guestTitle: {
    color: c.text,
    fontSize: 20,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestSub: {
    color: c.textSoft,
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    fontFamily: "Almarai_400Regular",
  },

  primaryBtn: {
    minWidth: 190,
    backgroundColor: c.gold,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 13,
    alignItems: "center",
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  secondaryBtn: {
    marginTop: 10,
    minWidth: 190,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.goldBorder,
    backgroundColor: c.goldSoft,
  },

  secondaryBtnText: {
    color: c.gold,
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});