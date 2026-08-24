import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
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
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Flame,
  History,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  X,
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
  order_type?: string | null;
  time_negotiation_status?: string | null;
  proposed_time?: string | null;
  confirmed_time?: string | null;
  chefs?: {
    users?: {
      full_name?: string | null;
      gender?: string | null;
    } | null;
  } | null;
  order_items?: any[];
  items?: any[];
};

const makeStatusMeta = (c: Colors): Record<string, any> => ({
  pending: {
    label: "بانتظار القبول",
    color: c.gold,
    bg: c.goldSoft,
    Icon: Clock3,
  },
  accepted: {
    label: "تم القبول",
    color: c.info,
    bg: c.goldSoft,
    Icon: CheckCircle2,
  },
  preparing: {
    label: "قيد التحضير",
    color: c.gold,
    bg: c.goldSoft,
    Icon: Flame,
  },
  ready: {
    label: "جاهز للاستلام/التوصيل",
    color: c.info,
    bg: c.goldSoft,
    Icon: PackageCheck,
  },
  delivering: {
    label: "في الطريق",
    color: c.info,
    bg: c.goldSoft,
    Icon: Truck,
  },
  delivered: {
    label: "تم التسليم",
    color: c.success,
    bg: c.successSoft,
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "ملغي",
    color: c.danger,
    bg: c.dangerSoft,
    Icon: XCircle,
  },
  pending_time: {
    label: "بانتظار تأكيد الوقت",
    color: c.gold,
    bg: c.goldSoft,
    Icon: CalendarClock,
  },
  time_confirmed: {
    label: "تم تأكيد الوقت",
    color: c.success,
    bg: c.successSoft,
    Icon: CalendarClock,
  },
});

const TRACK_STEPS_DELIVERY = [
  { id: "accepted",   label: "قبول" },
  { id: "preparing",  label: "تحضير" },
  { id: "ready",      label: "جاهز" },
  { id: "delivering", label: "توصيل" },
  { id: "delivered",  label: "تسليم" },
];

const TRACK_STEPS_PICKUP = [
  { id: "accepted",  label: "قبول" },
  { id: "preparing", label: "تحضير" },
  { id: "ready",     label: "جاهز للاستلام" },
  { id: "delivered", label: "استلام" },
];

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

function formatDateTime(value: unknown) {
  if (!value) return "";

  try {
    return new Date(String(value)).toLocaleString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getItemName(item: any) {
  return (
    item?.name ||
    item?.menu_items?.name ||
    item?.menu?.name ||
    item?.item_name ||
    "منتج"
  );
}

function getItemQty(item: any) {
  return item?.quantity || item?.qty || 1;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const statusMeta = useMemo(() => makeStatusMeta(c), [c]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

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
          setIsGuest(true);
          setOrders([]);
          return;
        }

        let userData: any = null;

        try {
          userData = JSON.parse(storedUser);
        } catch {
          await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
          setIsGuest(true);
          setOrders([]);
          return;
        }

        if (!userData?.id) {
          setIsGuest(true);
          setOrders([]);
          return;
        }

        setIsGuest(false);

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

  // رد العميل على الوقت البديل الذي اقترحه المتجر
  const respondToTime = useCallback(
    async (orderId: string, action: "accept" | "reject") => {
      if (respondingId) return;
      setRespondingId(orderId);

      try {
        const res = await fetch(`${API}/api/orders/${orderId}/respond-time`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        const json = await res.json().catch(() => null);

        if (res.ok && json?.success) {
          Alert.alert(
            "تم",
            action === "accept"
              ? "تم تأكيد الموعد — المتجر بيبدأ التحضير في وقته."
              : "تم إلغاء الطلب بدون أي رسوم."
          );
          await loadOrders(true);
        } else {
          Alert.alert("تعذر إرسال ردك", json?.message || "حاول مرة ثانية.");
        }
      } catch {
        Alert.alert("مشكلة اتصال", "تأكد من الإنترنت وحاول مرة ثانية.");
      } finally {
        setRespondingId(null);
      }
    },
    [loadOrders, respondingId]
  );

  const confirmReject = useCallback(
    (orderId: string) => {
      Alert.alert(
        "رفض الموعد البديل",
        "رفض الموعد يعني إلغاء الطلب بالكامل بدون رسوم. تبي تكمل؟",
        [
          { text: "تراجع", style: "cancel" },
          {
            text: "رفض وإلغاء",
            style: "destructive",
            onPress: () => respondToTime(orderId, "reject"),
          },
        ]
      );
    },
    [respondToTime]
  );

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
            <ShoppingBag size={24} color={c.gold} strokeWidth={1.8} />
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
            <RefreshCw size={17} color={c.gold} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Package size={17} color={c.gold} strokeWidth={1.7} />
            <Text style={s.summaryValue}>{activeOrders.length}</Text>
            <Text style={s.summaryLabel}>نشطة</Text>
          </View>

          <View style={s.summaryCard}>
            <History size={17} color={c.textSoft} strokeWidth={1.7} />
            <Text style={s.summaryValue}>{historyOrders.length}</Text>
            <Text style={s.summaryLabel}>السجل</Text>
          </View>

          <View style={s.summaryCard}>
            <ShoppingBag size={17} color={c.gold} strokeWidth={1.7} />
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
              color={tab === "active" ? c.gold : c.textSoft}
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
              color={tab === "history" ? c.gold : c.textSoft}
              strokeWidth={1.8}
            />
            <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>
              السجل ({historyOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <TouchableOpacity activeOpacity={0.86} style={s.errorBox} onPress={onRefresh}>
            <AlertCircle size={18} color={c.danger} strokeWidth={1.8} />
            <View style={s.errorInfo}>
              <Text style={s.errorTitle}>حدثت مشكلة</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    c,
    s,
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
      const st = statusMeta[item.status] || statusMeta.pending;
      const StatusIcon = st.Icon;

      const orderItems = item.order_items || item.items || [];
      const TRACK_STEPS = (item as any).delivery_address === "استلام شخصي" ? TRACK_STEPS_PICKUP : TRACK_STEPS_DELIVERY;
      const normalizedKey = item.status === "time_confirmed" ? "accepted" : item.status === "pending_time" ? "pending" : item.status;
      const currentStep = TRACK_STEPS.findIndex((step) => step.id === normalizedKey);
      const chefName = cleanText(item.chefs?.users?.full_name, "متجر");
      const isFinished = ["delivered", "cancelled"].includes(item.status);

      const isPreorder = item.order_type === "preorder";
      const negotiation = item.time_negotiation_status;
      const isResponding = respondingId === String(item.id);

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            s.card,
            item.status === "cancelled" && s.cardCancelled,
            isPreorder && !isFinished && s.cardPreorder,
          ]}
          onPress={() => openOrder(String(item.id))}
        >
          <View style={s.cardHeader}>
            <View style={s.orderIdBox}>
              <Text style={s.orderLabel}>رقم الطلب</Text>
              <Text style={s.orderId}>{shortId(item.id)}</Text>
            </View>

            <View style={s.badgesWrap}>
              {isPreorder ? (
                <View style={s.preorderTag}>
                  <CalendarDays size={10} color={c.gold} strokeWidth={1.9} />
                  <Text style={s.preorderTagText}>حجز مسبق</Text>
                </View>
              ) : null}

              <View style={[s.badge, { backgroundColor: st.bg }]}>
                <StatusIcon size={13} color={st.color} strokeWidth={1.9} />
                <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
          </View>

          <View style={s.chefRow}>
            <View style={s.chefIcon}>
              <Store size={17} color={c.gold} strokeWidth={1.7} />
            </View>

            <View style={s.chefInfo}>
              <Text style={s.chefLabel}>المتجر</Text>
              <Text style={s.chefName} numberOfLines={1}>
                {chefName}
              </Text>
            </View>
          </View>

          {/* مفاوضة وقت الحجز المسبق */}
          {isPreorder && !isFinished && negotiation === "pending" ? (
            <View style={s.timeBoxWaiting}>
              <Clock3 size={14} color={c.gold} strokeWidth={1.9} />
              <Text style={s.timeTextWaiting}>
                {item.proposed_time
                  ? `طلبت التسليم ${formatDateTime(item.proposed_time)} — بانتظار تأكيد المتجر`
                  : "بانتظار تأكيد المتجر لوقت التسليم"}
              </Text>
            </View>
          ) : null}

          {isPreorder && !isFinished && negotiation === "chef_countered" ? (
            <View style={s.counterBox}>
              <View style={s.counterHead}>
                <CalendarClock size={15} color={c.gold} strokeWidth={1.9} />
                <Text style={s.counterTitle}>المتجر اقترح موعداً بديلاً</Text>
              </View>

              {item.proposed_time ? (
                <Text style={s.counterOld}>
                  موعدك السابق: {formatDateTime(item.proposed_time)}
                </Text>
              ) : null}

              <Text style={s.counterNew}>
                الموعد المقترح: {formatDateTime(item.confirmed_time)}
              </Text>

              {isResponding ? (
                <ActivityIndicator color={c.gold} style={{ marginTop: 12 }} />
              ) : (
                <View style={s.counterBtns}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={s.counterAccept}
                    onPress={() => respondToTime(String(item.id), "accept")}
                  >
                    <Check size={14} color={c.success} strokeWidth={2.2} />
                    <Text style={s.counterAcceptText}>أوافق على الموعد</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={s.counterReject}
                    onPress={() => confirmReject(String(item.id))}
                  >
                    <X size={14} color={c.danger} strokeWidth={2.2} />
                    <Text style={s.counterRejectText}>رفض</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {isPreorder && !isFinished && negotiation === "accepted" && item.confirmed_time ? (
            <View style={s.timeBoxConfirmed}>
              <CheckCircle2 size={14} color={c.success} strokeWidth={1.9} />
              <Text style={s.timeTextConfirmed}>
                الموعد المؤكد: {formatDateTime(item.confirmed_time)}
              </Text>
            </View>
          ) : null}

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
              <Text style={s.noItems}>لا توجد تفاصيل منتجات</Text>
            ) : null}

            {orderItems.length > 2 ? (
              <Text style={s.moreItems}>+ {orderItems.length - 2} منتجات أخرى</Text>
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
              <CircleDollarSign size={16} color={c.gold} strokeWidth={1.8} />
              <Text style={s.total}>{money(item.total)}</Text>
            </View>

            <View style={s.footerLeft}>
              <Text style={s.date}>{formatDate(item.created_at)}</Text>
              <ChevronLeft size={18} color={c.textMuted} strokeWidth={1.8} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [c, s, statusMeta, confirmReject, openOrder, respondToTime, respondingId]
  );

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>جاري تحميل طلباتك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isGuest) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.guestWrap}>
          <View style={s.guestIcon}>
            <ShoppingBag size={54} color={c.gold} strokeWidth={1.4} />
          </View>

          <Text style={s.guestTitle}>سجل دخولك أولًا</Text>
          <Text style={s.guestSub}>
            عشان تتابع طلباتك من القبول حتى التسليم.
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={s.primaryBtn}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={s.primaryBtnText}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={s.guestSecondaryBtn}
            onPress={goHome}
          >
            <Text style={s.guestSecondaryText}>تصفح بدون تسجيل</Text>
          </TouchableOpacity>
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
            tintColor={c.gold}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              {tab === "active" ? (
                <Package size={54} color={c.textMuted} strokeWidth={1.5} />
              ) : (
                <History size={54} color={c.textMuted} strokeWidth={1.5} />
              )}
            </View>

            <Text style={s.emptyTitle}>
              {tab === "active" ? "ما عندك طلبات نشطة" : "ما عندك سجل طلبات"}
            </Text>

            <Text style={s.emptySub}>
              {tab === "active"
                ? "ابدأ طلبك من المتاجر المنزلية القريبة منك."
                : "الطلبات المكتملة أو الملغية تظهر هنا."}
            </Text>

            {tab === "active" ? (
              <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={goHome}>
                <ShoppingBag size={17} color={c.onGold} strokeWidth={2} />
                <Text style={s.primaryBtnText}>اطلب الآن</Text>
              </TouchableOpacity>
            ) : null}
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

  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 24,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },

  heroInfo: {
    flex: 1,
    alignItems: "flex-end",
  },

  heroTitle: {
    color: c.text,
    fontSize: 20,
    fontFamily: "Almarai_800ExtraBold",
  },

  heroSub: {
    color: c.textSoft,
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Almarai_400Regular",
    textAlign: "right",
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: c.goldSoft,
    borderWidth: 1,
    borderColor: c.border,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  summaryValue: {
    color: c.text,
    fontSize: 17,
    fontFamily: "Almarai_800ExtraBold",
  },

  summaryLabel: {
    color: c.textSoft,
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
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.goldSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  tabBtnActive: {
    backgroundColor: c.border,
    borderColor: c.goldBorder,
  },

  tabText: {
    color: c.textSoft,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  tabTextActive: {
    color: c.gold,
    fontFamily: "Almarai_800ExtraBold",
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
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
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },

  cardCancelled: {
    borderColor: c.dangerSoft,
    opacity: 0.9,
  },

  cardPreorder: {
    borderColor: c.border,
    backgroundColor: c.surface,
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
    color: c.textMuted,
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
    marginBottom: 3,
  },

  orderId: {
    color: c.text,
    fontSize: 14,
    fontFamily: "Almarai_800ExtraBold",
  },

  badgesWrap: {
    alignItems: "flex-start",
    gap: 6,
  },

  preorderTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: c.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  preorderTagText: {
    color: c.gold,
    fontSize: 10,
    fontFamily: "Almarai_700Bold",
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
    backgroundColor: c.bg,
    borderWidth: 1,
    borderColor: c.goldSoft,
    padding: 11,
    marginBottom: 10,
  },

  chefIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: c.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  chefInfo: {
    flex: 1,
    alignItems: "flex-end",
  },

  chefLabel: {
    color: c.textMuted,
    fontSize: 10,
    fontFamily: "Almarai_400Regular",
    marginBottom: 2,
  },

  chefName: {
    color: c.gold,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
    textAlign: "right",
  },

  timeBoxWaiting: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    backgroundColor: c.border,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 11,
    marginBottom: 10,
  },

  timeTextWaiting: {
    flex: 1,
    color: c.gold,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Almarai_700Bold",
  },

  timeBoxConfirmed: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    backgroundColor: c.border,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 11,
    marginBottom: 10,
  },

  timeTextConfirmed: {
    flex: 1,
    color: c.success,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "Almarai_700Bold",
  },

  counterBox: {
    backgroundColor: c.border,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
  },

  counterHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },

  counterTitle: {
    color: c.gold,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  counterOld: {
    color: c.textSoft,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 19,
    fontFamily: "Almarai_400Regular",
    textDecorationLine: "line-through",
  },

  counterNew: {
    color: c.text,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 22,
    marginTop: 3,
    fontFamily: "Almarai_800ExtraBold",
  },

  counterBtns: {
    flexDirection: "row-reverse",
    gap: 8,
    marginTop: 12,
  },

  counterAccept: {
    flex: 2,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: c.border,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  counterAcceptText: {
    color: c.success,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
  },

  counterReject: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: c.dangerSoft,
    borderWidth: 1,
    borderColor: c.dangerSoft,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  counterRejectText: {
    color: c.danger,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
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
    color: c.textSoft,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  itemQty: {
    color: c.text,
    fontSize: 12,
    fontFamily: "Almarai_700Bold",
  },

  noItems: {
    color: c.textMuted,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Almarai_400Regular",
  },

  moreItems: {
    color: c.gold,
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
    backgroundColor: c.border,
  },

  trackStepDone: {
    backgroundColor: c.goldBorder,
  },

  trackStepCurrent: {
    backgroundColor: c.gold,
  },

  trackLabels: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 7,
  },

  trackLabel: {
    flex: 1,
    color: c.textMuted,
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Almarai_400Regular",
  },

  trackLabelDone: {
    color: c.textSoft,
    fontFamily: "Almarai_700Bold",
  },

  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.goldSoft,
    paddingTop: 12,
  },

  totalWrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },

  total: {
    color: c.gold,
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  footerLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },

  date: {
    color: c.textMuted,
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
    fontSize: 16,
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
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: c.gold,
    paddingHorizontal: 22,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryBtnText: {
    color: c.bg,
    fontSize: 13,
    fontFamily: "Almarai_800ExtraBold",
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

  guestSecondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },

  guestSecondaryText: {
    color: c.textSoft,
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});