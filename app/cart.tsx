import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Wallet,
} from "lucide-react-native";

import { useCart } from "@/context/CartContext";

const API = "https://zafaran-backend-production.up.railway.app";
const FIXED_DELIVERY_FEE = 10;

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

function calcEstimatedFee(distanceKm: number | null) {
  if (distanceKm == null) return FIXED_DELIVERY_FEE; // احتياطي إذا ما توفرت الإحداثيات
  if (distanceKm <= 4.99) return 10;
  return 10 + Math.ceil(distanceKm - 4.99);
}

type DeliveryType = "delivery" | "pickup";
type PaymentMethod = "stc_pay" | "apple_pay" | "card";

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
  { id: "stc_pay",   title: "STC Pay",      subtitle: "الدفع عبر STC Pay", Icon: Wallet,     enabled: true  },
  { id: "apple_pay", title: "Apple Pay",     subtitle: "قريبًا",            Icon: Smartphone, enabled: false },
  { id: "card",      title: "مدى / بطاقة",  subtitle: "قريبًا",            Icon: CreditCard, enabled: false },
];

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
  return date.toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatArabicTime(hour: number, minute: string): string {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? "م" : "ص";
  return `${h}:${minute} ${period}`;
}

// أقرب يوم متاح للحجز (اليوم إذا الوقت مناسب، وإلا غداً)
function getMinDate(): Date {
  const now = new Date();
  const min = new Date(now);
  min.setHours(now.getHours() + 2); // على الأقل بعد ساعتين
  return min;
}

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQty, clearCart, total, totalItems, chef_id } = useCart();

  const [loading, setLoading]       = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const [deliveryType, setDeliveryType]     = useState<DeliveryType>("delivery");
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>("stc_pay");

  const [address, setAddress] = useState("");
  const [lat, setLat]         = useState<number | null>(null);
  const [lng, setLng]         = useState<number | null>(null);
  const [chefLat, setChefLat] = useState<number | null>(null);
  const [chefLng, setChefLng] = useState<number | null>(null);

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
  const deliveryFee = deliveryType === "delivery" ? calcEstimatedFee(estimatedDistanceKm) : 0;
  const grandTotal  = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);

  const chefName   = text(items?.[0]?.chef_name, "الشيف");
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
      return null;
    }
  }, []);

  const validateOrder = useCallback(async () => {
    if (loading) return null;
    if (isCartEmpty) { Alert.alert("السلة فاضية", "أضف وجبة واحدة على الأقل قبل إرسال الطلب."); return null; }
    if (!chef_id)    { Alert.alert("مشكلة في السلة", "لم يتم ربط السلة بالشيف. امسح السلة واختر الطلب من جديد."); return null; }
    if (deliveryType === "delivery" && (!address || lat === null || lng === null)) {
      Alert.alert("عنوان التوصيل", "حدد موقعك أولًا قبل إكمال الطلب."); return null;
    }
    if (hasPreorder && !scheduledAt) {
      Alert.alert("وقت الحجز مطلوب", "سلتك تحتوي على وجبة حجز مسبق. حدد وقت التسليم المطلوب."); return null;
    }
    if (scheduledAt && scheduledAt <= new Date()) {
      Alert.alert("وقت غير صحيح", "الوقت المختار يجب أن يكون في المستقبل."); return null;
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
        delivery_fee:     deliveryFee,
        subtotal,
        total_amount:     grandTotal,
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
        clearCart();
        Alert.alert(
          isPreorder ? "تم إرسال طلب الحجز" : "تم إرسال الطلب",
          isPreorder
            ? `طلبك للحجز المسبق ${orderId ? `#${orderId.slice(0, 8)}` : ""} بانتظار تأكيد الشيف للوقت.`
            : orderId ? `رقم طلبك: ${orderId.slice(0, 8)}` : "تم إرسال طلبك بنجاح",
          [{ text: "متابعة الطلب", onPress: () => router.replace("/orders" as any) }]
        );
        return;
      }

      Alert.alert("لم يكتمل الطلب", json?.message || "حدث خطأ غير معروف.");
    } catch {
      Alert.alert("مشكلة اتصال", "تعذر إرسال الطلب. تأكد من الإنترنت وحاول مرة ثانية.");
    } finally {
      setLoading(false);
    }
  }, [address, chef_id, clearCart, deliveryFee, deliveryType, grandTotal, hasPreorder, items, lat, lng, paymentMethod, router, scheduledAt, subtotal, validateOrder]);

  if (!fontsLoaded) {
    return <SafeAreaView style={s.safe}><ActivityIndicator color="#F2B233" style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  if (isCartEmpty) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={goBack}>
            <ArrowRight size={20} color="#F2B233" />
          </TouchableOpacity>
          <Text style={s.title}>السلة</Text>
          <View style={s.headerBtnGhost} />
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <ShoppingBag size={62} color="#F2B233" strokeWidth={1.4} />
          </View>
          <Text style={s.emptyTitle}>السلة فاضية</Text>
          <Text style={s.emptyText}>اختر وجباتك من الشيفات والأسر المنتجة، وبعدها كمل الطلب من هنا.</Text>
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
          <ArrowRight size={20} color="#F2B233" />
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.title}>سلتي</Text>
          <Text style={s.headerSub}>{totalItems} عنصر</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={s.clearBtn} onPress={confirmClearCart}>
          <Trash2 size={18} color="#FF8A8A" />
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
                <UtensilsCrossed size={24} color="#F2B233" strokeWidth={1.5} />
              </View>
              <View style={s.chefText}>
                <Text style={s.chefLabel}>طلبك من</Text>
                <Text style={s.chefName} numberOfLines={1}>{chefName}</Text>
              </View>
              <CheckCircle2 size={20} color="#4CAF50" />
            </View>

            {hasPreorder && (
              <View style={s.preorderBanner}>
                <CalendarDays size={18} color="#F2B233" strokeWidth={1.8} />
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
                  <UtensilsCrossed size={24} color="#6D4E2D" />
                </View>
              )}
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={2}>{text(item.name, "وجبة")}</Text>
                <View style={s.itemMeta}>
                  <Text style={s.itemPrice}>{money(Number(item.price || 0))}</Text>
                  {item.status === "preorder" && (
                    <View style={s.preorderBadge}>
                      <Clock3 size={10} color="#F2B233" strokeWidth={1.8} />
                      <Text style={s.preorderBadgeText}>حجز مسبق</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={s.qtyBox}>
              <TouchableOpacity activeOpacity={0.8} style={s.qtyBtn} onPress={() => updateQty(item.id, Number(item.quantity || 0) + 1)}>
                <Plus size={16} color="#F2B233" strokeWidth={2.3} />
              </TouchableOpacity>
              <Text style={s.qtyNum}>{Number(item.quantity || 0)}</Text>
              <TouchableOpacity activeOpacity={0.8} style={s.qtyBtn} onPress={() => updateQty(item.id, Number(item.quantity || 0) - 1)}>
                <Minus size={16} color="#F2B233" strokeWidth={2.3} />
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
                  <CalendarDays size={18} color="#F2B233" />
                  <Text style={s.sectionTitle}>وقت التسليم المطلوب</Text>
                </View>

                <TouchableOpacity style={s.datePickerBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.9}>
                  <CalendarDays size={18} color={scheduledAt ? "#4CAF50" : "#F2B233"} strokeWidth={1.8} />
                  <Text style={[s.datePickerBtnText, scheduledAt && { color: "#4CAF50" }]}>
                    {scheduledAt
                      ? `${formatArabicDate(scheduledAt)} — ${formatArabicTime(selectedHour, selectedMinute)}`
                      : "اختر تاريخ ووقت التسليم"}
                  </Text>
                  {scheduledAt && <CheckCircle2 size={18} color="#4CAF50" />}
                </TouchableOpacity>

                {!scheduledAt && (
                  <Text style={s.dateHint}>مطلوب تحديد الوقت للمتابعة</Text>
                )}
              </View>
            )}

            {/* طريقة الاستلام */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <Truck size={18} color="#F2B233" />
                <Text style={s.sectionTitle}>طريقة الاستلام</Text>
              </View>
              <View style={s.deliveryRow}>
                <TouchableOpacity activeOpacity={0.9}
                  style={[s.deliveryCard, deliveryType === "delivery" && s.deliveryCardActive]}
                  onPress={() => setDeliveryType("delivery")}>
                  <Truck size={24} color={deliveryType === "delivery" ? "#F2B233" : "#6D4E2D"} />
                  <Text style={[s.deliveryTitle, deliveryType === "delivery" && s.deliveryTitleActive]}>توصيل</Text>
                  <Text style={s.deliverySub}>+ {money(deliveryType === "delivery" ? deliveryFee : FIXED_DELIVERY_FEE)}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.9}
                  style={[s.deliveryCard, deliveryType === "pickup" && s.deliveryCardActive]}
                  onPress={() => { setDeliveryType("pickup"); setAddress(""); setLat(null); setLng(null); }}>
                  <ShoppingBag size={24} color={deliveryType === "pickup" ? "#F2B233" : "#6D4E2D"} />
                  <Text style={[s.deliveryTitle, deliveryType === "pickup" && s.deliveryTitleActive]}>استلام</Text>
                  <Text style={s.deliverySub}>مجاني</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* عنوان التوصيل */}
            {deliveryType === "delivery" && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}>
                  <MapPin size={18} color="#F2B233" />
                  <Text style={s.sectionTitle}>عنوان التوصيل</Text>
                </View>
                <TouchableOpacity activeOpacity={0.9} style={s.locationBtn} onPress={getLocation} disabled={locLoading}>
                  {locLoading ? <ActivityIndicator color="#17100B" /> : (
                    <>
                      <Navigation size={18} color="#17100B" />
                      <Text style={s.locationBtnText}>تحديد موقعي تلقائيًا</Text>
                    </>
                  )}
                </TouchableOpacity>
                {address ? (
                  <View style={s.addressCard}>
                    <CheckCircle2 size={18} color="#4CAF50" />
                    <Text style={s.addressText} numberOfLines={2}>{address}</Text>
                  </View>
                ) : (
                  <Text style={s.addressHint}>مطلوب تحديد الموقع قبل إرسال الطلب.</Text>
                )}
              </View>
            )}

            {/* طريقة الدفع */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <CreditCard size={18} color="#F2B233" />
                <Text style={s.sectionTitle}>طريقة الدفع</Text>
              </View>
              <View style={s.paymentGrid}>
                {PAYMENT_METHODS.map(method => {
                  const active = paymentMethod === method.id;
                  const Icon   = method.Icon;
                  return (
                    <TouchableOpacity key={method.id} activeOpacity={method.enabled ? 0.9 : 1}
                      disabled={!method.enabled}
                      style={[s.paymentOption, active && s.paymentOptionActive, !method.enabled && s.paymentOptionDisabled]}
                      onPress={() => setPaymentMethod(method.id)}>
                      <View style={s.paymentIconBox}>
                        <Icon size={20} color={active ? "#F2B233" : method.enabled ? "#8A6030" : "#6D4E2D"} strokeWidth={1.8} />
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
                <Clock3 size={18} color="#F2B233" />
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
                  <Text style={[s.summaryValue, { color: "#F2B233" }]}>حجز مسبق</Text>
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
          {loading ? <ActivityIndicator color="#17100B" /> : (
            <>
              <Text style={s.orderBtnText}>{hasPreorder ? "إرسال طلب الحجز" : "إرسال الطلب"}</Text>
              <Text style={s.orderBtnPrice}>{money(grandTotal)}</Text>
              <ChevronLeft size={20} color="#17100B" />
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
                      {date.toLocaleDateString("ar-SA", { weekday: "short" })}
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#17100B" },
  header:            { minHeight: 66, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: "#17100B" },
  headerBtn:         { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(242,178,51,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(242,178,51,0.14)" },
  headerBtnGhost:    { width: 42, height: 42 },
  clearBtn:          { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(229,57,53,0.09)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.18)" },
  headerTitleWrap:   { alignItems: "center" },
  title:             { color: "#FDF0DC", fontSize: 20, fontFamily: "Almarai_800ExtraBold" },
  headerSub:         { marginTop: 3, color: "#8A6030", fontSize: 11, fontFamily: "Almarai_400Regular" },
  listContent:       { padding: 16, paddingBottom: 190 },
  chefCard:          { backgroundColor: "#21160D", borderRadius: 24, padding: 15, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", marginBottom: 12 },
  chefIcon:          { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(242,178,51,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(242,178,51,0.15)" },
  chefText:          { flex: 1 },
  chefLabel:         { color: "#8A6030", textAlign: "right", fontSize: 11, fontFamily: "Almarai_400Regular" },
  chefName:          { color: "#FDF0DC", textAlign: "right", fontSize: 15, marginTop: 4, fontFamily: "Almarai_800ExtraBold" },
  preorderBanner:    { backgroundColor: "rgba(242,178,51,0.1)", borderRadius: 16, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(242,178,51,0.25)", marginBottom: 12 },
  preorderBannerText:{ flex: 1, color: "#F2B233", textAlign: "right", fontSize: 12, lineHeight: 20, fontFamily: "Almarai_700Bold" },
  sectionHeading:    { color: "#FDF0DC", fontSize: 16, textAlign: "right", marginBottom: 12, fontFamily: "Almarai_800ExtraBold" },
  itemCard:          { backgroundColor: "#21160D", borderRadius: 22, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "rgba(242,178,51,0.09)", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  itemRight:         { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  itemImg:           { width: 58, height: 58, borderRadius: 18, backgroundColor: "#2A1E00" },
  itemPlaceholder:   { width: 58, height: 58, borderRadius: 18, backgroundColor: "#2A1E00", alignItems: "center", justifyContent: "center" },
  itemInfo:          { flex: 1 },
  itemName:          { color: "#FDF0DC", textAlign: "right", fontSize: 14, lineHeight: 22, fontFamily: "Almarai_800ExtraBold" },
  itemMeta:          { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 4 },
  itemPrice:         { color: "#F2B233", fontSize: 12, fontFamily: "Almarai_700Bold" },
  preorderBadge:     { flexDirection: "row-reverse", alignItems: "center", gap: 3, backgroundColor: "rgba(242,178,51,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  preorderBadgeText: { color: "#F2B233", fontSize: 9, fontFamily: "Almarai_700Bold" },
  qtyBox:            { backgroundColor: "#17100B", borderRadius: 16, padding: 5, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(242,178,51,0.1)" },
  qtyBtn:            { width: 30, height: 30, borderRadius: 11, backgroundColor: "rgba(242,178,51,0.08)", alignItems: "center", justifyContent: "center" },
  qtyNum:            { minWidth: 22, color: "#FDF0DC", textAlign: "center", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  section:           { backgroundColor: "#21160D", borderRadius: 24, padding: 15, marginTop: 12, borderWidth: 1, borderColor: "rgba(242,178,51,0.1)" },
  sectionTitleRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 13 },
  sectionTitle:      { color: "#FDF0DC", fontSize: 15, textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  datePickerBtn:     { minHeight: 52, borderRadius: 17, backgroundColor: "#17100B", borderWidth: 1, borderColor: "rgba(242,178,51,0.2)", flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 10 },
  datePickerBtnText: { flex: 1, color: "#F2B233", textAlign: "right", fontSize: 13, fontFamily: "Almarai_700Bold" },
  dateHint:          { color: "#E53935", textAlign: "right", marginTop: 8, fontSize: 11, fontFamily: "Almarai_400Regular" },
  deliveryRow:       { flexDirection: "row-reverse", gap: 10 },
  deliveryCard:      { flex: 1, minHeight: 104, backgroundColor: "#17100B", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(242,178,51,0.09)", gap: 5 },
  deliveryCardActive:{ backgroundColor: "rgba(242,178,51,0.1)", borderColor: "rgba(242,178,51,0.45)" },
  deliveryTitle:     { color: "#6D4E2D", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  deliveryTitleActive:{ color: "#F2B233" },
  deliverySub:       { color: "#8A6030", fontSize: 11, fontFamily: "Almarai_400Regular" },
  locationBtn:       { minHeight: 50, borderRadius: 17, backgroundColor: "#F2B233", alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 },
  locationBtnText:   { color: "#17100B", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  addressCard:       { marginTop: 10, borderRadius: 16, padding: 12, backgroundColor: "rgba(76,175,80,0.08)", borderWidth: 1, borderColor: "rgba(76,175,80,0.18)", flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  addressText:       { flex: 1, color: "#A4F0B5", textAlign: "right", fontSize: 12, lineHeight: 20, fontFamily: "Almarai_700Bold" },
  addressHint:       { color: "#8A6030", textAlign: "right", marginTop: 10, fontSize: 12, fontFamily: "Almarai_400Regular" },
  paymentGrid:       { gap: 10 },
  paymentOption:     { minHeight: 58, borderRadius: 18, backgroundColor: "#17100B", borderWidth: 1, borderColor: "rgba(242,178,51,0.1)", paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  paymentOptionActive:{ backgroundColor: "rgba(242,178,51,0.1)", borderColor: "rgba(242,178,51,0.45)" },
  paymentOptionDisabled:{ opacity: 0.45 },
  paymentIconBox:    { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,178,51,0.06)" },
  paymentTextWrap:   { flex: 1 },
  paymentTitle:      { color: "#FDF0DC", textAlign: "right", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  paymentTitleActive:{ color: "#F2B233" },
  paymentSub:        { color: "#8A6030", textAlign: "right", marginTop: 3, fontSize: 11, fontFamily: "Almarai_400Regular" },
  paymentTextDisabled:{ color: "#6D4E2D" },
  radioOuter:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "rgba(242,178,51,0.22)", alignItems: "center", justifyContent: "center" },
  radioOuterActive:  { borderColor: "#F2B233" },
  radioInner:        { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F2B233" },
  summaryRow:        { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel:      { color: "#8A6030", fontSize: 13, fontFamily: "Almarai_400Regular" },
  summaryValue:      { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold" },
  summaryDivider:    { height: 1, backgroundColor: "rgba(242,178,51,0.12)", marginVertical: 4 },
  totalLabel:        { color: "#FDF0DC", fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  totalValue:        { color: "#F2B233", fontSize: 20, fontFamily: "Almarai_800ExtraBold" },
  footer:            { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 20, backgroundColor: "rgba(23,16,11,0.98)", borderTopWidth: 1, borderTopColor: "rgba(242,178,51,0.12)" },
  orderBtn:          { minHeight: 58, borderRadius: 20, backgroundColor: "#F2B233", alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 10 },
  orderBtnDisabled:  { opacity: 0.72 },
  orderBtnText:      { color: "#17100B", fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  orderBtnPrice:     { color: "#17100B", fontSize: 13, fontFamily: "Almarai_700Bold", opacity: 0.85 },
  emptyWrap:         { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyIcon:         { width: 118, height: 118, borderRadius: 40, backgroundColor: "#21160D", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(242,178,51,0.14)", marginBottom: 22 },
  emptyTitle:        { color: "#FDF0DC", fontSize: 21, fontFamily: "Almarai_800ExtraBold" },
  emptyText:         { color: "#A98961", textAlign: "center", fontSize: 13, lineHeight: 24, marginTop: 9, marginBottom: 22, fontFamily: "Almarai_400Regular" },
  primaryBtn:        { minWidth: 190, borderRadius: 17, backgroundColor: "#F2B233", paddingHorizontal: 24, paddingVertical: 14, alignItems: "center" },
  primaryBtnText:    { color: "#17100B", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  // Modal
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:          { backgroundColor: "#1C1000", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: "rgba(242,178,51,0.15)" },
  modalHeader:       { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle:        { color: "#FDF0DC", fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  modalCloseBtn:     { padding: 6 },
  modalCloseText:    { color: "#8A6030", fontSize: 13, fontFamily: "Almarai_700Bold" },
  pickerLabel:       { color: "#F2B233", textAlign: "right", fontSize: 12, fontFamily: "Almarai_800ExtraBold", marginBottom: 8, marginTop: 12 },
  datesRow:          { flexDirection: "row-reverse", gap: 8, paddingVertical: 4, paddingBottom: 8 },
  dateChip:          { width: 58, height: 68, borderRadius: 16, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", alignItems: "center", justifyContent: "center", gap: 4 },
  dateChipActive:    { backgroundColor: "rgba(242,178,51,0.15)", borderColor: "rgba(242,178,51,0.5)" },
  dateChipDay:       { color: "#8A6030", fontSize: 10, fontFamily: "Almarai_400Regular" },
  dateChipNum:       { color: "#FDF0DC", fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  dateChipTextActive:{ color: "#F2B233" },
  timeChip:          { paddingHorizontal: 14, height: 42, borderRadius: 14, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", alignItems: "center", justifyContent: "center" },
  timeChipText:      { color: "#8A6030", fontSize: 13, fontFamily: "Almarai_700Bold" },
  minutesRow:        { flexDirection: "row-reverse", gap: 10, marginBottom: 8 },
  minuteChip:        { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", alignItems: "center", justifyContent: "center" },
  minuteChipText:    { color: "#8A6030", fontSize: 15, fontFamily: "Almarai_700Bold" },
  confirmDateBtn:    { marginTop: 16, minHeight: 52, borderRadius: 17, backgroundColor: "#F2B233", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  confirmDateBtnText:{ color: "#17100B", fontSize: 14, fontFamily: "Almarai_800ExtraBold", textAlign: "center" },
});