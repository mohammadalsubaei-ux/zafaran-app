import { useCallback, useMemo, useState } from "react";
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
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Flame,
  History,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled"
  | "pending_time"
  | "time_confirmed";

type Order = {
  id: string;
  status: OrderStatus | string;
  total?: number | string | null;
  created_at?: string | null;
  chefs?: {
    users?: {
      full_name?: string | null;
      gender?: string | null;
    } | null;
  } | null;
  order_items?: any[];
  items?: any[];
};

const STATUS_META: Record<string, any> = {
  pending: {
    label: "بانتظار القبول",
    color: "#F2B233",
    bg: "rgba(242,178,51,0.12)",
    Icon: Clock3,
  },
  accepted: {
    label: "تم القبول",
    color: "#4FC3F7",
    bg: "rgba(79,195,247,0.12)",
    Icon: CheckCircle2,
  },
  preparing: {
    label: "قيد التحضير",
    color: "#FF8A3D",
    bg: "rgba(255,138,61,0.12)",
    Icon: Flame,
  },
  ready: {
    label: "جاهز للاستلام/التوصيل",
    color: "#C084FC",
    bg: "rgba(192,132,252,0.13)",
    Icon: PackageCheck,
  },
  delivering: {
    label: "في الطريق",
    color: "#03A9F4",
    bg: "rgba(3,169,244,0.13)",
    Icon: Truck,
  },
  delivered: {
    label: "تم التسليم",
    color: "#4CAF50",
    bg: "rgba(76,175,80,0.13)",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "ملغي",
    color: "#E53935",
    bg: "rgba(229,57,53,0.13)",
    Icon: XCircle,
  },
  pending_time: {
    label: "بانتظار تأكيد الوقت",
    color: "#FF9800",
    bg: "rgba(255,152,0,0.13)",
    Icon: CalendarClock,
  },
  time_confirmed: {
    label: "تم تأكيد الوقت",
    color: "#8BC34A",
    bg: "rgba(139,195,74,0.13)",
    Icon: CalendarClock,
  },
};

const TRACK_STEPS = [
  { id: "pending", label: "استلام" },
  { id: "accepted", label: "قبول" },
  { id: "preparing", label: "تحضير" },
  { id: "ready", label: "جاهز" },
  { id: "delivering", label: "توصيل" },
  { id: "delivered", label: "تسليم" },
];

const TRACK_INDEX: Record<string, number> = {
  pending: 0,
  pending_time: 0,
  time_confirmed: 1,
  accepted: 1,
  preparing: 2,
  ready: 3,
  delivering: 4,
  delivered: 5,
  cancelled: 0,
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
  return `${numberValue(value).toFixed(2).replace(".00", "")} ريال`;
}

function shortId(id: unknown) {
  const value = cleanText(id, "");
  return value ? `#${value.slice(0, 8)}` : "#--------";
}

function formatDate(value: unknown) {
  if (!value) return "غير محدد";

  try {
    return new Date(String(value)).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "غير محدد";
  }
}

function getItemName(item: any) {
  return (
    item?.name ||
    item?.menu_items?.name ||
    item?.menu?.name ||
    item?.item_name ||
    "وجبة"
  );
}

function getItemQty(item: any) {
  return item?.quantity || item?.qty || 1;
}

export default function OrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const storedUser = await AsyncStorage.getItem("user");

        if (!storedUser) {
          router.replace("/login" as any);
          return;
        }

        let userData: any = null;

        try {
          userData = JSON.parse(storedUser);
        } catch {
          await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
          router.replace("/login" as any);
          return;
        }

        if (!userData?.id) {
          router.replace("/login" as any);
          return;
        }

        const res = await fetch(`${API}/api/orders/customer/${userData.id}`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setOrders([]);
          setError(`تعذر تحميل الطلبات. رمز الخطأ: ${res.status}`);
          return;
        }

        if (!json?.success) {
          setOrders([]);
          setError(json?.message || "الخادم لم يرجع بيانات صحيحة.");
          return;
        }

        setOrders(Array.isArray(json.data) ? json.data : []);
      } catch {
        setOrders([]);
        setError("تعذر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة ثانية.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders(false);
    }, [loadOrders])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(true);
  }, [loadOrders]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  }, [orders]);

  const historyOrders = useMemo(() => {
    return orders.filter((order) => ["delivered", "cancelled"].includes(order.status));
  }, [orders]);

  const displayOrders = useMemo(() => {
    return tab === "active" ? activeOrders : historyOrders;
  }, [activeOrders, historyOrders, tab]);

  const openOrder = useCallback(
    (orderId: string) => {
      router.push(`/orders/${orderId}` as any);
    },
    [router]
  );

  const goHome = useCallback(() => {
    router.push("/(tabs)" as any);
  }, [router]);

  const Header = useCallback(() => {
    return (
      <View>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <ShoppingBag size={24} color="#F2B233" strokeWidth={1.8} />
          </View>

          <View style={s.heroInfo}>
            <Text style={s.heroTitle}>طلباتي</Text>
            <Text style={s.heroSub}>تابع حالة طلباتك من القبول حتى التسليم.</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            style={s.refreshBtn}
            onPress={() => loadOrders(true)}
          >
            <RefreshCw size={17} color="#F2B233" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Package size={17} color="#F2B233" strokeWidth={1.7} />
            <Text style={s.summaryValue}>{activeOrders.length}</Text>
            <Text style={s.summaryLabel}>نشطة</Text>
          </View>

          <View style={s.summaryCard}>
            <History size={17} color="#A98961" strokeWidth={1.7} />
            <Text style={s.summaryValue}>{historyOrders.length}</Text>
            <Text style={s.summaryLabel}>السجل</Text>
          </View>

          <View style={s.summaryCard}>
            <ShoppingBag size={17} color="#F2B233" strokeWidth={1.7} />
            <Text style={s.summaryValue}>{orders.length}</Text>
            <Text style={s.summaryLabel}>الإجمالي</Text>
          </View>
        </View>

        <View style={s.tabRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.tabBtn, tab === "active" && s.tabBtnActive]}
            onPress={() => setTab("active")}
          >
            <Package
              size={15}
              color={tab === "active" ? "#F2B233" : "#8A6030"}
              strokeWidth={1.8}
            />
            <Text style={[s.tabText, tab === "active" && s.tabTextActive]}>
              النشطة ({activeOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.tabBtn, tab === "history" && s.tabBtnActive]}
            onPress={() => setTab("history")}
          >
            <History
              size={15}
              color={tab === "history" ? "#F2B233" : "#8A6030"}
              strokeWidth={1.8}
            />
            <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>
              السجل ({historyOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.86} style={s.errorBox} onPress={onRefresh}>
            <AlertCircle size={18} color="#FFB0B0" strokeWidth={1.8} />
            <View style={s.errorInfo}>
              <Text style={s.errorTitle}>حدثت مشكلة</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    activeOrders.length,
    error,
    historyOrders.length,
    loadOrders,
    onRefresh,
    orders.length,
    tab,
  ]);

  const renderOrder = useCallback(
    ({ item }: { item: Order }) => {
      const st = STATUS_META[item.status] || STATUS_META.pending;
      const StatusIcon = st.Icon;

      const orderItems = item.order_items || item.items || [];
      const currentStep = TRACK_INDEX[item.status] ?? 0;
      const chefName = cleanText(item.chefs?.users?.full_name, "أسرة منتجة");
      const isFinished = ["delivered", "cancelled"].includes(item.status);

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[s.card, item.status === "cancelled" && s.cardCancelled]}
          onPress={() => openOrder(String(item.id))}
        >
          <View style={s.cardHeader}>
            <View style={s.orderIdBox}>
              <Text style={s.orderLabel}>رقم الطلب</Text>
              <Text style={s.orderId}>{shortId(item.id)}</Text>
            </View>

            <View style={[s.badge, { backgroundColor: st.bg }]}>
              <StatusIcon size={13} color={st.color} strokeWidth={1.9} />
              <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          <View style={s.chefRow}>
            <View style={s.chefIcon}>
              <ChefHat size={17} color="#F2B233" strokeWidth={1.7} />
            </View>

            <View style={s.chefInfo}>
              <Text style={s.chefLabel}>مقدم الطلب</Text>
              <Text style={s.chefName} numberOfLines={1}>
                {chefName}
              </Text>
            </View>
          </View>

          <View style={s.itemsBox}>
            {orderItems.slice(0, 2).map((oi: any, index: number) => (
              <View key={String(oi.id || index)} style={s.itemLine}>
                <Text style={s.itemName} numberOfLines={1}>
                  {getItemName(oi)}
                </Text>
                <Text style={s.itemQty}>× {getItemQty(oi)}</Text>
              </View>
            ))}

            {orderItems.length === 0 ? (
              <Text style={s.noItems}>لا توجد تفاصيل وجبات</Text>
            ) : null}

            {orderItems.length > 2 ? (
              <Text style={s.moreItems}>+ {orderItems.length - 2} وجبات أخرى</Text>
            ) : null}
          </View>

          {!isFinished ? (
            <View style={s.trackWrap}>
              <View style={s.trackBar}>
                {TRACK_STEPS.map((step, idx) => {
                  const done = idx <= currentStep;

                  return (
                    <View
                      key={step.id}
                      style={[
                        s.trackStep,
                        done && s.trackStepDone,
                        idx === currentStep && s.trackStepCurrent,
                      ]}
                    />
                  );
                })}
              </View>

              <View style={s.trackLabels}>
                {TRACK_STEPS.map((step, idx) => (
                  <Text
                    key={step.id}
                    style={[
                      s.trackLabel,
                      idx <= currentStep && s.trackLabelDone,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          <View style={s.footer}>
            <View style={s.totalWrap}>
              <CircleDollarSign size={16} color="#F2B233" strokeWidth={1.8} />
              <Text style={s.total}>{money(item.total)}</Text>
            </View>

            <View style={s.footerLeft}>
              <Text style={s.date}>{formatDate(item.created_at)}</Text>
              <ChevronLeft size={18} color="#5A3A18" strokeWidth={1.8} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [openOrder]
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل طلباتك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={displayOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
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
              {tab === "active" ? (
                <Package size={54} color="#5A3A18" strokeWidth={1.5} />
              ) : (
                <History size={54} color="#5A3A18" strokeWidth={1.5} />
              )}
            </View>

            <Text style={s.emptyTitle}>
              {tab === "active" ? "ما عندك طلبات نشطة" : "ما عندك سجل طلبات"}
            </Text>

            <Text style={s.emptySub}>
              {tab === "active"
                ? "ابدأ طلبك من الأسر المنتجة والقهاوي والحلا."
                : "الطلبات المكتملة أو الملغية تظهر هنا."}
            </Text>

            {tab === "active" ? (
              <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={goHome}>
                <ShoppingBag size={17} color="#17100B" strokeWidth={2} />
                <Text style={s.primaryBtnText}>اطلب الآن</Text>
              </TouchableOpacity>
            ) : null}
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

  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 24,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "rgba(242,178,51,0.08)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroInfo: {
    flex: 1,
    alignItems: "flex-end",
  },

  heroTitle: {
    color: "#FDF0DC",
    fontSize: 20,
    fontFamily: "Almarai_800ExtraBold",
  },

  heroSub: {
    color: "#A98961",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Almarai_400Regular",
    textAlign: "right",
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(242,178,51,0.07)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryRow: {
    flexDirection: "row-reverse",
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },

  summaryCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 19,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  summaryValue: {
    color: "#FDF0DC",
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  summaryLabel: {
    color: "#8A6030",
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
  },

  tabRow: {
    flexDirection: "row-reverse",
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },

  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#21160D",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.08)",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  tabBtnActive: {
    backgroundColor: "rgba(242,178,51,0.10)",
    borderColor: "rgba(242,178,51,0.30)",
  },

  tabText: {
    color: "#8A6030",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  tabTextActive: {
    color: "#F2B233",
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

  errorInfo: {
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
    backgroundColor: "#21160D",
    borderRadius: 24,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.10)",
  },

  cardCancelled: {
    borderColor: "rgba(229,57,53,0.18)",
    opacity: 0.9,
  },

  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },

  orderIdBox: {
    alignItems: "flex-end",
    flex: 1,
  },

  orderLabel: {
    color: "#6D4E2D",
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
    marginBottom: 3,
  },

  orderId: {
    color: "#FDF0DC",
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 11,
    fontFamily: "Almarai_800ExtraBold",
  },

  chefRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#17100B",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.07)",
    padding: 11,
    marginBottom: 10,
  },

  chefIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  chefInfo: {
    flex: 1,
    alignItems: "flex-end",
  },

  chefLabel: {
    color: "#6D4E2D",
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
    marginBottom: 2,
  },

  chefName: {
    color: "#F2B233",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
    textAlign: "right",
  },

  itemsBox: {
    gap: 6,
    marginBottom: 12,
  },

  itemLine: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  itemName: {
    flex: 1,
    color: "#A98961",
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  itemQty: {
    color: "#FDF0DC",
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  noItems: {
    color: "#6D4E2D",
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  moreItems: {
    color: "#F2B233",
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Almarai_700Bold",
    marginTop: 2,
  },

  trackWrap: {
    marginTop: 2,
    marginBottom: 12,
  },

  trackBar: {
    flexDirection: "row-reverse",
    gap: 5,
  },

  trackStep: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(242,178,51,0.12)",
  },

  trackStepDone: {
    backgroundColor: "rgba(242,178,51,0.75)",
  },

  trackStepCurrent: {
    backgroundColor: "#F2B233",
  },

  trackLabels: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 7,
  },

  trackLabel: {
    flex: 1,
    color: "#5A3A18",
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Almarai_400Regular",
  },

  trackLabelDone: {
    color: "#A98961",
    fontFamily: "Almarai_700Bold",
  },

  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(242,178,51,0.07)",
    paddingTop: 12,
  },

  totalWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },

  total: {
    color: "#F2B233",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  footerLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },

  date: {
    color: "#6D4E2D",
    fontSize: 11,
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
    color: "#FDF0DC",
    textAlign: "center",
    fontSize: 16,
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
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F2B233",
    paddingHorizontal: 22,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryBtnText: {
    color: "#17100B",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },
});