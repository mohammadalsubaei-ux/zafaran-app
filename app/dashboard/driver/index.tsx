import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type Colors } from "@/context/ThemeContext";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken } from "@/utils/authFetch";
import * as Location from "expo-location";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";
import {
  RefreshCw, Truck, Package, CheckCircle2, MapPin, User, Phone,
  Navigation, LogOut, CircleAlert, Clock3, BadgeCheck, Filter,
  ClipboardList, Wallet, TrendingUp, Radio,
  ArrowRight
} from "lucide-react-native";

const API            = "https://zafaran-backend-production.up.railway.app";
const AVAILABILITY_KEY = "driver_availability";
const LANG_KEY         = "driver_lang";
const LOCATION_INTERVAL = 10000; // 10 ثواني

type Lang        = "ar" | "en";
type TabType     = "active" | "history";
type OrderFilter = "all" | "ready" | "delivering";

const T = {
  title:            { ar: "لوحة المندوب",              en: "Driver Dashboard"     },
  loading:          { ar: "جاري تحميل لوحة المندوب...", en: "Loading..."           },
  heroTitle:        { ar: "إدارة التوصيل",              en: "Delivery Management"  },
  heroSub:          { ar: "استلم الطلبات الجاهزة، تحرك للعميل، وأنهِ التوصيل بسهولة.", en: "Pick up ready orders, navigate to the customer, and complete deliveries easily." },
  available:        { ar: "أنا متاح للتوصيل",           en: "Available for delivery" },
  availOn:          { ar: "تظهر لك الطلبات الآن",      en: "Orders are visible now"  },
  availOff:         { ar: "أنت مخفي عن الطلبات الآن",  en: "You are hidden from orders" },
  active:           { ar: "النشطة",                     en: "Active"               },
  history:          { ar: "السجل",                      en: "History"              },
  all:              { ar: "الكل",                       en: "All"                  },
  ready:            { ar: "المتاحة",                    en: "Available"            },
  delivering:       { ar: "طلباتي",                     en: "My Orders"            },
  showOrders:       { ar: "عرض الطلبات",                en: "Show Orders"          },
  allOrders:        { ar: "كل الطلبات",                 en: "All Orders"           },
  readyShort:       { ar: "جاهز",                       en: "Ready"                },
  deliveringShort:  { ar: "في الطريق",                  en: "On Way"               },
  completed:        { ar: "مكتملة",                     en: "Completed"            },
  earningsToday:    { ar: "أرباح اليوم",                en: "Today Earnings"       },
  deliveriesToday:  { ar: "توصيلات اليوم",              en: "Today Deliveries"     },
  totalDeliveries:  { ar: "إجمالي التوصيلات",           en: "Total Deliveries"     },
  total:            { ar: "الإجمالي",                   en: "Total"                },
  myShare:          { ar: "نصيبي",                      en: "My share"             },
  sar:              { ar: "ريال",                        en: "SAR"                  },
  customer:         { ar: "عميل",                       en: "Customer"             },
  noPhone:          { ar: "غير متوفر",                  en: "Not available"        },
  noAddress:        { ar: "لا يوجد عنوان",              en: "No address"           },
  call:             { ar: "اتصال",                      en: "Call"                 },
  map:              { ar: "الخريطة",                    en: "Map"                  },
  noLocation:       { ar: "لا يوجد موقع",               en: "No location"          },
  pickup:           { ar: "استلم الطلب وابدأ التوصيل",  en: "Pick up & start delivery" },
  delivered:        { ar: "تم التسليم",                  en: "Mark as delivered"    },
  logout:           { ar: "خروج",                        en: "Logout"               },
  logoutConfirm:    { ar: "تبي تطلع من حسابك؟",         en: "Do you want to logout?" },
  yes:              { ar: "نعم",                         en: "Yes"                  },
  no:               { ar: "لا",                          en: "No"                   },
  done:             { ar: "تم",                          en: "Done"                 },
  pickedUp:         { ar: "تم استلام الطلب.",            en: "Order picked up."     },
  deliveredDone:    { ar: "تم تسليم الطلب.",             en: "Order delivered."     },
  error:            { ar: "خطأ",                         en: "Error"                },
  problem:          { ar: "حدثت مشكلة",                  en: "Something went wrong" },
  loadError:        { ar: "تعذر تحميل الطلبات.",         en: "Failed to load orders." },
  connectionError:  { ar: "تعذر الاتصال بالخادم.",       en: "Failed to connect."   },
  updateError:      { ar: "تعذر تحديث حالة الطلب.",      en: "Failed to update."    },
  noActive:         { ar: "ما فيه طلبات حالياً",         en: "No orders right now"  },
  noHistory:        { ar: "ما فيه سجل بعد",              en: "No history yet"       },
  noHistorySub:     { ar: "الطلبات المسلمة ستظهر هنا.",  en: "Delivered orders will appear here." },
  unavailableTitle: { ar: "أنت غير متاح حالياً",         en: "You are unavailable"  },
  unavailableSub:   { ar: "فعّل التوفر حتى تظهر لك الطلبات.", en: "Enable availability to see orders." },
  trackingOn:       { ar: "تتبع الموقع نشط",             en: "Location tracking on" },
  trackingOff:      { ar: "توقف التتبع",                  en: "Tracking stopped"     },
};

const makeSTATUS = (c: Colors): any => ({
  ready:      { ar: "جاهز للتوصيل", en: "Ready",      color: c.info, bg: c.goldSoft },
  delivering: { ar: "في الطريق",    en: "On the way", color: c.info, bg: c.goldSoft  },
  delivered:  { ar: "تم التسليم",   en: "Delivered",  color: c.success, bg: c.goldSoft  },
});

function tr(key: keyof typeof T, lang: Lang): string {
  return T[key][lang] || T[key].ar;
}

function money(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2).replace(".00", "") : "0";
}

function isToday(dateValue: any) {
  if (!dateValue) return false;
  return new Date(dateValue).toDateString() === new Date().toDateString();
}

export default function DriverScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const statusMap = useMemo(() => makeSTATUS(c), [c]);

  const [lang, setLang]             = useState<Lang>("ar");
  const isRTL                        = lang === "ar";
  const [tab, setTab]               = useState<TabType>("active");
  const [filter, setFilter]         = useState<OrderFilter>("all");
  const [readyOrders, setReadyOrders]     = useState<any[]>([]);
  const [myOrders, setMyOrders]           = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [driverId, setDriverId]     = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<"loading" | "ok" | "unverified" | "missing">("loading");

  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  // جلب driver_id
  const loadDriverId = useCallback(async () => {
    try {
      const u = await AsyncStorage.getItem("user");
      if (!u) return;
      let user: any = null;
      try { user = JSON.parse(u); } catch { return; }
      if (!user?.id) return;
      // جلب من جدول drivers
      const res  = await fetch(`${API}/api/drivers/user/${user.id}`);
      const json = await res.json().catch(() => null);
      if (json?.success && json.data?.id) {
        setDriverId(json.data.id);
        await AsyncStorage.setItem("driver_id", json.data.id);
        setProfileStatus(json.data.is_verified ? "ok" : "unverified");
      } else {
        // لا فولباك على user.id ابدا — يسبب اخطاء foreign key بقاعدة البيانات
        setProfileStatus("missing");
      }
    } catch {}
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const [availableStored, langStored] = await Promise.all([
        AsyncStorage.getItem(AVAILABILITY_KEY),
        AsyncStorage.getItem(LANG_KEY),
      ]);
      if (availableStored !== null) setIsAvailable(availableStored === "true");
      if (langStored === "ar" || langStored === "en") setLang(langStored as Lang);
    } catch {}
  }, []);

  const toggleLang = useCallback(async () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { await AsyncStorage.setItem(LANG_KEY, next); } catch {}
  }, [lang]);

  const saveAvailability = useCallback(async (value: boolean) => {
    try {
      await AsyncStorage.setItem(AVAILABILITY_KEY, value ? "true" : "false");
      if (driverId) {
        await fetch(`${API}/api/drivers/${driverId}/availability`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_available: value }),
        });
      }
    } catch {}
  }, [driverId]);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [readyRes, deliveringRes, deliveredRes] = await Promise.all([
        fetch(`${API}/api/orders?status=ready`),
        fetch(`${API}/api/orders?status=delivering`),
        fetch(`${API}/api/orders?status=delivered`),
      ]);
      const readyJson      = await readyRes.json().catch(() => null);
      const deliveringJson = await deliveringRes.json().catch(() => null);
      const deliveredJson  = await deliveredRes.json().catch(() => null);

      if (!readyRes.ok || !deliveringRes.ok || !deliveredRes.ok) {
        setError(tr("loadError", lang)); return;
      }
      setReadyOrders(readyJson?.success     ? readyJson.data      || [] : []);
      const allDelivering = deliveringJson?.success ? deliveringJson.data || [] : [];
      setMyOrders(driverId ? allDelivering.filter((o: any) => o.driver_id === driverId) : allDelivering);
      setHistoryOrders(deliveredJson?.success ? deliveredJson.data || [] : []);
    } catch {
      setError(tr("connectionError", lang));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lang, driverId]);

  useEffect(() => { loadSettings(); loadDriverId(); }, [loadSettings, loadDriverId]);
  useEffect(() => { loadOrders(false); }, [loadOrders]);
  useFocusEffect(useCallback(() => { loadOrders(true); }, [loadOrders]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(true);
  }, [loadOrders]);

  const toggleAvailability = useCallback(async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    await saveAvailability(next);
  }, [isAvailable, saveAvailability]);

  // ━━━ إرسال الموقع ━━━
  const sendLocation = useCallback(async (orderId: string, dId: string) => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await fetch(`${API}/api/tracking/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: dId,
          lat:       loc.coords.latitude,
          lng:       loc.coords.longitude,
          heading:   loc.coords.heading,
          speed:     loc.coords.speed,
        }),
      });
    } catch {}
  }, []);

  const startTracking = useCallback(async (orderId: string) => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return;

    const dId = driverId || (await AsyncStorage.getItem("driver_id")) || "";
    if (!dId) return;

    setIsTracking(true);
    setTrackingOrderId(orderId);

    // إرسال فوري
    await sendLocation(orderId, dId);

    // إرسال كل 10 ثواني
    locationIntervalRef.current = setInterval(() => {
      sendLocation(orderId, dId);
    }, LOCATION_INTERVAL);
  }, [driverId, sendLocation]);

  const stopTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    setIsTracking(false);
    setTrackingOrderId(null);
  }, []);

  // تنظيف عند إغلاق الشاشة
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, []);

  const updateStatus = useCallback(async (orderId: string, status: "delivering" | "delivered") => {
    if (!driverId) {
      Alert.alert(tr("error", lang), tr("updateError", lang));
      return;
    }

    setActionOrderId(orderId);
    try {
      // نستخدم مسارات المندوب المخصصة (بدل تعديل حالة الطلب العام مباشرة)
      // عشان يترابط driver_id بالطلب فعلياً وتتحدث أرباح/إحصائيات المندوب
      const endpoint = status === "delivering"
        ? `${API}/api/drivers/${driverId}/accept/${orderId}`
        : `${API}/api/drivers/${driverId}/delivered/${orderId}`;

      const res  = await fetch(endpoint, { method: "POST" });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        Alert.alert(tr("done", lang), status === "delivering" ? tr("pickedUp", lang) : tr("deliveredDone", lang));

        if (status === "delivering") {
          await startTracking(orderId);
        } else if (status === "delivered") {
          stopTracking();
        }

        await loadOrders(true);
      } else {
        Alert.alert(tr("error", lang), json?.message || tr("updateError", lang));
      }
    } catch {
      Alert.alert(tr("error", lang), tr("updateError", lang));
    } finally {
      setActionOrderId(null);
    }
  }, [driverId, lang, loadOrders, startTracking, stopTracking]);

  const openMap = useCallback((lat?: number, lng?: number) => {
    if (!lat || !lng) { Alert.alert(tr("error", lang), tr("noLocation", lang)); return; }
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
      .catch(() => Alert.alert(tr("error", lang), tr("noLocation", lang)));
  }, [lang]);

  const callCustomer = useCallback((phone?: string) => {
    if (!phone) { Alert.alert(tr("error", lang), tr("noPhone", lang)); return; }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(tr("error", lang), tr("noPhone", lang)));
  }, [lang]);

  const logout = useCallback(() => {
    Alert.alert(tr("logout", lang), tr("logoutConfirm", lang), [
      { text: tr("no", lang), style: "cancel" },
      { text: tr("yes", lang), style: "destructive", onPress: async () => {
        stopTracking();
        await AsyncStorage.multiRemove(["user", "user_id", "driver_id", "chef_id", "role", "push_token", "cart_state"]);
      clearToken();
        router.replace("/login" as any);
      }},
    ]);
  }, [lang, router, stopTracking]);

  const activeOrders = useMemo(() => [...myOrders, ...readyOrders], [myOrders, readyOrders]);

  const visibleOrders = useMemo(() => {
    if (tab === "history") return historyOrders;
    if (!isAvailable) return [];
    if (filter === "ready")     return readyOrders;
    if (filter === "delivering") return myOrders;
    return activeOrders;
  }, [activeOrders, filter, historyOrders, isAvailable, myOrders, readyOrders, tab]);

  const todayHistory  = useMemo(() => historyOrders.filter(o => isToday(o.delivered_at || o.created_at)), [historyOrders]);
  const todayEarnings = useMemo(() => todayHistory.reduce((sum, o) => sum + Number(o.driver_share || 0), 0), [todayHistory]);

  const filterButton = (id: OrderFilter, label: string, count: number) => {
    const active = filter === id;
    return (
      <TouchableOpacity key={id} style={[s.filterBtn, active && s.filterBtnActive]}
        onPress={() => setFilter(id)} activeOpacity={0.88}>
        <Text style={[s.filterBtnText, active && s.filterBtnTextActive]}>{label} ({count})</Text>
      </TouchableOpacity>
    );
  };

  const renderOrder = ({ item }: { item: any }) => {
    const statusMeta = statusMap[item.status] || statusMap.ready;
    const isBusy     = actionOrderId === item.id;
    const isHistory  = item.status === "delivered";
    const isThisTracking = trackingOrderId === item.id;

    return (
      <View style={[s.card, item.status === "delivering" && s.cardActive, isHistory && s.cardHistory]}>
        <View style={[s.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={s.orderHeadRight}>
            <Text style={[s.orderId, { textAlign: isRTL ? "right" : "left" }]}>
              #{String(item.id).slice(0, 8)}
            </Text>
            <View style={[s.badge, { backgroundColor: statusMeta.bg }]}>
              <Text style={[s.badgeText, { color: statusMeta.color }]}>
                {lang === "ar" ? statusMeta.ar : statusMeta.en}
              </Text>
            </View>
            {isThisTracking && (
              <View style={s.trackingBadge}>
                <Radio size={10} color={c.success} strokeWidth={2} />
                <Text style={s.trackingBadgeText}>{tr("trackingOn", lang)}</Text>
              </View>
            )}
          </View>

          <View style={s.totalBox}>
            <Text style={s.totalValue}>{money(item.driver_share)} {tr("sar", lang)}</Text>
            <Text style={s.totalLabel}>{tr("myShare", lang)}</Text>
          </View>
        </View>

        <View style={s.infoBlock}>
          <View style={[s.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <User size={14} color={c.gold} strokeWidth={1.7} />
            <Text style={[s.infoTextStrong, { textAlign: isRTL ? "right" : "left" }]}>
              {item.users?.full_name || tr("customer", lang)}
            </Text>
          </View>
          <View style={[s.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Phone size={14} color={c.gold} strokeWidth={1.7} />
            <Text style={[s.infoText, { textAlign: isRTL ? "right" : "left" }]}>
              {item.users?.phone || tr("noPhone", lang)}
            </Text>
          </View>
          <View style={[s.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <MapPin size={14} color={c.gold} strokeWidth={1.7} />
            <Text style={[s.infoTextAddress, { textAlign: isRTL ? "right" : "left" }]}>
              {item.delivery_address || tr("noAddress", lang)}
            </Text>
          </View>
          <View style={[s.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Clock3 size={14} color={c.gold} strokeWidth={1.7} />
            <Text style={[s.infoText, { textAlign: isRTL ? "right" : "left" }]}>
              {item.created_at ? new Date(item.created_at).toLocaleString(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-US") : "—"}
            </Text>
          </View>
        </View>

        {!isHistory && (
          <View style={[s.actionsGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <TouchableOpacity style={s.secBtn} onPress={() => callCustomer(item.users?.phone)} activeOpacity={0.88}>
              <Phone size={14} color={c.gold} strokeWidth={1.8} />
              <Text style={s.secBtnText}>{tr("call", lang)}</Text>
            </TouchableOpacity>
            {item.delivery_lat && item.delivery_lng ? (
              <TouchableOpacity style={s.secBtnBlue} onPress={() => openMap(item.delivery_lat, item.delivery_lng)} activeOpacity={0.88}>
                <Navigation size={14} color={c.info} strokeWidth={1.8} />
                <Text style={s.secBtnBlueText}>{tr("map", lang)}</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.secBtnDisabled}>
                <Navigation size={14} color={c.textMuted} strokeWidth={1.8} />
                <Text style={s.secBtnDisabledText}>{tr("noLocation", lang)}</Text>
              </View>
            )}
          </View>
        )}

        {item.status === "ready" && (
          <TouchableOpacity style={s.primaryBtn} onPress={() => updateStatus(item.id, "delivering")} disabled={isBusy} activeOpacity={0.9}>
            {isBusy ? <ActivityIndicator color={c.onGold} /> : (
              <View style={[s.btnInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Truck size={15} color={c.onGold} strokeWidth={2} />
                <Text style={s.primaryBtnText}>{tr("pickup", lang)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {item.status === "delivering" && (
          <TouchableOpacity style={s.successBtn} onPress={() => updateStatus(item.id, "delivered")} disabled={isBusy} activeOpacity={0.9}>
            {isBusy ? <ActivityIndicator color={c.surface} /> : (
              <View style={[s.btnInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <CheckCircle2 size={15} color={c.surface} strokeWidth={2} />
                <Text style={s.successBtnText}>{tr("delivered", lang)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.gold} size="large" />
          <Text style={s.loadingText}>{tr("loading", lang)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profileStatus === "unverified") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <Text style={[s.loadingText, { fontSize: 17, marginBottom: 6 }]}>
            {lang === "ar" ? "حسابك قيد المراجعة" : "Your account is under review"}
          </Text>
          <Text style={[s.loadingText, { textAlign: "center", paddingHorizontal: 34 }]}>
            {lang === "ar" ? "بنرسل لك اشعارا فور توثيق حسابك وتقدر تبدأ التوصيل" : "We will notify you once your account is verified"}
          </Text>
          <TouchableOpacity onPress={loadDriverId} activeOpacity={0.85} style={{ marginTop: 18, paddingVertical: 10, paddingHorizontal: 28, borderRadius: 12, borderWidth: 1, borderColor: c.goldSoft }}>
            <Text style={{ color: c.gold, fontFamily: "Almarai_700Bold", fontSize: 13 }}>{lang === "ar" ? "تحديث" : "Refresh"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} activeOpacity={0.85} style={{ marginTop: 14 }}>
            <Text style={{ color: c.danger, fontFamily: "Almarai_700Bold", fontSize: 13 }}>{lang === "ar" ? "تسجيل خروج" : "Log out"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (profileStatus === "missing") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <Text style={[s.loadingText, { fontSize: 17, marginBottom: 6 }]}>
            {lang === "ar" ? "تعذر العثور على ملفك كمندوب" : "Driver profile not found"}
          </Text>
          <Text style={[s.loadingText, { textAlign: "center", paddingHorizontal: 34 }]}>
            {lang === "ar" ? "جرب تحديث الصفحة، ولو استمرت المشكلة سجل خروجا واعد التسجيل" : "Try refreshing, or log out and register again"}
          </Text>
          <TouchableOpacity onPress={loadDriverId} activeOpacity={0.85} style={{ marginTop: 18, paddingVertical: 10, paddingHorizontal: 28, borderRadius: 12, borderWidth: 1, borderColor: c.goldSoft }}>
            <Text style={{ color: c.gold, fontFamily: "Almarai_700Bold", fontSize: 13 }}>{lang === "ar" ? "اعادة المحاولة" : "Retry"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} activeOpacity={0.85} style={{ marginTop: 14 }}>
            <Text style={{ color: c.danger, fontFamily: "Almarai_700Bold", fontSize: 13 }}>{lang === "ar" ? "تسجيل خروج" : "Log out"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity style={s.backHomeBtn} onPress={() => router.push("/(tabs)" as any)} activeOpacity={0.85}>
            <ArrowRight size={20} color={c.gold} />
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
            <LogOut size={20} color={c.danger} strokeWidth={1.9} />
          </TouchableOpacity>
        </View>

        <View style={[s.headerTitleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Truck size={17} color={c.gold} strokeWidth={1.8} />
          <Text style={s.title}>{tr("title", lang)}</Text>
        </View>

        <View style={s.headerActions}>
          <TouchableOpacity style={s.langBtn} onPress={toggleLang} activeOpacity={0.85}>
            <Text style={s.langBtnText}>{lang === "ar" ? "EN" : "عر"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => loadOrders(true)} activeOpacity={0.85}>
            <RefreshCw size={18} color={c.gold} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* شريط التتبع النشط */}
      {isTracking && (
        <View style={s.trackingBar}>
          <Radio size={14} color={c.success} strokeWidth={2} />
          <Text style={s.trackingBarText}>{tr("trackingOn", lang)}</Text>
        </View>
      )}

      <FlatList
        data={visibleOrders}
        keyExtractor={item => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
        ListHeaderComponent={
          <View>
            <View style={s.heroCard}>
              <View style={[s.heroTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={s.heroIcon}><Truck size={22} color={c.gold} strokeWidth={1.8} /></View>
                <View style={s.heroInfo}>
                  <Text style={[s.heroTitle, { textAlign: isRTL ? "right" : "left" }]}>{tr("heroTitle", lang)}</Text>
                  <Text style={[s.heroSub, { textAlign: isRTL ? "right" : "left" }]}>{tr("heroSub", lang)}</Text>
                </View>
              </View>
              <View style={[s.availRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={s.availTextWrap}>
                  <Text style={[s.availTitle, { textAlign: isRTL ? "right" : "left" }]}>{tr("available", lang)}</Text>
                  <Text style={[s.availSub, { color: isAvailable ? c.success : c.danger, textAlign: isRTL ? "right" : "left" }]}>
                    {isAvailable ? tr("availOn", lang) : tr("availOff", lang)}
                  </Text>
                </View>
                <TouchableOpacity style={[s.toggle, isAvailable && s.toggleOn]} onPress={toggleAvailability} activeOpacity={0.9}>
                  <View style={[s.toggleThumb, isAvailable && s.toggleThumbOn]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.earningsCard, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={s.earningItem}>
                <TrendingUp size={18} color={c.success} strokeWidth={1.8} />
                <Text style={[s.earningValue, { color: c.success }]}>{money(todayEarnings)}</Text>
                <Text style={s.earningLabel}>{tr("earningsToday", lang)}</Text>
              </View>
              <View style={s.earningDivider} />
              <View style={s.earningItem}>
                <Package size={18} color={c.gold} strokeWidth={1.8} />
                <Text style={[s.earningValue, { color: c.gold }]}>{todayHistory.length}</Text>
                <Text style={s.earningLabel}>{tr("deliveriesToday", lang)}</Text>
              </View>
              <View style={s.earningDivider} />
              <View style={s.earningItem}>
                <Wallet size={18} color={c.info} strokeWidth={1.8} />
                <Text style={[s.earningValue, { color: c.info }]}>{historyOrders.length}</Text>
                <Text style={s.earningLabel}>{tr("totalDeliveries", lang)}</Text>
              </View>
            </View>

            <View style={[s.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={s.statCard}>
                <Package size={17} color={c.gold} strokeWidth={1.7} />
                <Text style={s.statValue}>{activeOrders.length}</Text>
                <Text style={s.statLabel}>{tr("allOrders", lang)}</Text>
              </View>
              <View style={s.statCard}>
                <BadgeCheck size={17} color={c.info} strokeWidth={1.7} />
                <Text style={[s.statValue, { color: c.info }]}>{readyOrders.length}</Text>
                <Text style={s.statLabel}>{tr("readyShort", lang)}</Text>
              </View>
              <View style={s.statCard}>
                <Truck size={17} color={c.info} strokeWidth={1.7} />
                <Text style={[s.statValue, { color: c.info }]}>{myOrders.length}</Text>
                <Text style={s.statLabel}>{tr("deliveringShort", lang)}</Text>
              </View>
              <View style={s.statCard}>
                <CheckCircle2 size={17} color={c.success} strokeWidth={1.7} />
                <Text style={[s.statValue, { color: c.success }]}>{historyOrders.length}</Text>
                <Text style={s.statLabel}>{tr("completed", lang)}</Text>
              </View>
            </View>

            <View style={[s.tabRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity style={[s.tabBtn, tab === "active" && s.tabBtnActive]} onPress={() => setTab("active")} activeOpacity={0.88}>
                <Truck size={14} color={tab === "active" ? c.gold : c.textSoft} strokeWidth={1.8} />
                <Text style={[s.tabText, tab === "active" && s.tabTextActive]}>{tr("active", lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tabBtn, tab === "history" && s.tabBtnActive]} onPress={() => setTab("history")} activeOpacity={0.88}>
                <ClipboardList size={14} color={tab === "history" ? c.gold : c.textSoft} strokeWidth={1.8} />
                <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>{tr("history", lang)} ({historyOrders.length})</Text>
              </TouchableOpacity>
            </View>

            {tab === "active" && (
              <View style={s.filterRow}>
                <View style={[s.filterTitleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Filter size={15} color={c.gold} strokeWidth={1.8} />
                  <Text style={s.filterTitle}>{tr("showOrders", lang)}</Text>
                </View>
                <View style={[s.filterBtnsWrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {filterButton("all",        tr("all",        lang), activeOrders.length)}
                  {filterButton("ready",      tr("ready",      lang), readyOrders.length)}
                  {filterButton("delivering", tr("delivering", lang), myOrders.length)}
                </View>
              </View>
            )}

            {error && (
              <View style={[s.errorBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <CircleAlert size={18} color={c.danger} strokeWidth={1.8} />
                <View style={s.errorTextWrap}>
                  <Text style={[s.errorTitle, { textAlign: isRTL ? "right" : "left" }]}>{tr("problem", lang)}</Text>
                  <Text style={[s.errorText,  { textAlign: isRTL ? "right" : "left" }]}>{error}</Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          tab === "history" ? (
            <View style={s.emptyWrap}>
              <ClipboardList size={54} color={c.textMuted} strokeWidth={1.5} />
              <Text style={s.emptyTitle}>{tr("noHistory", lang)}</Text>
              <Text style={s.emptySub}>{tr("noHistorySub", lang)}</Text>
            </View>
          ) : !isAvailable ? (
            <View style={s.emptyWrap}>
              <Truck size={54} color={c.textMuted} strokeWidth={1.5} />
              <Text style={s.emptyTitle}>{tr("unavailableTitle", lang)}</Text>
              <Text style={s.emptySub}>{tr("unavailableSub", lang)}</Text>
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <Package size={54} color={c.textMuted} strokeWidth={1.5} />
              <Text style={s.emptyTitle}>{tr("noActive", lang)}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe:            { flex: 1, backgroundColor: c.bg },
  loadingWrap:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText:     { color: c.text, fontSize: 14, fontFamily: "Almarai_700Bold" },
  header:          { minHeight: 66, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.goldSoft, alignItems: "center", justifyContent: "space-between" },
  headerBtn:       { width: 42, height: 42, borderRadius: 15, backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  logoutBtn:       { width: 42, height: 42, borderRadius: 15, backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.dangerSoft, alignItems: "center", justifyContent: "center" },
  backHomeBtn:     { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  headerTitleRow:  { alignItems: "center", gap: 7 },
  title:           { color: c.text, fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  headerActions:   { flexDirection: "row", alignItems: "center", gap: 8 },
  langBtn:         { width: 42, height: 42, borderRadius: 15, backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  langBtnText:     { color: c.gold, fontSize: 12, fontFamily: "Almarai_800ExtraBold" },
  trackingBar:     { backgroundColor: c.successSoft, borderBottomWidth: 1, borderBottomColor: c.successSoft, paddingVertical: 6, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  trackingBarText: { color: c.success, fontSize: 12, fontFamily: "Almarai_700Bold" },
  listContent:     { padding: 16, paddingBottom: 40 },
  heroCard:        { backgroundColor: c.surface, borderRadius: 28, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
  heroTop:         { alignItems: "center", gap: 12, marginBottom: 14 },
  heroIcon:        { width: 56, height: 56, borderRadius: 18, backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  heroInfo:        { flex: 1 },
  heroTitle:       { color: c.text, fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  heroSub:         { color: c.textSoft, marginTop: 5, fontSize: 12, lineHeight: 20, fontFamily: "Almarai_400Regular" },
  availRow:        { justifyContent: "space-between", alignItems: "center", backgroundColor: c.bg, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.goldSoft },
  availTextWrap:   { flex: 1 },
  availTitle:      { color: c.text, fontSize: 14, fontFamily: "Almarai_700Bold" },
  availSub:        { marginTop: 4, fontSize: 11, fontFamily: "Almarai_400Regular" },
  toggle:          { width: 52, height: 30, borderRadius: 15, backgroundColor: c.surfaceAlt, padding: 4 },
  toggleOn:        { backgroundColor: c.gold },
  toggleThumb:     { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleThumbOn:   { transform: [{ translateX: 22 }] },
  earningsCard:    { backgroundColor: c.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: c.goldSoft, marginBottom: 12, justifyContent: "space-around", alignItems: "center" },
  earningItem:     { flex: 1, alignItems: "center", gap: 4 },
  earningValue:    { fontSize: 20, fontFamily: "Almarai_800ExtraBold" },
  earningLabel:    { color: c.textMuted, fontSize: 9, fontFamily: "Almarai_400Regular", textAlign: "center" },
  earningDivider:  { width: 1, height: 40, backgroundColor: c.goldSoft },
  statsRow:        { gap: 8, marginBottom: 12 },
  statCard:        { flex: 1, minHeight: 82, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.goldSoft, alignItems: "center", justifyContent: "center", gap: 4 },
  statValue:       { color: c.text, fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  statLabel:       { color: c.textMuted, fontSize: 10, fontFamily: "Almarai_400Regular", textAlign: "center" },
  tabRow:          { gap: 8, marginBottom: 12 },
  tabBtn:          { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.goldSoft, alignItems: "center", justifyContent: "center", gap: 6, flexDirection: "row" },
  tabBtnActive:    { backgroundColor: c.border, borderColor: c.goldBorder },
  tabText:         { color: c.textSoft, fontSize: 12, fontFamily: "Almarai_700Bold" },
  tabTextActive:   { color: c.gold },
  filterRow:       { marginBottom: 12 },
  filterTitleRow:  { alignItems: "center", gap: 6, marginBottom: 8 },
  filterTitle:     { color: c.text, fontSize: 14, fontFamily: "Almarai_700Bold" },
  filterBtnsWrap:  { gap: 8 },
  filterBtn:       { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.goldSoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  filterBtnActive: { backgroundColor: c.border, borderColor: c.goldBorder },
  filterBtnText:   { color: c.textSoft, fontSize: 11, fontFamily: "Almarai_700Bold" },
  filterBtnTextActive: { color: c.gold },
  errorBox:        { backgroundColor: c.dangerSoft, borderRadius: 18, borderWidth: 1, borderColor: c.dangerSoft, padding: 13, alignItems: "center", gap: 10, marginBottom: 12 },
  errorTextWrap:   { flex: 1 },
  errorTitle:      { color: c.danger, fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  errorText:       { color: c.danger, marginTop: 3, fontSize: 11, lineHeight: 18, fontFamily: "Almarai_400Regular" },
  card:            { backgroundColor: c.surface, borderRadius: 24, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.goldSoft },
  cardActive:      { borderColor: c.goldSoft, backgroundColor: c.surface },
  cardHistory:     { borderColor: c.successSoft, backgroundColor: c.surface },
  cardTop:         { justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  orderHeadRight:  { flex: 1 },
  orderId:         { color: c.text, fontSize: 14, fontFamily: "Almarai_800ExtraBold", marginBottom: 8 },
  badge:           { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: "flex-start" },
  badgeText:       { fontSize: 11, fontFamily: "Almarai_800ExtraBold" },
  trackingBadge:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.successSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4, alignSelf: "flex-start" },
  trackingBadgeText: { color: c.success, fontSize: 10, fontFamily: "Almarai_700Bold" },
  totalBox:        { alignItems: "flex-start", marginHorizontal: 10 },
  totalValue:      { color: c.gold, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  totalLabel:      { color: c.textMuted, fontSize: 10, marginTop: 2, fontFamily: "Almarai_400Regular" },
  driverShare:     { color: c.success, fontSize: 10, marginTop: 3, fontFamily: "Almarai_700Bold" },
  infoBlock:       { gap: 7, marginBottom: 14 },
  infoRow:         { alignItems: "center", gap: 7 },
  infoTextStrong:  { flex: 1, color: c.text, fontSize: 13, fontFamily: "Almarai_700Bold" },
  infoText:        { flex: 1, color: c.textSoft, fontSize: 12, fontFamily: "Almarai_400Regular" },
  infoTextAddress: { flex: 1, color: c.textSoft, fontSize: 12, lineHeight: 19, fontFamily: "Almarai_400Regular" },
  actionsGrid:     { gap: 8, marginBottom: 10 },
  secBtn:          { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: c.goldSoft, borderWidth: 1, borderColor: c.goldBorder, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secBtnText:      { color: c.gold, fontSize: 12, fontFamily: "Almarai_700Bold" },
  secBtnBlue:      { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: c.border, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secBtnBlueText:  { color: c.info, fontSize: 12, fontFamily: "Almarai_700Bold" },
  secBtnDisabled:  { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: c.border, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secBtnDisabledText: { color: c.textMuted, fontSize: 12, fontFamily: "Almarai_700Bold" },
  primaryBtn:      { minHeight: 48, borderRadius: 16, backgroundColor: c.gold, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText:  { color: c.bg, fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  successBtn:      { minHeight: 48, borderRadius: 16, backgroundColor: c.success, alignItems: "center", justifyContent: "center", marginTop: 4 },
  successBtnText:  { color: c.surface, fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  btnInner:        { alignItems: "center", justifyContent: "center", gap: 7 },
  emptyWrap:       { alignItems: "center", marginTop: 60, paddingHorizontal: 24, gap: 14 },
  emptyTitle:      { color: c.text, textAlign: "center", fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  emptySub:        { color: c.textSoft, textAlign: "center", fontSize: 12, lineHeight: 20, fontFamily: "Almarai_400Regular" },
});