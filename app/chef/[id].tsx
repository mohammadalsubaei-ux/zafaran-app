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
  ChevronLeft,
  Clock3,
  ImageOff,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  ShoppingCart,
  Star,
  Store,
  XCircle,
} from "lucide-react-native";

import { useCart } from "@/context/CartContext";
import { useTheme, type Colors } from "@/context/ThemeContext";

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
  status?: "open" | "preorder" | "closed" | null;
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

function itemStatusMeta(c: Colors, status?: string | null) {
  if (status === "preorder") {
    return {
      label: "حجز مسبق",
      color: c.gold,
      bg: c.goldSoft,
      Icon: CalendarDays,
    };
  }

  if (status === "unavailable") {
    return {
      label: "غير متاح",
      color: c.danger,
      bg: c.dangerSoft,
      Icon: XCircle,
    };
  }

  return {
    label: "متاح",
    color: c.success,
    bg: c.successSoft,
    Icon: BadgeCheck,
  };
}

export default function ChefScreen() {
  const { id } = useLocalSearchParams();
  const chefIdParam = Array.isArray(id) ? id[0] : id;

  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

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
        setError("رقم المتجر غير موجود.");
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
          setError(json?.message || `تعذر تحميل صفحة المتجر. رمز الخطأ: ${response.status}`);
          return;
        }

        if (!json?.success || !json?.data) {
          setChef(null);
          setError(json?.message || "لم يتم العثور على بيانات المتجر.");
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

  const chefName = text(chef?.users?.full_name, "متجر");
  const chefLocation = [chef?.city, chef?.neighborhood].filter(Boolean).join(" · ");
  const chefStatus = (chef?.status ?? (chef?.is_open ? "open" : "closed")) as "open" | "preorder" | "closed";
  const isOpen = chefStatus === "open";
  const isPreorderOnly = chefStatus === "preorder";

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
        `?name=${encodeURIComponent(text(item.name, "منتج"))}` +
        `&price=${encodeURIComponent(String(item.price || 0))}` +
        `&description=${encodeURIComponent(text(item.description, ""))}` +
        `&image_url=${encodeURIComponent(text(item.image_url, ""))}` +
        `&chef_id=${encodeURIComponent(String(chef?.id || ""))}` +
        `&chef_name=${encodeURIComponent(chefName)}` +
        `&status=${encodeURIComponent(text(item.status, "available"))}`;

      router.push(params as any);
    },
    [chef?.id, chefName, router]
  );

  const addToCart = useCallback(
    (item: MenuItem) => {
      if (!chef) return;

      if (!isOpen && !isPreorderOnly) {
        Alert.alert("المتجر مغلق", "لا يمكن إضافة منتجات من متجر مغلق حاليًا.");
        return;
      }

      if (item.status === "unavailable") {
        Alert.alert("المنتج غير متاح", "هذا المنتج غير متاح للطلب حاليًا.");
        return;
      }

      const payload = {
        id: String(item.id),
        name: text(item.name, "منتج"),
        price: numberValue(item.price),
        quantity: 1,
        chef_id: String(chef.id),
        chef_name: chefName,
        image_url: text(item.image_url, ""),
        // متجر بوضع الحجز المسبق: كل أصنافه تُطلب حجزاً — وإلا حالة الصنف نفسه
        status: isPreorderOnly ? "preorder" : String(item.status || "available"),
      };

      if (chef_id && String(chef_id) !== String(chef.id)) {
        Alert.alert(
          "سلة جديدة",
          "عندك منتجات من متجر ثاني. هل تريد مسح السلة والبدء من هنا؟",
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
    [addItem, chef, chefName, chef_id, clearCart, isOpen, isPreorderOnly]
  );

  const Header = useCallback(() => {
    return (
      <View>
        <View style={s.topHeader}>
          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={() => router.back()}>
            <ArrowRight size={20} color={c.gold} strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>صفحة المتجر</Text>
            <Text style={s.headerSub}>متجر على زعفران</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={onRefresh}>
            <RefreshCw size={18} color={c.gold} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={s.heroCard}>
          <View style={s.avatarWrap}>
            <Store size={38} color={c.gold} strokeWidth={1.5} />
          </View>

          <Text style={s.chefName} numberOfLines={1}>
            {chefName}
          </Text>

          <View style={s.cityRow}>
            <MapPin size={13} color={c.textSoft} strokeWidth={1.6} />
            <Text style={s.chefCity} numberOfLines={1}>
              {text(chefLocation, "الموقع غير محدد")}
            </Text>
          </View>

          <View style={s.statusRow}>
            {(() => {
              const STATUS_UI: Record<string, { bg: string; dot: string; text: string; label: string }> = {
                open:     { bg: c.successSoft, dot: c.success, text: c.success, label: "مفتوح الآن" },
                preorder: { bg: c.goldSoft, dot: c.gold, text: c.gold, label: "حجز مسبق فقط" },
                closed:   { bg: c.dangerSoft, dot: c.danger, text: c.danger, label: "مغلق حاليًا" },
              };
              const ui = STATUS_UI[chefStatus] ?? STATUS_UI.closed;
              return (
                <View style={[s.openPill, { backgroundColor: ui.bg }]}>
                  <View style={[s.statusDot, { backgroundColor: ui.dot }]} />
                  <Text style={[s.openPillText, { color: ui.text }]}>{ui.label}</Text>
                </View>
              );
            })()}
          </View>

          <View style={s.statsBox}>
            <View style={s.statItem}>
              <View style={s.statIconLine}>
                <Star size={15} color={c.gold} fill={c.gold} />
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
              <Text style={s.statLabel}>منتج متاح</Text>
            </View>
          </View>

          {!isOpen ? (
            <View style={s.closedBanner}>
              <AlertCircle size={16} color={isPreorderOnly ? c.gold : c.danger} strokeWidth={1.8} />
              <Text style={[s.closedText, isPreorderOnly && { color: c.gold }]}>
                {isPreorderOnly
                  ? "يستقبل حجوزات مسبقة فقط حاليًا — يمكنك تصفح القائمة."
                  : "المتجر مغلق حاليًا، يمكنك تصفح القائمة فقط."}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.menuHeader}>
          <View style={s.menuTitleRow}>
            <Store size={17} color={c.gold} strokeWidth={1.8} />
            <Text style={s.menuTitle}>القائمة</Text>
          </View>

          <View style={s.menuCountPill}>
            <Text style={s.menuCountText}>{menu.length} منتج</Text>
          </View>
        </View>
      </View>
    );
  }, [
    c,
    s,
    availableCount,
    chef?.rating_avg,
    chef?.total_orders,
    chefLocation,
    chefName,
    chefStatus,
    isOpen,
    isPreorderOnly,
    menu.length,
    onRefresh,
    router,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => {
      const qty = getItemQty(String(item.id));
      const status = itemStatusMeta(c, item.status);
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
                  <ImageOff size={28} color={c.textMuted} strokeWidth={1.5} />
                </View>
              )}

              <View style={s.itemInfo}>
                <View style={s.itemTop}>
                  <Text style={s.itemName} numberOfLines={2}>
                    {text(item.name, "منتج")}
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
                    وصف المنتج غير مضاف حاليًا
                  </Text>
                )}

                <View style={s.itemMeta}>
                  <Text style={s.itemPrice}>{money(item.price)}</Text>

                  {preparation ? (
                    <View style={s.timeRow}>
                      <Clock3 size={12} color={c.textSoft} strokeWidth={1.5} />
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
                    <Minus size={16} color={c.gold} strokeWidth={2.4} />
                  </TouchableOpacity>

                  <Text style={s.qtyNum}>{qty}</Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.qtyBtn}
                    onPress={() => addToCart(item)}
                  >
                    <Plus size={16} color={c.gold} strokeWidth={2.4} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity activeOpacity={0.9} style={s.addBtn} onPress={() => addToCart(item)}>
                  <Plus size={17} color={c.onGold} strokeWidth={2.4} />
                  <Text style={s.addBtnText}>إضافة</Text>
                </TouchableOpacity>
              )
            ) : (
              <View style={s.disabledBtn}>
                <XCircle size={15} color={c.textMuted} strokeWidth={1.8} />
                <Text style={s.disabledBtnText}>غير متاح للطلب</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [c, s, addToCart, getItemQty, isOpen, openItem, updateQty]
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>جاري تحميل صفحة المتجر...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chef) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topHeader}>
          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={() => router.back()}>
            <ArrowRight size={20} color={c.gold} strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>صفحة المتجر</Text>
            <Text style={s.headerSub}>تعذر التحميل</Text>
          </View>

          <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={onRefresh}>
            <RefreshCw size={18} color={c.gold} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={s.emptyScreen}>
          <View style={s.emptyIcon}>
            <AlertCircle size={58} color={c.danger} strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>تعذر عرض المتجر</Text>
          <Text style={s.emptySub}>{error || "لم نتمكن من العثور على بيانات هذا المتجر."}</Text>

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Store size={54} color={c.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={s.emptyTitle}>لا توجد منتجات حاليًا</Text>
            <Text style={s.emptySub}>القائمة لم يتم تحديثها من المتجر بعد.</Text>
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
            <ShoppingCart size={17} color={c.onGold} strokeWidth={2} />
            <Text style={s.cartBarTotal}>{money(total)}</Text>
          </View>

          <ChevronLeft size={20} color={c.onGold} strokeWidth={2.2} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: c.bg,
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
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
  },

  headerTitleWrap: {
    alignItems: "center",
  },

  headerTitle: {
    color: c.text,
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  headerSub: {
    color: c.textSoft,
    fontSize: 11,
    marginTop: 3,
    fontFamily: "Almarai_400Regular",
  },

  listContent: {
    paddingBottom: 34,
  },

  heroCard: {
    marginHorizontal: 16,
    backgroundColor: c.surface,
    borderRadius: 32,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: c.border,
  },

  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 32,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  chefName: {
    maxWidth: "92%",
    fontSize: 23,
    color: c.text,
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
    color: c.textSoft,
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
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldSoft,
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
    color: c.gold,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  statLabel: {
    color: c.textMuted,
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  statDivider: {
    width: 1,
    height: 42,
    backgroundColor: c.goldSoft,
  },

  closedBanner: {
    width: "100%",
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  closedText: {
    flex: 1,
    color: c.danger,
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
    color: c.text,
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  menuCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
  },

  menuCountText: {
    color: c.gold,
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 13,
    borderWidth: 1,
    borderColor: c.goldSoft,
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
    backgroundColor: c.surfaceAlt,
  },

  itemImgPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 21,
    backgroundColor: c.surfaceAlt,
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
    color: c.text,
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
    color: c.textSoft,
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
    color: c.gold,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  timeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },

  itemTime: {
    color: c.textSoft,
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
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldSoft,
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.goldSoft,
  },

  qtyNum: {
    minWidth: 24,
    color: c.text,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  addBtn: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 18,
    backgroundColor: c.gold,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  addBtnText: {
    color: c.bg,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  disabledBtn: {
    minHeight: 42,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: c.bg,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.goldSoft,
  },

  disabledBtnText: {
    color: c.textMuted,
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
    backgroundColor: c.gold,
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
    backgroundColor: c.bg,
  },

  cartBadgeText: {
    color: c.gold,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartBarCenter: {
    flex: 1,
    alignItems: "flex-end",
  },

  cartBarText: {
    color: c.bg,
    fontSize: 16,
    fontFamily: "Almarai_800ExtraBold",
  },

  cartBarSub: {
    color: c.bg,
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
    color: c.bg,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    color: c.text,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Almarai_800ExtraBold",
  },

  emptySub: {
    color: c.textSoft,
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
    backgroundColor: c.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },
});