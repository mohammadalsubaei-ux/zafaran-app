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
        setError("ما قدرنا نحذف الشيف من المفضلة. حاول مرة ثانية.");
      } finally {
        setRemovingId(null);
      }
    },
    [chefs, favoriteIds, favoriteKey, openLogin]
  );

  const renderChef = useCallback(
    ({ item }: { item: Chef }) => {
      const chefId = String(item.id);
      const fullName = text(item.users?.full_name, "أسرة منتجة");
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
            <UtensilsCrossed size={25} color="#F2B233" strokeWidth={1.5} />
          </View>

          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {fullName}
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
              <ActivityIndicator size="small" color="#F2B233" />
            ) : (
              <Heart size={20} color="#F2B233" fill="#F2B233" strokeWidth={1.8} />
            )}
          </TouchableOpacity>

          <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8} />
        </TouchableOpacity>
      );
    },
    [openChef, removeFavorite, removingId]
  );

  const Header = useCallback(() => {
    return (
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={s.badge}>
            <Sparkles size={13} color="#F2B233" />
            <Text style={s.badgeText}>مختاراتك</Text>
          </View>

          <Text style={s.title}>المفضلة</Text>
        </View>

        <Text style={s.subtitle}>
          كل الأسر والشيفات اللي حفظتهم تلقاهم هنا بسرعة.
        </Text>

        <View style={s.summaryCard}>
          <View style={s.summaryIcon}>
            <ShieldCheck size={22} color="#F2B233" strokeWidth={1.7} />
          </View>

          <View style={s.summaryTextWrap}>
            <Text style={s.summaryTitle}>{chefs.length} في المفضلة</Text>
            <Text style={s.summarySub}>
              اضغط على القلب لإزالة الشيف من القائمة.
            </Text>
          </View>
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.85} style={s.errorBox} onPress={onRefresh}>
            <AlertCircle size={18} color="#FFB0B0" />
            <View style={s.errorTextWrap}>
              <Text style={s.errorTitle}>حدثت مشكلة</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
            <RefreshCw size={17} color="#F2B233" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [chefs.length, error, onRefresh]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color="#F2B233" style={{ marginTop: 90 }} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
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
            <Heart size={54} color="#F2B233" strokeWidth={1.4} />
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
            tintColor="#F2B233"
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Heart size={54} color="#5A3A18" strokeWidth={1.5} />
            </View>

            <Text style={s.emptyTitle}>ما عندك مفضلة بعد</Text>
            <Text style={s.emptySub}>
              اضغط على القلب عند أي شيف، وراح يظهر هنا مباشرة.
            </Text>

            <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={openHome}>
              <Text style={s.primaryBtnText}>تصفح الشيفات</Text>
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
    color: "#FDF0DC",
    textAlign: "right",
    fontFamily: "Almarai_800ExtraBold",
  },

  subtitle: {
    color: "#A98961",
    textAlign: "right",
    fontSize: 13,
    lineHeight: 22,
    fontFamily: "Almarai_400Regular",
  },

  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(242,178,51,0.09)",
    borderColor: "rgba(242,178,51,0.18)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    color: "#F2B233",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  summaryCard: {
    marginTop: 16,
    backgroundColor: "#21160D",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
    gap: 12,
  },

  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.15)",
  },

  summaryTextWrap: {
    flex: 1,
  },

  summaryTitle: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  summarySub: {
    color: "#8A6030",
    textAlign: "right",
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  errorBox: {
    marginTop: 12,
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#321717",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.25)",
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
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#21160D",
    borderRadius: 22,
    padding: 14,
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

  heartBtn: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.08)",
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
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 17,
    color: "#FDF0DC",
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 12,
    lineHeight: 21,
    color: "#8A6030",
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
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
    marginBottom: 22,
  },

  guestTitle: {
    color: "#FDF0DC",
    fontSize: 20,
    fontFamily: "Almarai_800ExtraBold",
  },

  guestSub: {
    color: "#A98961",
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    fontFamily: "Almarai_400Regular",
  },

  primaryBtn: {
    minWidth: 190,
    backgroundColor: "#F2B233",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 13,
    alignItems: "center",
  },

  primaryBtnText: {
    color: "#17100B",
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
    borderColor: "rgba(242,178,51,0.18)",
    backgroundColor: "rgba(242,178,51,0.04)",
  },

  secondaryBtnText: {
    color: "#F2B233",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});