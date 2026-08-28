import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken } from "@/utils/authFetch";
import * as Location from "expo-location";
import {
  Almarai_400Regular,
  Almarai_700Bold,
  Almarai_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/almarai";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  MapPin,
  Minus,
  Navigation,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
  UtensilsCrossed,
  Wallet, Banknote,
} from "lucide-react-native";

import { useCart } from "@/context/CartContext";
import { useTheme, type Colors } from "@/context/ThemeContext";
import PaymentGateway, { PaymentMethod as GatewayMethod } from "@/components/PaymentGateway";

const API = "https://zafaran-backend-production.up.railway.app";
const DEFAULT_FEE_PARAMS = { delivery_base_fee: 10, delivery_base_km: 4.99, delivery_per_km_fee: 1 };

// نفس معادلة الباك إند بالضبط (Haversine + تدرّج المسافة) — لعرض تقدير دقيق للعميل
function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calcEstimatedFee(distanceKm: number | null, p: typeof DEFAULT_FEE_PARAMS) {
  if (distanceKm == null) return p.delivery_base_fee; // احتياطي إذا ما توفرت الإحداثيات
  if (distanceKm <= p.delivery_base_km) return p.delivery_base_fee;
  return p.delivery_base_fee + Math.ceil(distanceKm - p.delivery_base_km) * p.delivery_per_km_fee;
}

type DeliveryType = "delivery" | "pickup";

type SavedAddress = {
  id: string;
  label?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  is_default?: boolean | null;
};
type PaymentMethod = "cash" | "stc_pay" | "apple_pay" | "card";

type UserSession = {
  id?: string | number | null;
  role?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  title: string;
  subtitle: string;
  Icon: any;
  enabled: boolean;
}> = [
  { id: "cash",      title: "الدفع عند الاستلام", subtitle: "ادفع كاش أو تحويل عند وصول طلبك", Icon: Banknote,   enabled: true  },
  { id: "stc_pay",   title: "STC Pay",      subtitle: "قريبًا",            Icon: Wallet,     enabled: false },
  { id: "apple_pay", title: "Apple Pay",     subtitle: "قريبًا",            Icon: Smartphone, enabled: false },
  { id: "card",      title: "مدى / بطاقة",  subtitle: "قريبًا",            Icon: CreditCard, enabled: false },
];

// لا تُعرض طرق الدفع غير المفعّلة — خيار معطّل مكتوب تحته "قريبًا" يقع تحت
// Guideline 2.1 عند آبل. عند تفعيل Moyasar: بدّل enabled إلى true وستظهر تلقائياً.
const VISIBLE_PAYMENT_METHODS = PAYMENT_METHODS.filter(m => m.enabled);

// ساعات متاحة للحجز
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 صباحاً - 10 مساءً
const MINUTES = ["00", "15", "30", "45"];

function money(value: number) {
  return `${Number(value || 0).toFixed(2).replace(".00", "")} ريال`;
}

function text(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;
  const clean = String(value).trim();
  return clean.length ? clean : fallback;
}

function formatArabicDate(date: Date): string {
  // ar-SA وحدها ترجّع تقويماً هجرياً على iOS — نثبّت الميلادي لتطابق أرقام الشرائح
  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatArabicTime(hour: number, minute: string): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? "م" : "ص";
  return `${h}:${minute} ${period}`;
}

// أقل مهلة مسموحة للحجز المسبق (ساعتان من الآن)
const MIN_LEAD_HOURS = 2;

function getMinDate(): Date {
  // setHours بالتاريخ الكامل يتعامل مع تجاوز منتصف الليل تلقائياً
  return new Date(Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000);
}

export default function CartScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);
  const { items, updateQty, clearCart, total, totalItems, chef_id } = useCart();

  const [loading, setLoading]       = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  // نِسب التوصيل من الخادم (تتحكم بها لوحة الأدمن) — مع احتياطي محلي
  const [feeParams, setFeeParams] = useState(DEFAULT_FEE_PARAMS);
  useEffect(() => {
    fetch(`${API}/api/orders/delivery-settings`)
      .then((r) => r.json())
      .then((j) => { if (j?.success && j.data) setFeeParams({ ...DEFAULT_FEE_PARAMS, ...j.data }); })
      .catch(() => {});
  }, []);

  const [deliveryType, setDeliveryType]     = useState<DeliveryType>("delivery");
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>("cash");

  const [address, setAddress] = useState("");
  const [lat, setLat]         = useState<number | null>(null);
  const [lng, setLng]         = useState<number | null>(null);
  const [chefLat, setChefLat] = useState<number | null>(null);
  const [chefLng, setChefLng] = useState<number | null>(null);

  // العناوين المحفوظة للعميل + العنوان المختار من الهيدر
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      // 1) العنوان المختار من الهيدر — يعبّي فوراً بلا انتظار الشبكة
      const [[, savedAddr], [, savedLat], [, savedLng]] = await AsyncStorage.multiGet([
        "last_address", "last_address_lat", "last_address_lng",
      ]);
      if (alive && savedAddr) {
        setAddress(savedAddr);
        if (savedLat) setLat(Number(savedLat));
        if (savedLng) setLng(Number(savedLng));
      }

      // 2) قائمة العناوين المحفوظة
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) return;
      let user: any = null;
      try { user = JSON.parse(storedUser); } catch { return; }
      if (!user?.id) return;

      try {
        const res  = await fetch(`${API}/api/addresses/${user.id}`);
        const json = await res.json().catch(() => null);
        if (!alive || !res.ok || !json?.success || !Array.isArray(json.data)) return;

        const list: SavedAddress[] = json.data;
        setSavedAddresses(list);

        const match = savedAddr
          ? list.find((a) => String(a.address || "").trim() === String(savedAddr).trim())
          : list.find((a) => a.is_default) || list[0];

        if (match) {
          setSelectedAddrId(String(match.id));
          setAddress(String(match.address || ""));
          if (match.lat != null) setLat(Number(match.lat));
          if (match.lng != null) setLng(Number(match.lng));
        }
      } catch {}
    })();

    return () => { alive = false; };
  }, []);

  const pickSavedAddress = useCallback(async (addr: SavedAddress) => {
    setSelectedAddrId(String(addr.id));
    setAddress(String(addr.address || ""));
    setLat(addr.lat != null ? Number(addr.lat) : null);
    setLng(addr.lng != null ? Number(addr.lng) : null);

    await AsyncStorage.multiSet([
      ["last_address", String(addr.address || "")],
      ["last_address_lat", String(addr.lat ?? "")],
      ["last_address_lng", String(addr.lng ?? "")],
    ]);
  }, []);

  // جلب إحداثيات الشيف مرة وحدة لحساب تقدير رسوم توصيل دقيق
  useEffect(() => {
    if (!chef_id) return;
    fetch(`${API}/api/chefs/${chef_id}`)
      .then(res => res.json())
      .then(json => {
        const chef = json?.data;
        if (chef?.lat != null && chef?.lng != null) {
          setChefLat(Number(chef.lat));
          setChefLng(Number(chef.lng));
        }
      })
      .catch(() => {});
  }, [chef_id]);

  // حجز مسبق
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPayment, setShowPayment]       = useState(false);
  const [payingOrderId, setPayingOrderId]   = useState<string | null>(null);
  const [selectedDate, setSelectedDate]     = useState<Date | null>(null);
  const [selectedHour, setSelectedHour]     = useState<number>(12);
  const [selectedMinute, setSelectedMinute] = useState<string>("00");

  const [fontsLoaded] = useFonts({
    Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
  });

  // هل في وجبة حجز مسبق في السلة؟
  const hasPreorder = useMemo(() => {
    return items.some(item => item.status === "preorder");
  }, [items]);

  const estimatedDistanceKm = useMemo(() => {
    if (deliveryType !== "delivery") return null;
    if (lat == null || lng == null || chefLat == null || chefLng == null) return null;
    return calcDistanceKm(chefLat, chefLng, lat, lng);
  }, [deliveryType, lat, lng, chefLat, chefLng]);

  const subtotal    = Number(total || 0);
  const deliveryFee = deliveryType === "delivery" ? calcEstimatedFee(estimatedDistanceKm, feeParams) : 0;
  const grandTotal  = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);

  const chefName   = text(items?.[0]?.chef_name, "المتجر");
  const isCartEmpty = !items || items.length === 0;

  // تاريخ الحجز المختار
  const scheduledAt = useMemo(() => {
    if (!selectedDate || !hasPreorder) return null;
    const d = new Date(selectedDate);
    d.setHours(selectedHour, parseInt(selectedMinute), 0, 0);
    return d;
  }, [selectedDate, selectedHour, selectedMinute, hasPreorder]);

  // أيام متاحة للحجز (7 أيام قادمة)
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const min = getMinDate();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (i === 0 && min.getHours() >= 21) continue; // اليوم متأخر
      dates.push(d);
    }
    return dates;
  }, []);

  const goBack  = useCallback(() => { router.back(); }, [router]);
  const goHome  = useCallback(() => { router.replace("/(tabs)" as any); }, [router]);

  const confirmClearCart = useCallback(() => {
    if (isCartEmpty) return;
    Alert.alert("مسح السلة", "هل تريد مسح جميع الوجبات من السلة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "مسح", style: "destructive", onPress: clearCart },
    ]);
  }, [clearCart, isCartEmpty]);

  const getLocation = useCallback(async () => {
    if (locLoading) return;
    setLocLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("إذن الموقع مطلوب", "فعّل إذن الموقع حتى نقدر نحدد عنوان التوصيل بدقة.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const g   = geo?.[0];
      const readableAddress = [g?.city || g?.subregion || "", g?.district || g?.street || "", g?.region || ""].filter(Boolean).join("، ");
      setAddress(readableAddress || "تم تحديد الموقع");
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      setSelectedAddrId(null);
    } catch {
      Alert.alert("تعذر تحديد الموقع", "تأكد من تشغيل خدمة الموقع ثم حاول مرة ثانية.");
    } finally {
      setLocLoading(false);
    }
  }, [locLoading]);

  const readUserSession = useCallback(async (): Promise<UserSession | null> => {
    const storedUser = await AsyncStorage.getItem("user");
    if (!storedUser) return null;
    try { return JSON.parse(storedUser); }
    catch {
      await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
      clearToken();
      return null;
    }
  }, []);

  const validateOrder = useCallback(async () => {
    if (loading) return null;
    if (isCartEmpty) { Alert.alert("السلة فاضية", "أضف وجبة واحدة على الأقل قبل إرسال الطلب."); return null; }
    if (!chef_id)    { Alert.alert("مشكلة في السلة", "لم يتم ربط السلة بالمتجر. امسح السلة واختر الطلب من جديد."); return null; }
    if (deliveryType === "delivery" && (!address || lat === null || lng === null)) {
      Alert.alert("عنوان التوصيل", "حدد موقعك أولًا قبل إكمال الطلب."); return null;
    }
    if (hasPreorder && !scheduledAt) {
      Alert.alert("وقت الحجز مطلوب", "سلتك تحتوي على وجبة حجز مسبق. حدد وقت التسليم المطلوب."); return null;
    }
    if (scheduledAt && scheduledAt < getMinDate()) {
      Alert.alert("وقت غير صحيح", `الحجز يحتاج مهلة ${MIN_LEAD_HOURS} ساعات على الأقل من الآن. اختر وقتاً لاحقاً.`); return null;
    }
    const user = await readUserSession();
    if (!user?.id) {
      Alert.alert("تسجيل الدخول مطلوب", "سجل دخولك حتى تقدر تكمل الطلب.", [
        { text: "إلغاء", style: "cancel" },
        { text: "تسجيل الدخول", onPress: () => router.replace("/login" as any) },
      ]);
      return null;
    }
    return user;
  }, [address, chef_id, deliveryType, hasPreorder, isCartEmpty, lat, lng, loading, readUserSession, router, scheduledAt]);

  const handleOrder = useCallback(async () => {
    const user = await validateOrder();
    if (!user?.id) return;

    setLoading(true);
    try {
      const isPreorder = hasPreorder && scheduledAt !== null;

      const payload = {
        customer_id:      String(user.id),
        chef_id:          String(chef_id),
        items:            items.map(item => ({ menu_item_id: String(item.id), quantity: Number(item.quantity) })),
        delivery_type:    deliveryType,
        delivery_address: deliveryType === "delivery" ? address : "استلام شخصي",
        delivery_lat:     deliveryType === "delivery" ? lat : null,
        delivery_lng:     deliveryType === "delivery" ? lng : null,
        payment_method:   paymentMethod,
        payment_status:   "pending",
        // الأسعار لا تُرسل من العميل — الخادم يحسب subtotal ورسوم التوصيل والإجمالي من قاعدة البيانات
        notes:            deliveryType === "pickup" ? "استلام شخصي" : null,
        order_type:       isPreorder ? "preorder" : "instant",
        requested_time:   isPreorder ? scheduledAt!.toISOString() : null,
      };

      const response = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json: any = null;
      try { json = await response.json(); } catch { json = null; }

      if (!response.ok) {
        Alert.alert("تعذر إرسال الطلب", json?.message || `خطأ من الخادم: ${response.status}`);
        return;
      }

      if (json?.success) {
        const orderId = String(json?.data?.id || "");

        if (isPreorder) {
          // الطلب المسبق: ما يُدفع الآن — ينتظر تأكيد الشيف للوقت أولاً، والدفع يصير بعدها من شاشة الطلب
          clearCart();
          Alert.alert(
            "تم إرسال طلب الحجز",
            `طلبك للحجز المسبق ${orderId ? `#${orderId.slice(0, 8)}` : ""} بانتظار تأكيد المتجر للوقت. بتقدر تدفع بعد ما يتفق الطرفين على الموعد.`,
            [{ text: "متابعة الطلب", onPress: () => router.replace("/(tabs)/orders" as any) }]
          );
          return;
        }

        // الدفع عند الاستلام: لا بوابة دفع — تأكيد مباشر والتحصيل عند التسليم
        if (paymentMethod === "cash") {
          clearCart();
          Alert.alert(
            "تم إرسال طلبك بنجاح",
            (orderId ? `رقم طلبك: ${orderId.slice(0, 8)}\n` : "") + "الدفع عند استلام الطلب — كاش أو تحويل.",
            [{ text: "متابعة الطلب", onPress: () => router.replace("/(tabs)/orders" as any) }]
          );
          return;
        }

        // الدفع الإلكتروني: افتح بوابة الدفع مباشرة
        setPayingOrderId(orderId);
        setShowPayment(true);
        return;
      }

      Alert.alert("لم يكتمل الطلب", json?.message || "حدث خطأ غير معروف.");
    } catch {
      Alert.alert("مشكلة اتصال", "تعذر إرسال الطلب. تأكد من الإنترنت وحاول مرة ثانية.");
    } finally {
      setLoading(false);
    }
  }, [address, chef_id, clearCart, deliveryFee, deliveryType, grandTotal, hasPreorder, items, lat, lng, paymentMethod, router, scheduledAt, subtotal, validateOrder]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPayment(false);
    clearCart();
    const orderId = payingOrderId;
    setPayingOrderId(null);
    Alert.alert(
      "تم الطلب والدفع بنجاح",
      orderId ? `رقم طلبك: ${orderId.slice(0, 8)}` : "تم إرسال طلبك بنجاح",
      [{ text: "متابعة الطلب", onPress: () => router.replace("/(tabs)/orders" as any) }]
    );
  }, [clearCart, payingOrderId, router]);

  const handlePaymentClose = useCallback(() => {
    // فشل الدفع أو إلغاؤه: الطلب باقٍ بحالة "غير مدفوع"، يقدر يدفعه لاحقاً من شاشة الطلب
    setShowPayment(false);
    clearCart();
    const orderId = payingOrderId;
    setPayingOrderId(null);
    router.replace(orderId ? (`/orders/${orderId}` as any) : ("/(tabs)/orders" as any));
  }, [clearCart, payingOrderId, router]);

  if (!fontsLoaded) {
    return <SafeAreaView style={s.safe}><ActivityIndicator color={c.gold} style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  if (isCartEmpty) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
            <ArrowRight size={20} color={c.gold} />
          </TouchableOpacity>
          <Text style={s.title}>السلة</Text>
          <View style={s.headerBtnGhost} />
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <ShoppingBag size={62} color={c.gold} strokeWidth={1.4} />
          </View>
          <Text style={s.emptyTitle}>السلة فاضية</Text>
          <Text style={s.emptyText}>اختر طلبك من المتاجر، وبعدها كمل الطلب من هنا.</Text>
          <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={goHome}>
            <Text style={s.primaryBtnText}>تصفح الوجبات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.title}>سلتي</Text>
          <Text style={s.headerSub}>{totalItems} عنصر</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={s.clearBtn} onPress={confirmClearCart}>
          <Trash2 size={18} color={c.danger} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View>
            <View style={s.chefCard}>
              <View style={s.chefIcon}>
                <UtensilsCrossed size={24} color={c.gold} strokeWidth={1.5} />
              </View>
              <View style={s.chefText}>
                <Text style={s.chefLabel}>طلبك من</Text>
                <Text style={s.chefName} numberOfLines={1}>{chefName}</Text>
              </View>
              <CheckCircle2 size={20} color={c.success} />
            </View>

            {hasPreorder && (
              <View style={s.preorderBanner}>
                <CalendarDays size={18} color={c.gold} strokeWidth={1.8} />
                <Text style={s.preorderBannerText}>سلتك تحتوي على وجبة حجز مسبق — حدد وقت التسليم أدناه</Text>
              </View>
            )}

            <Text style={s.sectionHeading}>الوجبات المختارة</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.itemCard}>
            <View style={s.itemRight}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={s.itemImg} />
              ) : (
                <View style={s.itemPlaceholder}>
                  <UtensilsCrossed size={24} color={c.textMuted} />
                </View>
              )}
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={2}>{text(item.name, "وجبة")}</Text>
                <View style={s.itemMeta}>
                  <Text style={s.itemPrice}>{money(Number(item.price || 0))}</Text>
                  {item.status === "preorder" && (
                    <View style={s.preorderBadge}>
                      <Clock3 size={10} color={c.gold} strokeWidth={1.8} />
                      <Text style={s.preorderBadgeText}>حجز مسبق</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={s.qtyBox}>
              <TouchableOpacity activeOpacity={0.8} style={s.qtyBtn} onPress={() => updateQty(item.id, Number(item.quantity || 0) + 1)}>
                <Plus size={16} color={c.gold} strokeWidth={2.3} />
              </TouchableOpacity>
              <Text style={s.qtyNum}>{Number(item.quantity || 0)}</Text>
              <TouchableOpacity activeOpacity={0.8} style={s.qtyBtn} onPress={() => updateQty(item.id, Math.max(1, Number(item.quantity || 1) - 1))}>
                <Minus size={16} color={c.gold} strokeWidth={2.3} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {/* قسم الحجز المسبق */}
            {hasPreorder && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}>
                  <CalendarDays size={18} color={c.gold} />
                  <Text style={s.sectionTitle}>وقت التسليم المطلوب</Text>
                </View>

                <TouchableOpacity style={s.datePickerBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.9}>
                  <CalendarDays size={18} color={scheduledAt ? c.success : c.gold} strokeWidth={1.8} />
                  <Text style={[s.datePickerBtnText, scheduledAt && { color: c.success }]}>
                    {scheduledAt
                      ? `${formatArabicDate(scheduledAt)} — ${formatArabicTime(selectedHour, selectedMinute)}`
                      : "اختر تاريخ ووقت التسليم"}
                  </Text>
                  {scheduledAt && <CheckCircle2 size={18} color={c.success} />}
                </TouchableOpacity>

                {!scheduledAt && (
                  <Text style={s.dateHint}>مطلوب تحديد الوقت للمتابعة</Text>
                )}
              </View>
            )}

            {/* طريقة الاستلام */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <Truck size={18} color={c.gold} />
                <Text style={s.sectionTitle}>طريقة الاستلام</Text>
              </View>
              <View style={s.deliveryRow}>
                <TouchableOpacity activeOpacity={0.9}
                  style={[s.deliveryCard, deliveryType === "delivery" && s.deliveryCardActive]}
                  onPress={() => setDeliveryType("delivery")}>
                  <Truck size={24} color={deliveryType === "delivery" ? c.gold : c.textMuted} />
                  <Text style={[s.deliveryTitle, deliveryType === "delivery" && s.deliveryTitleActive]}>توصيل</Text>
                  <Text style={s.deliverySub}>+ {money(deliveryType === "delivery" ? deliveryFee : feeParams.delivery_base_fee)}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.9}
                  style={[s.deliveryCard, deliveryType === "pickup" && s.deliveryCardActive]}
                  onPress={() => { setDeliveryType("pickup"); setAddress(""); setLat(null); setLng(null); setSelectedAddrId(null); }}>
                  <ShoppingBag size={24} color={deliveryType === "pickup" ? c.gold : c.textMuted} />
                  <Text style={[s.deliveryTitle, deliveryType === "pickup" && s.deliveryTitleActive]}>استلام</Text>
                  <Text style={s.deliverySub}>مجاني</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* عنوان التوصيل */}
            {deliveryType === "delivery" && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}>
                  <MapPin size={18} color={c.gold} />
                  <Text style={s.sectionTitle}>عنوان التوصيل</Text>
                </View>
                {savedAddresses.length > 0 && (
                  <View style={s.savedList}>
                    {savedAddresses.map((addr) => {
                      const active = selectedAddrId === String(addr.id);
                      return (
                        <TouchableOpacity
                          key={String(addr.id)}
                          activeOpacity={0.9}
                          style={[s.savedRow, active && s.savedRowActive]}
                          onPress={() => pickSavedAddress(addr)}
                        >
                          <MapPin size={17} color={active ? c.gold : c.textSoft} strokeWidth={1.8} />
                          <View style={s.savedTextWrap}>
                            <Text style={[s.savedLabel, active && s.savedLabelActive]} numberOfLines={1}>
                              {text(addr.label, "عنوان")}
                            </Text>
                            <Text style={s.savedAddr} numberOfLines={1}>{text(addr.address, "")}</Text>
                          </View>
                          <View style={[s.radioOuter, active && s.radioOuterActive]}>
                            {active ? <View style={s.radioInner} /> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity activeOpacity={0.9} style={s.addAddrBtn} onPress={() => router.push("/addresses" as any)}>
                  <Plus size={16} color={c.gold} strokeWidth={2} />
                  <Text style={s.addAddrText}>إضافة عنوان جديد</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.9} style={s.locationBtn} onPress={getLocation} disabled={locLoading}>
                  {locLoading ? <ActivityIndicator color={c.onGold} /> : (
                    <>
                      <Navigation size={18} color={c.onGold} />
                      <Text style={s.locationBtnText}>
                        {savedAddresses.length > 0 ? "استخدام موقعي الحالي بدلاً منها" : "تحديد موقعي تلقائيًا"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {address ? (
                  <View style={s.addressCard}>
                    <CheckCircle2 size={18} color={c.success} />
                    <Text style={s.addressText} numberOfLines={2}>{address}</Text>
                  </View>
                ) : (
                  <Text style={s.addressHint}>اختر عنواناً محفوظاً أو حدد موقعك قبل إرسال الطلب.</Text>
                )}
              </View>
            )}

            {/* طريقة الدفع */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <CreditCard size={18} color={c.gold} />
                <Text style={s.sectionTitle}>طريقة الدفع</Text>
              </View>
              <View style={s.paymentGrid}>
                {VISIBLE_PAYMENT_METHODS.map(method => {
                  const active = paymentMethod === method.id;
                  const Icon   = method.Icon;
                  return (
                    <TouchableOpacity key={method.id} activeOpacity={method.enabled ? 0.9 : 1}
                      disabled={!method.enabled}
                      style={[s.paymentOption, active && s.paymentOptionActive, !method.enabled && s.paymentOptionDisabled]}
                      onPress={() => setPaymentMethod(method.id)}>
                      <View style={s.paymentIconBox}>
                        <Icon size={20} color={active ? c.gold : method.enabled ? c.textSoft : c.textMuted} strokeWidth={1.8} />
                      </View>
                      <View style={s.paymentTextWrap}>
                        <Text style={[s.paymentTitle, active && s.paymentTitleActive, !method.enabled && s.paymentTextDisabled]}>{method.title}</Text>
                        <Text style={[s.paymentSub, !method.enabled && s.paymentTextDisabled]} numberOfLines={1}>{method.enabled ? method.subtitle : "قريبًا"}</Text>
                      </View>
                      <View style={[s.radioOuter, active && s.radioOuterActive]}>
                        {active ? <View style={s.radioInner} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ملخص الطلب */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <Clock3 size={18} color={c.gold} />
                <Text style={s.sectionTitle}>ملخص الطلب</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>الوجبات ({totalItems})</Text>
                <Text style={s.summaryValue}>{money(subtotal)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>
                  التوصيل{estimatedDistanceKm != null ? ` (${estimatedDistanceKm.toFixed(1)} كم)` : ""}
                </Text>
                <Text style={s.summaryValue}>{money(deliveryFee)}</Text>
              </View>
              {hasPreorder && scheduledAt && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>نوع الطلب</Text>
                  <Text style={[s.summaryValue, { color: c.gold }]}>حجز مسبق</Text>
                </View>
              )}
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.totalLabel}>الإجمالي</Text>
                <Text style={s.totalValue}>{money(grandTotal)}</Text>
              </View>
            </View>
          </View>
        }
      />

      <View style={s.footer}>
        <TouchableOpacity activeOpacity={0.92}
          style={[s.orderBtn, loading && s.orderBtnDisabled]}
          onPress={handleOrder} disabled={loading}>
          {loading ? <ActivityIndicator color={c.onGold} /> : (
            <>
              <Text style={s.orderBtnText}>{hasPreorder ? "إرسال طلب الحجز" : "إرسال الطلب"}</Text>
              <Text style={s.orderBtnPrice}>{money(grandTotal)}</Text>
              <ChevronLeft size={20} color={c.onGold} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal منتقي التاريخ والوقت */}
      <Modal visible={showDatePicker} animationType="slide" transparent onRequestClose={() => setShowDatePicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>اختر وقت التسليم</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={s.modalCloseBtn}>
                <Text style={s.modalCloseText}>إغلاق</Text>
              </TouchableOpacity>
            </View>

            {/* اختيار التاريخ */}
            <Text style={s.pickerLabel}>اليوم</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.datesRow}>
              {availableDates.map((date, idx) => {
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity key={idx} style={[s.dateChip, isSelected && s.dateChipActive]}
                    onPress={() => setSelectedDate(date)} activeOpacity={0.85}>
                    <Text style={[s.dateChipDay, isSelected && s.dateChipTextActive]}>
                      {date.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "short" })}
                    </Text>
                    <Text style={[s.dateChipNum, isSelected && s.dateChipTextActive]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* اختيار الساعة */}
            <Text style={s.pickerLabel}>الساعة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.datesRow}>
              {HOURS.map(h => {
                const active = selectedHour === h;
                const label  = h > 12 ? `${h - 12} م` : h === 12 ? "12 م" : `${h} ص`;
                return (
                  <TouchableOpacity key={h} style={[s.timeChip, active && s.dateChipActive]}
                    onPress={() => setSelectedHour(h)} activeOpacity={0.85}>
                    <Text style={[s.timeChipText, active && s.dateChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* اختيار الدقائق */}
            <Text style={s.pickerLabel}>الدقائق</Text>
            <View style={s.minutesRow}>
              {MINUTES.map(m => {
                const active = selectedMinute === m;
                return (
                  <TouchableOpacity key={m} style={[s.minuteChip, active && s.dateChipActive]}
                    onPress={() => setSelectedMinute(m)} activeOpacity={0.85}>
                    <Text style={[s.minuteChipText, active && s.dateChipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.confirmDateBtn}
              onPress={() => {
                if (!selectedDate) { Alert.alert("تنبيه", "اختر يوماً أولاً"); return; }
                setShowDatePicker(false);
              }}
              activeOpacity={0.9}>
              <Text style={s.confirmDateBtnText}>
                {selectedDate
                  ? `تأكيد: ${formatArabicDate(selectedDate)} — ${formatArabicTime(selectedHour, selectedMinute)}`
                  : "اختر يوماً أولاً"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PaymentGateway
        visible={showPayment}
        orderId={payingOrderId}
        paymentMethod={paymentMethod as GatewayMethod}
        onSuccess={handlePaymentSuccess}
        onClose={handlePaymentClose}
      />
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe:              { flex: 1, backgroundColor: c.bg },
  header:            { minHeight: 66, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.goldSoft, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: c.bg },
  headerBtn:         { width: 42, height: 42, borderRadius: 15, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
  headerBtnGhost:    { width: 42, height: 42 },
  clearBtn:          { width: 42, height: 42, borderRadius: 15, backgroundColor: c.dangerSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.dangerSoft },
  headerTitleWrap:   { alignItems: "center" },
  title:             { color: c.text, fontSize: 20, fontFamily: "Almarai_800ExtraBold" },
  headerSub:         { marginTop: 3, color: c.textSoft, fontSize: 11, fontFamily: "Almarai_400Regular" },
  listContent:       { padding: 16, paddingBottom: 190 },
  chefCard:          { backgroundColor: c.surface, borderRadius: 24, padding: 15, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
  chefIcon:          { width: 54, height: 54, borderRadius: 18, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.goldBorder },
  chefText:          { flex: 1 },
  chefLabel:         { color: c.textSoft, textAlign: "right", fontSize: 11, fontFamily: "Almarai_400Regular" },
  chefName:          { color: c.text, textAlign: "right", fontSize: 15, marginTop: 4, fontFamily: "Almarai_800ExtraBold" },
  preorderBanner:    { backgroundColor: c.goldSoft, borderRadius: 16, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderColor: c.goldBorder, marginBottom: 12 },
  preorderBannerText:{ flex: 1, color: c.gold, textAlign: "right", fontSize: 12, lineHeight: 20, fontFamily: "Almarai_700Bold" },
  sectionHeading:    { color: c.text, fontSize: 16, textAlign: "right", marginBottom: 12, fontFamily: "Almarai_800ExtraBold" },
  itemCard:          { backgroundColor: c.surface, borderRadius: 22, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: c.goldSoft, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemRight:         { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  itemImg:           { width: 58, height: 58, borderRadius: 18, backgroundColor: c.surfaceAlt },
  itemPlaceholder:   { width: 58, height: 58, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" },
  itemInfo:          { flex: 1 },
  itemName:          { color: c.text, textAlign: "right", fontSize: 14, lineHeight: 22, fontFamily: "Almarai_800ExtraBold" },
  itemMeta:          { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 4 },
  itemPrice:         { color: c.gold, fontSize: 12, fontFamily: "Almarai_700Bold" },
  preorderBadge:     { flexDirection: "row-reverse", alignItems: "center", gap: 3, backgroundColor: c.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  preorderBadgeText: { color: c.gold, fontSize: 9, fontFamily: "Almarai_700Bold" },
  qtyBox:            { backgroundColor: c.bg, borderRadius: 16, padding: 5, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderColor: c.goldSoft },
  qtyBtn:            { width: 30, height: 30, borderRadius: 11, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  qtyNum:            { minWidth: 22, color: c.text, textAlign: "center", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  section:           { backgroundColor: c.surface, borderRadius: 24, padding: 15, marginTop: 12, borderWidth: 1, borderColor: c.goldSoft },
  sectionTitleRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 13 },
  sectionTitle:      { color: c.text, fontSize: 15, textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  datePickerBtn:     { minHeight: 52, borderRadius: 17, backgroundColor: c.bg, borderWidth: 1, borderColor: c.goldBorder, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 10 },
  datePickerBtnText: { flex: 1, color: c.gold, textAlign: "right", fontSize: 13, fontFamily: "Almarai_700Bold" },
  dateHint:          { color: c.danger, textAlign: "right", marginTop: 8, fontSize: 11, fontFamily: "Almarai_400Regular" },
  deliveryRow:       { flexDirection: "row-reverse", gap: 10 },
  deliveryCard:      { flex: 1, minHeight: 104, backgroundColor: c.bg, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.goldSoft, gap: 5 },
  deliveryCardActive:{ backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  deliveryTitle:     { color: c.textMuted, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  deliveryTitleActive:{ color: c.gold },
  deliverySub:       { color: c.textSoft, fontSize: 11, fontFamily: "Almarai_400Regular" },
  savedList:         { gap: 8, marginBottom: 10 },
  savedRow:          { minHeight: 56, borderRadius: 16, backgroundColor: c.bg, borderWidth: 1, borderColor: c.goldSoft, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  savedRowActive:    { backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  savedTextWrap:     { flex: 1 },
  savedLabel:        { color: c.text, textAlign: "right", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  savedLabelActive:  { color: c.gold },
  savedAddr:         { color: c.textSoft, textAlign: "right", marginTop: 2, fontSize: 11, fontFamily: "Almarai_400Regular" },
  addAddrBtn:        { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: c.goldBorder, borderStyle: "dashed", alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 7, marginBottom: 10 },
  addAddrText:       { color: c.gold, fontSize: 12, fontFamily: "Almarai_700Bold" },
  locationBtn:       { minHeight: 50, borderRadius: 17, backgroundColor: c.gold, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 },
  locationBtnText:   { color: c.bg, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  addressCard:       { marginTop: 10, borderRadius: 16, padding: 12, backgroundColor: c.successSoft, borderWidth: 1, borderColor: c.successSoft, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  addressText:       { flex: 1, color: c.success, textAlign: "right", fontSize: 12, lineHeight: 20, fontFamily: "Almarai_700Bold" },
  addressHint:       { color: c.textSoft, textAlign: "right", marginTop: 10, fontSize: 12, fontFamily: "Almarai_400Regular" },
  paymentGrid:       { gap: 10 },
  paymentOption:     { minHeight: 58, borderRadius: 18, backgroundColor: c.bg, borderWidth: 1, borderColor: c.goldSoft, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  paymentOptionActive:{ backgroundColor: c.goldSoft, borderColor: c.goldBorder },
  paymentOptionDisabled:{ opacity: 0.45 },
  paymentIconBox:    { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.goldSoft },
  paymentTextWrap:   { flex: 1 },
  paymentTitle:      { color: c.text, textAlign: "right", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  paymentTitleActive:{ color: c.gold },
  paymentSub:        { color: c.textSoft, textAlign: "right", marginTop: 3, fontSize: 11, fontFamily: "Almarai_400Regular" },
  paymentTextDisabled:{ color: c.textMuted },
  radioOuter:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  radioOuterActive:  { borderColor: c.gold },
  radioInner:        { width: 10, height: 10, borderRadius: 5, backgroundColor: c.gold },
  summaryRow:        { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel:      { color: c.textSoft, fontSize: 13, fontFamily: "Almarai_400Regular" },
  summaryValue:      { color: c.text, fontSize: 13, fontFamily: "Almarai_700Bold" },
  summaryDivider:    { height: 1, backgroundColor: c.border, marginVertical: 4 },
  totalLabel:        { color: c.text, fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  totalValue:        { color: c.gold, fontSize: 20, fontFamily: "Almarai_800ExtraBold" },
  footer:            { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 20, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border },
  orderBtn:          { minHeight: 58, borderRadius: 20, backgroundColor: c.gold, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 10 },
  orderBtnDisabled:  { opacity: 0.72 },
  orderBtnText:      { color: c.bg, fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  orderBtnPrice:     { color: c.bg, fontSize: 13, fontFamily: "Almarai_700Bold", opacity: 0.85 },
  emptyWrap:         { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyIcon:         { width: 118, height: 118, borderRadius: 40, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border, marginBottom: 22 },
  emptyTitle:        { color: c.text, fontSize: 21, fontFamily: "Almarai_800ExtraBold" },
  emptyText:         { color: c.textSoft, textAlign: "center", fontSize: 13, lineHeight: 24, marginTop: 9, marginBottom: 22, fontFamily: "Almarai_400Regular" },
  primaryBtn:        { minWidth: 190, borderRadius: 17, backgroundColor: c.gold, paddingHorizontal: 24, paddingVertical: 14, alignItems: "center" },
  primaryBtnText:    { color: c.bg, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  // Modal
  modalOverlay:      { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalBox:          { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: c.goldBorder },
  modalHeader:       { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle:        { color: c.text, fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  modalCloseBtn:     { padding: 6 },
  modalCloseText:    { color: c.textSoft, fontSize: 13, fontFamily: "Almarai_700Bold" },
  pickerLabel:       { color: c.gold, textAlign: "right", fontSize: 12, fontFamily: "Almarai_800ExtraBold", marginBottom: 8, marginTop: 12 },
  datesRow:          { flexDirection: "row-reverse", gap: 8, paddingVertical: 4, paddingBottom: 8 },
  dateChip:          { width: 58, height: 68, borderRadius: 16, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", gap: 4 },
  dateChipActive:    { backgroundColor: c.goldBorder, borderColor: c.goldBorder },
  dateChipDay:       { color: c.textSoft, fontSize: 10, fontFamily: "Almarai_400Regular" },
  dateChipNum:       { color: c.text, fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  dateChipTextActive:{ color: c.gold },
  timeChip:          { paddingHorizontal: 14, height: 42, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  timeChipText:      { color: c.textSoft, fontSize: 13, fontFamily: "Almarai_700Bold" },
  minutesRow:        { flexDirection: "row-reverse", gap: 10, marginBottom: 8 },
  minuteChip:        { flex: 1, height: 48, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  minuteChipText:    { color: c.textSoft, fontSize: 15, fontFamily: "Almarai_700Bold" },
  confirmDateBtn:    { marginTop: 16, minHeight: 52, borderRadius: 17, backgroundColor: c.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  confirmDateBtnText:{ color: c.bg, fontSize: 14, fontFamily: "Almarai_800ExtraBold", textAlign: "center" },
});