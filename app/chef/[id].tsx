import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChefHat,
  ChevronLeft,
  Clock3,
  ImageOff,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingCart,
  Star,
  UtensilsCrossed,
  XCircle,
} from "lucide-react-native";

import { useCart } from "@/context/CartContext";

const API = "https://zafaran-backend-production.up.railway.app";

type MenuItem = {
  id: string;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  prep_minutes?: number | string | null;
  status?: "available" | "preorder" | "unavailable" | string | null;
  category?: string | null;
};

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
  menu?: MenuItem[] | null;
};

function text(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const clean = String(value).trim();
  return clean.length ? clean : fallback;
}

function numberValue(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return `${numberValue(value).toFixed(2).replace(".00", "")} ريال`;
}

function prepTime(minutesValue: unknown) {
  const minutes = numberValue(minutesValue);
  if (!minutes) return "";

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h && m) return `${h} ساعة ${m} دقيقة`;
  if (h) return `${h} ساعة`;
  return `${m} دقيقة`;
}

function itemStatusMeta(status?: string | null) {
  if (status === "preorder") {
    return {
      label: "حجز مسبق",
      color: "#F2B233",
      bg: "rgba(242,178,51,0.1)",
      Icon: CalendarDays,
    };
  }

  if (status === "unavailable") {
    return {
      label: "غير متاح",
      color: "#E53935",
      bg: "rgba(229,57,53,0.1)",
      Icon: XCircle,
    };
  }

  return {
    label: "متاح",
    color: "#4CAF50",
    bg: "rgba(76,175,80,0.1)",
    Icon: BadgeCheck,
  };
}

export default function ChefScreen() {
  const { id } = useLocalSearchParams();
  const chefIdParam = Array.isArray(id) ? id[0] : id;

  const router = useRouter();

  const [chef, setChef] = useState<Chef | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items, addItem, updateQty, clearCart, total, totalItems, chef_id } = useCart();

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const loadChef = useCallback(
    async (silent = false) => {
      if (!chefIdParam) {
        setChef(null);
        setError("رقم الشيف غير موجود.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!silent) setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API}/api/chefs/${chefIdParam}`);

        let json: any = null;
        try {
          json = await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          setChef(null);
          setError(json?.message || `تعذر تحميل صفحة الشيف. رمز الخطأ: ${response.status}`);
          return;
        }

        if (!json?.success || !json?.data) {
          setChef(null);
          setError(json?.message || "لم يتم العثور على بيانات الشيف.");
          return;
        }

        setChef(json.data);
      } catch {
        setChef(null);
        setError("تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [chefIdParam]
  );

  useEffect(() => {
    loadChef(false);
  }, [loadChef]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChef(true);
  }, [loadChef]);

  const menu = useMemo(() => {
    return chef?.menu || [];
  }, [chef]);

  const availableCount = useMemo(() => {
    return menu.filter((item) => item.status !== "unavailable").length;
  }, [menu]);

  const isMale = chef?.users?.gender === "male";
  const chefName = text(chef?.users?.full_name, isMale ? "الشيف" : "الشيفة");
  const chefLocation = [chef?.city, chef?.neighborhood].filter(Boolean).join(" · ");
  const isOpen = Boolean(chef?.is_open);

  const getItemQty = useCallback(
    (itemId: string) => {
      return items.find((cartItem) => String(cartItem.id) === String(itemId))?.quantity || 0;
    },
    [items]
  );

  const openItem = useCallback(
    (item: MenuItem) => {
      const params =
        `/item/${item.id}` +
        `?name=${encodeURIComponent(text(item.name, "وجبة"))}` +
        `&price=${encodeURIComponent(String(item.price || 0))}` +
        `&description=${encodeURIComponent(text(item.description, ""))}` +
        `&image_url=${encodeURIComponent(text(item.image_url, ""))}` +
        `&chef_id=${encodeURIComponent(String(chef?.id || ""))}` +
        `&chef_name=${encodeURIComponent(chefName)}`;

      router.push(params as any);
    },
    [chef?.id, chefName, router]
  );

  const addToCart = useCallback(
    (item: MenuItem) => {
      if (!chef) return;

      if (!isOpen) {
        Alert.alert("الشيف مغلق", "لا يمكن إضافة وجبات من شيف مغلق حاليًا.");
        return;
      }

      if (item.status === "unavailable") {
        Alert.alert("الوجبة غير متاحة", "هذه الوجبة غير متاحة للطلب حاليًا.");
        return;
      }

      const payload = {
        id: String(item.id),
        name: text(item.name, "وجبة"),
        price: numberValue(item.price),
        quantity: 1,
        chef_id: String(chef.id),
        chef_name: chefName,
        image_url: text(item.image_url, ""),
      };

      if (chef_id && String(chef_id) !== String(chef.id)) {
        Alert.alert(
          "سلة جديدة",
          "عندك وجبات من شيف ثاني. هل تريد مسح السلة والبدء من هنا؟",
          [
            { text: "إلغاء", style: "cancel" },
            {
              text: "مسح وبدء جديد",
              style: "destructive",
              onPress: () => {
                clearCart();
                addItem(payload);
              },
            },
          ]
        );
        return;
      }

      addItem(payload);
    },
    [addItem, chef, chefName, chef_id, clearCart, isOpen]
  );

  const Header = useCallback(() => {
    return (
      <View>
        <View style={s.topHeader}>
          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={() => router.back()}>
            <ArrowRight size={20} color="#F2B233" strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>{isMale ? "صفحة الشيف" : "صفحة الشيفة"}</Text>
            <Text style={s.headerSub}>Zafaran Chef</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={onRefresh}>
            <RefreshCw size={18} color="#F2B233" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={s.heroCard}>
          <View style={s.avatarWrap}>
            <ChefHat size={38} color="#F2B233" strokeWidth={1.5} />
          </View>

          <Text style={s.chefName} numberOfLines={1}>
            {chefName}
          </Text>

          <View style={s.cityRow}>
            <MapPin size={13} color="#8A6030" strokeWidth={1.6} />
            <Text style={s.chefCity} numberOfLines={1}>
              {text(chefLocation, "الموقع غير محدد")}
            </Text>
          </View>

          <View style={s.statusRow}>
            <View
              style={[
                s.openPill,
                { backgroundColor: isOpen ? "rgba(76,175,80,0.1)" : "rgba(229,57,53,0.1)" },
              ]}
            >
              <View style={[s.statusDot, { backgroundColor: isOpen ? "#4CAF50" : "#E53935" }]} />
              <Text style={[s.openPillText, { color: isOpen ? "#8AF0A5" : "#FF9A9A" }]}>
                {isOpen ? (isMale ? "مفتوح الآن" : "مفتوحة الآن") : isMale ? "مغلق حاليًا" : "مغلقة حاليًا"}
              </Text>
            </View>
          </View>

          <View style={s.statsBox}>
            <View style={s.statItem}>
              <View style={s.statIconLine}>
                <Star size={15} color="#F2B233" fill="#F2B233" />
                <Text style={s.statValue}>{numberValue(chef?.rating_avg).toFixed(1).replace(".0", "")}</Text>
              </View>
              <Text style={s.statLabel}>التقييم</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statItem}>
              <Text style={s.statValue}>{numberValue(chef?.total_orders)}</Text>
              <Text style={s.statLabel}>طلب</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statItem}>
              <Text style={s.statValue}>{availableCount}</Text>
              <Text style={s.statLabel}>وجبة متاحة</Text>
            </View>
          </View>

          {!isOpen ? (
            <View style={s.closedBanner}>
              <AlertCircle size={16} color="#E53935" strokeWidth={1.8} />
              <Text style={s.closedText}>
                {isMale ? "الشيف مغلق حاليًا، يمكنك تصفح القائمة فقط." : "الشيفة مغلقة حاليًا، يمكنك تصفح القائمة فقط."}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.menuHeader}>
          <View style={s.menuTitleRow}>
            <UtensilsCrossed size={17} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.menuTitle}>القائمة</Text>
          </View>

          <View style={s.menuCountPill}>
            <Text style={s.menuCountText}>{menu.length} وجبة</Text>
          </View>
        </View>
      </View>
    );
  }, [
    availableCount,
    chef?.rating_avg,
    chef?.total_orders,
    chefLocation,
    chefName,
    isMale,
    isOpen,
    menu.length,
    onRefresh,
    router,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => {
      const qty = getItemQty(String(item.id));
      const status = itemStatusMeta(item.status);
      const StatusIcon = status.Icon;
      const preparation = prepTime(item.prep_minutes);
      const orderable = isOpen && item.status !== "unavailable";

      return (
        <View style={[s.card, !orderable && s.cardMuted]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => openItem(item)}>
            <View style={s.cardContent}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.itemImg} />
              ) : (
                <View style={s.itemImgPlaceholder}>
                  <ImageOff size={28} color="#6D4E2D" strokeWidth={1.5} />
                </View>
              )}

              <View style={s.itemInfo}>
                <View style={s.itemTop}>
                  <Text style={s.itemName} numberOfLines={2}>
                    {text(item.name, "وجبة")}
                  </Text>

                  <View style={[s.itemStatusBadge, { backgroundColor: status.bg }]}>
                    <StatusIcon size={11} color={status.color} strokeWidth={1.8} />
                    <Text style={[s.itemStatusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {item.description ? (
                  <Text style={s.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : (
                  <Text style={s.itemDesc} numberOfLines={1}>
                    وصف الوجبة غير مضاف حاليًا
                  </Text>
                )}

                <View style={s.itemMeta}>
                  <Text style={s.itemPrice}>{money(item.price)}</Text>

                  {preparation ? (
                    <View style={s.timeRow}>
                      <Clock3 size={12} color="#8A6030" strokeWidth={1.5} />
                      <Text style={s.itemTime}>{preparation}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <View style={s.cardActions}>
            {orderable ? (
              qty > 0 ? (
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.qtyBtn}
                    onPress={() => updateQty(String(item.id), qty - 1)}
                  >
                    <Minus size={16} color="#F2B233" strokeWidth={2.4} />
                  </TouchableOpacity>

                  <Text style={s.qtyNum}>{qty}</Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.qtyBtn}
                    onPress={() => addToCart(item)}
                  >
                    <Plus size={16} color="#F2B233" strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity activeOpacity={0.9} style={s.addBtn} onPress={() => addToCart(item)}>
                  <Plus size={17} color="#17100B" strokeWidth={2.4} />
                  <Text style={s.addBtnText}>إضافة</Text>
                </TouchableOpacity>
              )
            ) : (
              <View style={s.disabledBtn}>
                <XCircle size={15} color="#6D4E2D" strokeWidth={1.8} />
                <Text style={s.disabledBtnText}>غير متاح للطلب</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [addToCart, getItemQty, isOpen, openItem, updateQty]
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل صفحة الشيف...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chef) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topHeader}>
          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={() => router.back()}>
            <ArrowRight size={20} color="#F2B233" strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>صفحة الشيف</Text>
            <Text style={s.headerSub}>تعذر التحميل</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={onRefresh}>
            <RefreshCw size={18} color="#F2B233" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={s.emptyScreen}>
          <View style={s.emptyIcon}>
            <AlertCircle size={58} color="#E53935" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>تعذر عرض الشيف</Text>
          <Text style={s.emptySub}>{error || "لم نتمكن من العثور على بيانات هذا الشيف."}</Text>

          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={onRefresh}>
            <Text style={s.primaryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={menu}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        contentContainerStyle={[
          s.listContent,
          { paddingBottom: totalItems > 0 ? 118 : 34 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F2B233" />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <UtensilsCrossed size={54} color="#5A3A18" strokeWidth={1.5} />
            </View>
            <Text style={s.emptyTitle}>لا توجد وجبات حاليًا</Text>
            <Text style={s.emptySub}>القائمة لم يتم تحديثها من الشيف بعد.</Text>
          </View>
        }
      />

      {totalItems > 0 ? (
        <TouchableOpacity activeOpacity={0.92} style={s.cartBar} onPress={() => router.push("/cart" as any)}>
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeText}>{totalItems}</Text>
          </View>

          <View style={s.cartBarCenter}>
            <Text style={s.cartBarText}>عرض السلة</Text>
            <Text style={s.cartBarSub}>جاهز لإكمال الطلب</Text>
          </View>

          <View style={s.cartTotalBox}>
            <ShoppingCart size={17} color="#17100B" strokeWidth={2} />
            <Text style={s.cartBarTotal}>{money(total)}</Text>
          </View>

          <ChevronLeft size={20} color="#17100B" strokeWidth={2.2} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#17100B",
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

  topHeader: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
  },

  headerTitleWrap: {
    alignItems: "center",
  },

  headerTitle: {
    color: "#FDF0DC",
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  headerSub: {
    color: "#8A6030",
    fontSize: 11,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  listContent: {
    paddingBottom: 34,
  },

  heroCard: {
    marginHorizontal: 16,
    backgroundColor: "#21160D",
    borderRadius: 32,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
  },

  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  chefName: {
    maxWidth: "92%",
    fontSize: 23,
    color: "#FDF0DC",
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  cityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },

  chefCity: {
    color: "#A98961",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  statusRow: {
    marginTop: 12,
  },

  openPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  openPillText: {
    fontSize: 12,
    fontFamily: "Almarai_800ExtraBold",
  },

  statsBox: {
    width: "100%",
    marginTop: 18,
    borderRadius: 23,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
  },

  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  statIconLine: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },

  statValue: {
    color: "#F2B233",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  statLabel: {
    color: "#6D4E2D",
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: "rgba(242,178,51,0.1)",
  },

  closedBanner: {
    width: "100%",
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(229,57,53,0.09)",
    borderWidth: 1,
    borderColor: "rgba(229,57,53,0.18)",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  closedText: {
    flex: 1,
    color: "#FF9A9A",
    textAlign: "right",
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Almarai_700Bold",
  },

  menuHeader: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  menuTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
  },

  menuTitle: {
    color: "#FDF0DC",
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  menuCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
  },

  menuCountText: {
    color: "#F2B233",
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#21160D",
    borderRadius: 24,
    padding: 13,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.09)",
  },

  cardMuted: {
    opacity: 0.74,
  },

  cardContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },

  itemImg: {
    width: 88,
    height: 88,
    borderRadius: 21,
    backgroundColor: "#2A1E00",
  },

  itemImgPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 21,
    backgroundColor: "#2A1E00",
    alignItems: "center",
    justifyContent: "center",
  },

  itemInfo: {
    flex: 1,
  },

  itemTop: {
    alignItems: "flex-end",
  },

  itemName: {
    color: "#FDF0DC",
    textAlign: "right",
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "Almarai_800ExtraBold",
  },

  itemStatusBadge: {
    marginTop: 6,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  itemStatusText: {
    fontSize: 10,
    fontFamily: "Almarai_800ExtraBold",
  },

  itemDesc: {
    color: "#8A6030",
    textAlign: "right",
    marginTop: 7,
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Almarai_400Regular",
  },

  itemMeta: {
    marginTop: 9,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  itemPrice: {
    color: "#F2B233",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  timeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },

  itemTime: {
    color: "#8A6030",
    fontSize: 11,
    fontFamily: "Almarai_400Regular",
  },

  cardActions: {
    marginTop: 12,
    alignItems: "flex-end",
  },

  qtyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 6,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242,178,51,0.08)",
  },

  qtyNum: {
    minWidth: 24,
    color: "#FDF0DC",
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  addBtn: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 18,
    backgroundColor: "#F2B233",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  addBtnText: {
    color: "#17100B",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  disabledBtn: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: "#17100B",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
  },

  disabledBtnText: {
    color: "#6D4E2D",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  cartBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 66,
    borderRadius: 23,
    backgroundColor: "#F2B233",
    paddingHorizontal: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  cartBadge: {
    width: 34,
    height: 34,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17100B",
  },

  cartBadgeText: {
    color: "#F2B233",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartBarCenter: {
    flex: 1,
    alignItems: "flex-end",
  },

  cartBarText: {
    color: "#17100B",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartBarSub: {
    color: "rgba(23,16,11,0.7)",
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Almarai_700Bold",
  },

  cartTotalBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },

  cartBarTotal: {
    color: "#17100B",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 54,
    paddingHorizontal: 26,
  },

  emptyScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 39,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    color: "#FDF0DC",
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    color: "#8A6030",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
    fontSize: 12,
    lineHeight: 21,
    fontFamily: "Almarai_400Regular",
  },

  primaryBtn: {
    minWidth: 170,
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