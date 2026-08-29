import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Switch,
  Share,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type Colors } from "@/context/ThemeContext";
import QRCode from "react-native-qrcode-svg";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearToken } from "@/utils/authFetch";
import * as Location from "expo-location";
const isWeb = require('react-native').Platform.OS === 'web';
const MapView = isWeb ? () => null : require('react-native-maps').default;
const Marker  = isWeb ? () => null : require('react-native-maps').Marker;
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold
} from "@expo-google-fonts/almarai";
import {
  RefreshCw, ChevronDown, UtensilsCrossed, Package, ClipboardList,
  Check, X, Flame, Star, LogOut, CalendarDays, Clock3, CheckCircle2, Coffee, MapPin, Wallet,
  ArrowRight, FileText, Eye, Share2, QrCode, Radio, Percent
} from "lucide-react-native";
import { pickCompressedImage, uploadImageToBucket } from "@/utils/images";

const API = "https://zafaran-backend-production.up.railway.app";

const makeSTATUS = (c: Colors): any => ({
  pending:        { label: "بانتظار القبول",        color: c.gold },
  pending_time:   { label: "بانتظار تأكيد الوقت",   color: c.gold },
  time_confirmed: { label: "تم تأكيد الوقت",        color: c.success },
  accepted:       { label: "تم القبول",              color: c.info },
  preparing:      { label: "قيد التحضير",            color: c.gold },
  ready:          { label: "جاهز",                    color: c.info },
  delivering:     { label: "في الطريق",              color: c.info },
  delivered:      { label: "تم التسليم",             color: c.success },
  cancelled:      { label: "ملغي",                   color: c.danger },
});



const makeCHEF_STATUS = (c: Colors) => [
  { id: "open",          label: "مفتوح",          desc: "يستقبل طلبات فورية",          color: c.success },
  { id: "preorder",      label: "حجز مسبق فقط",   desc: "للبوفيهات والطلبات الكبيرة", color: c.gold },
  { id: "closed",        label: "غير متاح",        desc: "يختفي من القائمة كلياً",     color: c.danger },
];


const HOURS   = Array.from({ length: 15 }, (_, i) => i + 8);
const MINUTES = ["00", "15", "30", "45"];

function formatArabicDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatArabicTime(hour: number, minute: string): string {
  const h      = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? "م" : "ص";
  return `${h}:${minute} ${period}`;
}

export default function DashboardScreen() {
  const [orders, setOrders]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [chefId, setChefId]           = useState<string | null>(null);
  const [chef, setChef]               = useState<any>(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 26.3260, longitude: 43.9750,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  // إذن الموقع: showsUserLocation بدون إذن ممنوح يسبب انهيار التطبيق على أندرويد
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locating, setLocating] = useState(false);
  const [graceDays, setGraceDays]       = useState(30);
  const [certUploading, setCertUploading] = useState(false);
  const [chefStatus, setChefStatus]   = useState("open");
  const [showStatus, setShowStatus]   = useState(false);
  const [tab, setTab]                 = useState<"active" | "history">("active");

  // modal تأكيد الوقت
  const [showTimeModal, setShowTimeModal]     = useState(false);
  const [timeModalOrder, setTimeModalOrder]   = useState<any>(null);
  const [timeAction, setTimeAction]           = useState<"confirm" | "propose">("confirm");
  const [selectedDate, setSelectedDate]       = useState<Date | null>(null);
  const [selectedHour, setSelectedHour]       = useState(12);
  const [selectedMinute, setSelectedMinute]   = useState("00");
  const [timeLoading, setTimeLoading]         = useState(false);

  const router = useRouter();
  const { c } = useTheme();
  const [showQr, setShowQr] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const [liveItemId, setLiveItemId] = useState<string | null>(null);
  const [liveItemPrice, setLiveItemPrice] = useState("");
  const [savingLive, setSavingLive] = useState(false);
  const s = useMemo(() => make_s(c), [c]);
  const statusMap = useMemo(() => makeSTATUS(c), [c]);
  const chefStatusList = useMemo(() => makeCHEF_STATUS(c), [c]);
  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const loadChef = useCallback(async () => {
    const u = await AsyncStorage.getItem("user");
    if (!u) return;
    let user: any = null;
    try { user = JSON.parse(u); } catch { return; }
    if (!user?.id) return;
    const res  = await fetch(`${API}/api/chefs?user_id=${user.id}`);
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      setChefId(json.data[0].id);
      setChef(json.data[0]);
      setChefStatus(json.data[0].status || "open");
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!chefId) return;
    if (!silent) setLoading(true);
    try {
      // الشاشة تفلتر الطلبات محلياً لتبويبات (نشطة/سجل)، فتحتاج دفعة كافية.
      // 100 هو سقف الخادم — والحل الدائم فلترة بالحالة من الخادم عند النمو.
      const res  = await fetch(`${API}/api/orders/chef/${chefId}?limit=100&offset=0`);
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chefId]);

  useEffect(() => { loadChef(); }, [loadChef]);

  // مهلة شهادة العمل الحر — مصدرها الوحيد app_settings عبر الباكند
  useEffect(() => {
    fetch(`${API}/api/chefs/cert-grace`)
      .then((r) => r.json())
      .then((j) => { if (j?.success && j?.data?.grace_days) setGraceDays(j.data.grace_days); })
      .catch(() => {});
  }, []);
  useEffect(() => { if (chefId) load(); }, [chefId, load]);
  useFocusEffect(useCallback(() => { if (chefId) load(true); }, [chefId, load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
  }, [load]);

  // شهادة العمل الحر: حقل غير إلزامي بالتسجيل — يُرفع من هنا خلال المهلة
  // بعد انتهاء المهلة: لا إيقاف تلقائي — الأدمن يقرر يدوياً لكل حالة
  const certInfo = useMemo(() => {
    if (!chef) return null;
    if (chef.freelance_cert_url) {
      const d = chef.freelance_cert_uploaded_at ? new Date(chef.freelance_cert_uploaded_at) : null;
      return { state: "uploaded" as const, date: d ? d.toLocaleDateString("ar-SA") : "" };
    }
    const created = chef.created_at ? new Date(chef.created_at).getTime() : Date.now();
    const daysUsed = Math.floor((Date.now() - created) / 86400000);
    const left = graceDays - daysUsed;
    if (left >= 0) return { state: "pending" as const, left };
    return { state: "late" as const, late: -left };
  }, [chef, graceDays]);

  const uploadCert = useCallback(async () => {
    if (certUploading || !chefId) return;
    // مستند — بدون قص، والضغط الإجباري يتكفل بحجم صورة الجوال
    const uri = await pickCompressedImage();
    if (!uri) return;

    setCertUploading(true);
    try {
      const url = await uploadImageToBucket("certificates", "cert", uri);
      if (!url) { Alert.alert("تعذر رفع الشهادة", "تأكد من الإنترنت وحاول مرة ثانية."); return; }

      const res  = await fetch(`${API}/api/chefs/${chefId}/freelance-cert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cert_url: url }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        setChef(json.data);
        Alert.alert("تم", "تم رفع شهادة العمل الحر بنجاح.");
      } else {
        Alert.alert("خطأ", json?.message || "تعذر حفظ الشهادة.");
      }
    } finally {
      setCertUploading(false);
    }
  }, [certUploading, chefId]);

  const handleLogout = () => {
    Alert.alert("خروج", "تبي تطلع من حسابك؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم", style: "destructive", onPress: async () => {
        await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
      clearToken();
        router.replace("/login");
      }},
    ]);
  };

  // فتح الخريطة: كل نداءات الموقع محاطة بحماية — أي فشل GPS أو إذن
  // كان يخرج المستخدم من التطبيق بدل عرض رسالة
  const openLocationMap = async () => {
    let granted = false;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      granted = status === "granted";
    } catch {
      granted = false;
    }

    setHasLocationPermission(granted);

    if (granted) {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setMapRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setSelectedLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        // فشل جلب GPS — نرجع للموقع المحفوظ سابقاً لو موجود
        if (chef?.lat && chef?.lng) {
          setMapRegion({ latitude: chef.lat, longitude: chef.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
          setSelectedLocation({ lat: chef.lat, lng: chef.lng });
        }
      }
    } else if (chef?.lat && chef?.lng) {
      // ما أعطى إذن الموقع — نعرض آخر موقع محفوظ إن وجد
      setMapRegion({ latitude: chef.lat, longitude: chef.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setSelectedLocation({ lat: chef.lat, lng: chef.lng });
    } else {
      Alert.alert("إذن الموقع مطلوب", "فعّل إذن الموقع من إعدادات الجوال، أو حدد موقعك يدوياً بالضغط على الخريطة.");
    }

    setShowLocationMap(true);
  };

  const useMyCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setHasLocationPermission(false);
        Alert.alert("إذن الموقع مطلوب", "فعّل إذن الموقع من إعدادات الجوال، أو حدد موقعك يدوياً بالضغط على الخريطة.");
        return;
      }

      setHasLocationPermission(true);

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      setSelectedLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert("تعذر تحديد الموقع", "تأكد من تشغيل خدمة الموقع، أو حدد موقعك يدوياً بالضغط على الخريطة.");
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;
    setSelectedLocation({ lat: coord.latitude, lng: coord.longitude });
  };

  const saveLocation = async () => {
    if (!chefId || !selectedLocation) return;
    setSavingLocation(true);
    try {
      const res  = await fetch(`${API}/api/chefs/${chefId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: selectedLocation.lat, lng: selectedLocation.lng }),
      });
      const json = await res.json();
      if (json.success) {
        setChef((prev: any) => ({ ...prev, lat: selectedLocation.lat, lng: selectedLocation.lng }));
        setShowLocationMap(false);
        Alert.alert("تم", "تم تحديث موقعك بنجاح");
      } else {
        Alert.alert("خطأ", json.message || "تعذر حفظ الموقع");
      }
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setSavingLocation(false);
    }
  };

  const changeStatus = async (newStatus: string) => {
    if (!chefId) return;
    const res  = await fetch(`${API}/api/chefs/${chefId}/toggle`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, is_open: newStatus === "open" }),
    });
    const json = await res.json();
    if (json.success) {
      setChefStatus(newStatus);
      setShowStatus(false);
      Alert.alert("تم التحديث", `حالتك الآن: ${chefStatusList.find(s => s.id === newStatus)?.label}`);
    }
  };

  const toggleDrinks = async (value: boolean) => {
    if (!chefId) return;
    setChef((prev: any) => ({ ...prev, offers_drinks: value })); // تحديث فوري بالواجهة
    const res  = await fetch(`${API}/api/chefs/${chefId}/offers`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offers_drinks: value }),
    });
    const json = await res.json();
    if (!json.success) {
      setChef((prev: any) => ({ ...prev, offers_drinks: !value })); // تراجع لو فشل
      Alert.alert("خطأ", json.message || "تعذر التحديث");
    }
  };

  const startLive = async () => {
    if (!chefId || savingLive) return;

    const url = liveUrl.trim();
    if (!url) {
      Alert.alert("رابط البث مطلوب", "الصق رابط بثك من تيك توك أو إنستقرام أو يوتيوب.");
      return;
    }

    setSavingLive(true);
    try {
      const body: any = { is_live: true, live_url: url };

      if (liveItemId) {
        const price = Number(liveItemPrice);
        if (!Number.isFinite(price) || price <= 0) {
          Alert.alert("سعر غير صحيح", "اكتب سعر البث للمنتج المختار.");
          return;
        }
        body.live_item_id = liveItemId;
        body.live_item_price = price;
      }

      const res  = await fetch(`${API}/api/chefs/${chefId}/live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);

      if (!json?.success) {
        Alert.alert("تعذر بدء البث", json?.message || "حاول مرة ثانية.");
        return;
      }

      setChef(json.data);
      setShowLive(false);
      Alert.alert("أنت على الهواء", "متجرك صار يظهر بشارة \"يبث الآن\" في الرئيسية. البث يتوقف تلقائياً بعد أربع ساعات.");
    } catch {
      Alert.alert("مشكلة اتصال", "تأكد من الإنترنت وحاول مرة ثانية.");
    } finally {
      setSavingLive(false);
    }
  };

  const stopLive = async () => {
    if (!chefId || savingLive) return;

    setSavingLive(true);
    try {
      const res  = await fetch(`${API}/api/chefs/${chefId}/live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_live: false }),
      });
      const json = await res.json().catch(() => null);

      if (json?.success) {
        setChef(json.data);
        setLiveUrl("");
        setLiveItemId(null);
        setLiveItemPrice("");
      }
    } catch {}
    finally {
      setSavingLive(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    // إرسال هوية الشيف — الخادم يتحقق من ملكية الطلب قبل أي تغيير
    const stored = await AsyncStorage.getItem("user");
    const userId = stored ? JSON.parse(stored)?.id : null;
    const res  = await fetch(`${API}/api/orders/${orderId}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, user_id: userId }),
    });
    const json = await res.json();
    if (json.success) { Alert.alert("تم التحديث"); load(true); }
    else Alert.alert("خطأ", json.message || "تعذر التحديث");
  };

  const openTimeModal = (order: any, action: "confirm" | "propose") => {
    setTimeModalOrder(order);
    setTimeAction(action);
    // إذا كان في وقت مطلوب من العميل، ابدأ به (الباك إند يسميه proposed_time)
    const requestedTime = order.proposed_time || order.requested_time
    if (requestedTime) {
      const d = new Date(requestedTime);
      setSelectedDate(d);
      setSelectedHour(d.getHours());
      setSelectedMinute(String(d.getMinutes()).padStart(2, "0"));
    } else {
      setSelectedDate(new Date());
      setSelectedHour(12);
      setSelectedMinute("00");
    }
    setShowTimeModal(true);
  };

  const handleConfirmTime = async () => {
    if (!selectedDate || !timeModalOrder) return;
    const d = new Date(selectedDate);
    d.setHours(selectedHour, parseInt(selectedMinute), 0, 0);

    setTimeLoading(true);
    try {
      const res  = await fetch(`${API}/api/orders/${timeModalOrder.id}/confirm-time`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: timeAction, confirmed_time: d.toISOString() }),
      });
      const json = await res.json();
      if (json.success) {
        setShowTimeModal(false);
        Alert.alert(
          "تم",
          timeAction === "confirm" ? "تم تأكيد وقت الحجز وإشعار العميل" : "تم إرسال الوقت البديل للعميل"
        );
        load(true);
      } else {
        Alert.alert("خطأ", json.message || "تعذر التحديث");
      }
    } finally {
      setTimeLoading(false);
    }
  };

  const activeOrders  = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const historyOrders = orders.filter(o => ["delivered",  "cancelled"].includes(o.status));
  const displayOrders = tab === "active" ? activeOrders : historyOrders;
  const currentStatus = chefStatusList.find(s => s.id === chefStatus) || chefStatusList[0];

  const getActions = (status: string, id: string, order: any) => {
    const isPreorder = order.order_type === "preorder";
    const negotiation = order.time_negotiation_status;

    // طلب مسبق بانتظار رد الشيف الأول على الوقت
    if (status === "pending" && isPreorder && negotiation === "pending") {
      const requestedTime = order.proposed_time || order.requested_time;
      return (
        <View>
          {requestedTime && (
            <View style={s.requestedTimeBox}>
              <CalendarDays size={14} color={c.gold} strokeWidth={1.8} />
              <Text style={s.requestedTimeText}>
                الوقت المطلوب: {formatArabicDateTime(requestedTime)}
              </Text>
            </View>
          )}
          <View style={s.btns}>
            <TouchableOpacity style={s.btnAcc} onPress={() => openTimeModal(order, "confirm")}>
              <View style={s.btnInner}><CheckCircle2 size={14} color={c.gold} /><Text style={s.btnText}>تأكيد الوقت</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnProp} onPress={() => openTimeModal(order, "propose")}>
              <View style={s.btnInner}><Clock3 size={14} color={c.success} /><Text style={s.btnTextProp}>وقت بديل</Text></View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[s.btnRej, { marginTop: 8 }]} onPress={() => Alert.alert("رفض الحجز", "تبي ترفض طلب الحجز؟", [
            { text: "لا", style: "cancel" },
            { text: "نعم", style: "destructive", onPress: () => updateStatus(id, "cancelled") },
          ])}>
            <View style={s.btnInner}><X size={14} color={c.danger} /><Text style={s.btnTextRej}>رفض الحجز</Text></View>
          </TouchableOpacity>
        </View>
      );
    }

    // الشيف اقترح وقت بديل — بانتظار رد العميل، ما فيه إجراء للشيف الحين
    if (status === "pending" && isPreorder && negotiation === "chef_countered") {
      return (
        <View style={s.requestedTimeBox}>
          <Clock3 size={14} color={c.success} strokeWidth={1.8} />
          <Text style={s.requestedTimeText}>
            بانتظار رد العميل على الوقت البديل المقترح
          </Text>
        </View>
      );
    }

    // العميل وافق على الوقت (أو الشيف أكده مباشرة) — بانتظار القبول الرسمي وبدء التحضير
    if (status === "pending" && isPreorder && negotiation === "accepted") {
      return (
        <View style={s.btns}>
          <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "accepted")}>
            <View style={s.btnInner}><Check size={14} color={c.gold} /><Text style={s.btnText}>قبول وبدء التحضير</Text></View>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === "pending") return (
      <View style={s.btns}>
        <TouchableOpacity style={s.btnAcc} onPress={() => Alert.alert("قبول الطلب", "تبي تقبل؟", [
          { text: "لا", style: "cancel" },
          { text: "نعم", onPress: () => updateStatus(id, "accepted") },
        ])}>
          <View style={s.btnInner}><Check size={14} color={c.gold} /><Text style={s.btnText}>قبول</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnRej} onPress={() => Alert.alert("رفض الطلب", "تبي ترفض؟", [
          { text: "لا", style: "cancel" },
          { text: "نعم", style: "destructive", onPress: () => updateStatus(id, "cancelled") },
        ])}>
          <View style={s.btnInner}><X size={14} color={c.danger} /><Text style={s.btnTextRej}>رفض</Text></View>
        </TouchableOpacity>
      </View>
    );


    if (status === "accepted") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "preparing")}>
        <View style={s.btnInner}><Flame size={14} color={c.gold} /><Text style={s.btnText}>بدأ التحضير</Text></View>
      </TouchableOpacity>
    );

    if (status === "preparing") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "ready")}>
        <View style={s.btnInner}><Check size={14} color={c.gold} /><Text style={s.btnText}>{order.delivery_address === "استلام شخصي" ? "الطلب جاهز — أبلغ العميل" : "الطلب جاهز — ابلغ المندوب"}</Text></View>
      </TouchableOpacity>
    );

    // طلب استلام شخصي جاهز: الشيف يوثق استلام العميل (وترصد الأرباح)
    if (status === "ready" && order.delivery_address === "استلام شخصي") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => Alert.alert("تأكيد الاستلام", "العميل استلم طلبه فعلياً؟", [
        { text: "لا", style: "cancel" },
        { text: "نعم", onPress: () => updateStatus(id, "delivered") },
      ])}>
        <View style={s.btnInner}><CheckCircle2 size={14} color={c.gold} /><Text style={s.btnText}>تم استلام العميل — إتمام الطلب</Text></View>
      </TouchableOpacity>
    );

    return null;
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} style={s.backHomeBtn}>
            <ArrowRight size={20} color={c.gold} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <LogOut size={18} color={c.danger} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <Text style={s.title}>{chef?.offers_drinks ? "لوحة الباريستا" : "لوحة متجري"}</Text>
        <TouchableOpacity onPress={() => load(true)} style={s.refreshBtn}>
          <RefreshCw size={18} color={c.gold} />
        </TouchableOpacity>
      </View>


      <FlatList
            data={loading ? [] : displayOrders}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.gold} />}
            ListHeaderComponent={
              <View style={{ marginHorizontal: -16 }}>
          <TouchableOpacity style={[s.statusBar, { borderColor: currentStatus.color + "44" }]} onPress={() => setShowStatus(true)}>
            <View style={s.btnInner}>
              <ChevronDown size={16} color={currentStatus.color} />
              <Text style={[s.statusChange, { color: currentStatus.color }]}>تغيير</Text>
            </View>
            <View>
              <Text style={s.statusTitle}>حالة متجري</Text>
              <Text style={[s.statusVal, { color: currentStatus.color }]}>● {currentStatus.label}</Text>
              <Text style={s.statusDesc}>{currentStatus.desc}</Text>
            </View>
          </TouchableOpacity>

          <View style={s.drinksBar}>
            <Switch
              value={Boolean(chef?.offers_drinks)}
              onValueChange={toggleDrinks}
              trackColor={{ false: c.surfaceAlt, true: c.goldBorder }}
              thumbColor={chef?.offers_drinks ? c.gold : c.textSoft}
            />
            <View style={s.drinksInfo}>
              <Coffee size={15} color={c.gold} strokeWidth={1.8} />
              <Text style={s.drinksText}>أقدّم مشروبات (باريستا)</Text>
            </View>
          </View>

          {chef?.is_live ? (
            <View style={s.liveOnBar}>
              <TouchableOpacity style={s.liveStopBtn} onPress={stopLive} disabled={savingLive}>
                {savingLive
                  ? <ActivityIndicator color={c.danger} />
                  : <Text style={s.liveStopText}>إيقاف</Text>}
              </TouchableOpacity>

              <View style={s.liveInfo}>
                <View style={s.liveDotRow}>
                  <View style={s.liveDot} />
                  <Text style={s.liveOnTitle}>أنت على الهواء الآن</Text>
                </View>
                <Text style={s.liveOnSub}>يتوقف تلقائياً بعد أربع ساعات من البدء</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.liveBtn} onPress={() => setShowLive(true)}>
              <View style={s.btnInner}>
                <Radio size={16} color={c.gold} strokeWidth={1.8} />
                <Text style={s.liveBtnText}>أنا أبث الآن — اربط بثك بمتجرك</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.locationBtn} onPress={openLocationMap}>
            <View style={s.btnInner}>
              <MapPin size={16} color={chef?.lat && chef?.lng ? c.success : c.danger} strokeWidth={1.8} />
              <Text style={s.locationBtnText}>
                {chef?.lat && chef?.lng ? "تحديث موقعي على الخريطة" : "حدد موقعك الآن (مطلوب لحساب التوصيل)"}
              </Text>
            </View>
          </TouchableOpacity>

          {certInfo ? (
            <View style={s.certCard}>
              <View style={s.certRow}>
                <FileText
                  size={16}
                  color={certInfo.state === "uploaded" ? c.success : certInfo.state === "late" ? c.danger : c.gold}
                  strokeWidth={1.8}
                />
                <Text style={s.certTitle}>شهادة العمل الحر</Text>
              </View>

              <Text
                style={[
                  s.certStatus,
                  certInfo.state === "uploaded" && { color: c.success },
                  certInfo.state === "late" && { color: c.danger },
                ]}
              >
                {certInfo.state === "uploaded"
                  ? `مرفوعة${certInfo.date ? ` بتاريخ ${certInfo.date}` : ""}`
                  : certInfo.state === "pending"
                  ? `غير إلزامية الآن — متبقي ${certInfo.left} يوم لرفعها`
                  : `انتهت المهلة قبل ${certInfo.late} يوم — ارفعها الآن لتجنب إيقاف الحساب`}
              </Text>

              <TouchableOpacity style={s.certBtn} onPress={uploadCert} disabled={certUploading}>
                {certUploading
                  ? <ActivityIndicator color={c.surface} size="small" />
                  : <Text style={s.certBtnText}>{certInfo.state === "uploaded" ? "استبدال الشهادة" : "رفع الشهادة"}</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/menu" as any)}>
            <View style={s.btnInner}>
              <UtensilsCrossed size={16} color={c.gold} />
              <Text style={s.menuBtnText}>قائمتي</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/dashboard/chef/offers" as any)}>
            <View style={s.btnInner}>
              <Percent size={16} color={c.gold} />
              <Text style={s.menuBtnText}>العروض والخصومات</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/dashboard/chef/earnings" as any)}>
            <View style={s.btnInner}>
              <Wallet size={16} color={c.gold} />
              <Text style={s.menuBtnText}>الأرباح والمحفظة</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.menuBtn}
            onPress={() => {
              if (!chefId) return;
              router.push(`/chef/${chefId}` as any);
            }}
          >
            <View style={s.btnInner}>
              <Eye size={16} color={c.gold} />
              <Text style={s.menuBtnText}>معاينة متجري</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.menuBtn}
            onPress={async () => {
              if (!chefId) return;
              try {
                await Share.share({
                  message: "تصفح متجري على زعفران واطلب مباشرة:\n" + API + "/store/" + chefId,
                });
              } catch {}
            }}
          >
            <View style={s.btnInner}>
              <Share2 size={16} color={c.gold} />
              <Text style={s.menuBtnText}>مشاركة متجري</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.menuBtn}
            onPress={() => {
              if (!chefId) return;
              setShowQr(true);
            }}
          >
            <View style={s.btnInner}>
              <QrCode size={16} color={c.gold} />
              <Text style={s.menuBtnText}>رمز متجري</Text>
            </View>
          </TouchableOpacity>

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{activeOrders.length}</Text>
              <Text style={s.statLabel}>نشطة</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{activeOrders.filter(o => o.order_type === "preorder").length}</Text>
              <Text style={[s.statLabel, { color: c.gold }]}>حجوزات</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{historyOrders.filter(o => o.status === "delivered").length}</Text>
              <Text style={s.statLabel}>مكتملة</Text>
            </View>
            <View style={s.statCard}>
              <View style={s.btnInner}>
                <Star size={12} color={c.gold} />
                <Text style={s.statNum}>{chef?.rating_avg || "—"}</Text>
              </View>
              <Text style={s.statLabel}>التقييم</Text>
            </View>
          </View>

          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tabBtn, tab === "active" && s.tabBtnActive]} onPress={() => setTab("active")}>
              <Text style={[s.tabText, tab === "active" && s.tabTextActive]}>النشطة ({activeOrders.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tabBtn, tab === "history" && s.tabBtnActive]} onPress={() => setTab("history")}>
              <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>السجل ({historyOrders.length})</Text>
            </TouchableOpacity>
          </View>

              </View>
            }
            renderItem={({ item }) => (
              <View style={[s.card, item.order_type === "preorder" && s.cardPreorder]}>
                <View style={s.row}>
                  <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                  <View style={s.badgesRow}>
                    {item.order_type === "preorder" && (
                      <View style={s.preorderTag}>
                        <CalendarDays size={10} color={c.gold} strokeWidth={1.8} />
                        <Text style={s.preorderTagText}>حجز مسبق</Text>
                      </View>
                    )}
                    <View style={[s.badge, { backgroundColor: statusMap[item.status]?.color + "22" }]}>
                      <Text style={[s.badgeText, { color: statusMap[item.status]?.color }]}>
                        {statusMap[item.status]?.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={s.customer}>{item.users?.full_name}</Text>
                <Text style={s.phone}>{item.users?.phone}</Text>
                <Text style={s.address}>{item.delivery_address}</Text>

                {item.order_items?.map((oi: any) => (
                  <Text key={oi.id} style={s.orderItem}>• {oi.name} x {oi.quantity} — {oi.subtotal} ريال</Text>
                ))}

                <View style={s.totalRow}>
                  <Text style={s.total}>{item.total} ريال</Text>
                  <Text style={s.delivery}>توصيل: {item.delivery_fee} ريال</Text>
                </View>

                {item.notes ? <Text style={s.notes}>{item.notes}</Text> : null}

                {/* وقت الحجز المؤكد */}
                {item.confirmed_time && (
                  <View style={s.confirmedTimeBox}>
                    <CheckCircle2 size={14} color={c.success} strokeWidth={1.8} />
                    <Text style={s.confirmedTimeText}>
                      الوقت المؤكد: {formatArabicDateTime(item.confirmed_time)}
                    </Text>
                  </View>
                )}

                {getActions(item.status, item.id, item)}
              </View>
            )}
            ListEmptyComponent={
              loading
                ? <ActivityIndicator color={c.gold} style={{ marginTop: 40 }} size="large" />
                : <View style={s.emptyWrap}>
                    {tab === "active" ? <Package size={52} color={c.textMuted} /> : <ClipboardList size={52} color={c.textMuted} />}
                    <Text style={s.empty}>{tab === "active" ? "ما في طلبات نشطة" : "ما في سجل بعد"}</Text>
                  </View>
            }
          />

      {/* Modal حالة المتجر */}
      <Modal visible={showStatus} transparent animationType="slide" onRequestClose={() => setShowStatus(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>اختر حالة متجرك</Text>
            {chefStatusList.map(st => (
              <TouchableOpacity key={st.id}
                style={[s.statusOption, chefStatus === st.id && { borderColor: st.color, backgroundColor: st.color + "11" }]}
                onPress={() => changeStatus(st.id)}>
                <View>
                  <Text style={[s.statusOptionLabel, { color: st.color }]}>● {st.label}</Text>
                  <Text style={s.statusOptionDesc}>{st.desc}</Text>
                </View>
                {chefStatus === st.id && <Check size={18} color={st.color} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalClose} onPress={() => setShowStatus(false)}>
              <Text style={s.modalCloseText}>الغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal تأكيد / اقتراح وقت */}
      <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>
              {timeAction === "confirm" ? "تأكيد وقت التسليم" : "اقتراح وقت بديل"}
            </Text>

            {/* الباك إند يخزّن وقت العميل في proposed_time — requested_time اسم بديل فقط */}
            {(timeModalOrder?.proposed_time || timeModalOrder?.requested_time) && (
              <View style={s.requestedTimeBox}>
                <CalendarDays size={14} color={c.gold} strokeWidth={1.8} />
                <Text style={s.requestedTimeText}>
                  طلب العميل: {formatArabicDateTime(timeModalOrder.proposed_time || timeModalOrder.requested_time)}
                </Text>
              </View>
            )}

            {/* اختيار اليوم */}
            <Text style={s.pickerLabel}>اليوم</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.datesRow}>
              {availableDates.map((date, idx) => {
                const active = selectedDate?.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity key={idx} style={[s.dateChip, active && s.dateChipActive]}
                    onPress={() => setSelectedDate(date)} activeOpacity={0.85}>
                    <Text style={[s.dateChipDay, active && s.dateChipTextActive]}>
                      {date.toLocaleDateString("ar-SA", { weekday: "short" })}
                    </Text>
                    <Text style={[s.dateChipNum, active && s.dateChipTextActive]}>{date.getDate()}</Text>
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

            <TouchableOpacity style={s.btnAcc}
              onPress={handleConfirmTime} disabled={timeLoading || !selectedDate} activeOpacity={0.9}>
              {timeLoading ? <ActivityIndicator color={c.gold} /> : (
                <View style={s.btnInner}>
                  <CheckCircle2 size={14} color={c.gold} />
                  <Text style={s.btnText}>
                    {timeAction === "confirm" ? "تأكيد الوقت" : "إرسال الوقت البديل"}
                    {selectedDate ? ` — ${formatArabicTime(selectedHour, selectedMinute)}` : ""}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.modalClose} onPress={() => setShowTimeModal(false)}>
              <Text style={s.modalCloseText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* مودال تحديد الموقع على الخريطة */}
      <Modal visible={showLocationMap} animationType="slide" onRequestClose={() => setShowLocationMap(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={s.mapHeader}>
            <TouchableOpacity onPress={() => setShowLocationMap(false)}>
              <Text style={s.mapHeaderBtn}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={s.mapHeaderTitle}>حدد موقع متجرك</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* showsUserLocation فقط عند وجود إذن — بدونه ينهار التطبيق على أندرويد */}
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
          >
            {selectedLocation && (
              <Marker
                coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
                pinColor={c.gold}
              />
            )}
          </MapView>

          <View style={s.mapFooter}>
            <Text style={s.mapHint}>اضغط على الخريطة لتحديد موقع متجرك بدقة</Text>
            <TouchableOpacity style={s.useCurrentBtn} onPress={useMyCurrentLocation} disabled={locating}>
              {locating ? <ActivityIndicator color={c.gold} size="small" /> : (
                <>
                  <MapPin size={14} color={c.gold} strokeWidth={1.8} />
                  <Text style={s.useCurrentBtnText}>استخدم موقعي الحالي</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.saveLocationBtn}
              onPress={saveLocation}
              disabled={!selectedLocation || savingLocation}
            >
              {savingLocation
                ? <ActivityIndicator color={c.onGold} />
                : <Text style={s.saveLocationBtnText}>حفظ الموقع</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* البث المباشر — نربط بث المتجر الموجود، لا بث داخل التطبيق */}
      <Modal visible={showLive} animationType="slide" transparent onRequestClose={() => setShowLive(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
        <TouchableOpacity
          activeOpacity={1}
          style={s.qrOverlay}
          onPress={() => setShowLive(false)}
        >
          <TouchableOpacity activeOpacity={1} style={s.liveBox} onPress={() => {}}>
            <TouchableOpacity style={s.qrClose} onPress={() => setShowLive(false)}>
              <X size={20} color={c.textSoft} />
            </TouchableOpacity>

            <Text style={s.qrTitle}>اربط بثك بمتجرك</Text>
            <Text style={s.liveModalSub}>
              تبث على تيك توك أو إنستقرام أو يوتيوب؟ الصق رابط بثك، ويظهر متجرك بشارة "يبث الآن" في رئيسية زعفران — فمن يشاهدك يطلب منك مباشرة.
            </Text>

            <Text style={s.liveLabel}>رابط البث</Text>
            <TextInput
              style={s.liveInput}
              placeholder="https://..."
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              value={liveUrl}
              onChangeText={setLiveUrl}
            />

            <Text style={s.liveNote}>
              انسخ رابط البث من زر المشاركة في التطبيق الذي تبث منه — أو الصق رابط حسابك إن كنت تنشر على سناب.
            </Text>

            <TouchableOpacity style={s.liveGoBtn} onPress={startLive} disabled={savingLive}>
              {savingLive
                ? <ActivityIndicator color={c.onGold} />
                : (
                  <>
                    <Radio size={16} color={c.onGold} strokeWidth={2} />
                    <Text style={s.liveGoText}>ابدأ البث</Text>
                  </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={s.liveCancelBtn} onPress={() => setShowLive(false)}>
              <Text style={s.liveCancelText}>إلغاء</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* رمز المتجر — يفتح صفحة المتجر، والصفحة تحوّل لتطبيق زعفران */}
      <Modal visible={showQr} animationType="fade" transparent onRequestClose={() => setShowQr(false)}>
        <TouchableOpacity activeOpacity={1} style={s.qrOverlay} onPress={() => setShowQr(false)}>
          <TouchableOpacity activeOpacity={1} style={s.qrBox} onPress={() => {}}>
            <TouchableOpacity style={s.qrClose} onPress={() => setShowQr(false)}>
              <X size={20} color={c.textSoft} />
            </TouchableOpacity>

            <Text style={s.qrTitle}>رمز متجري</Text>
            <Text style={s.qrSub}>امسحه بالكاميرا لتفتح صفحة المتجر</Text>

            <View style={s.qrFrame}>
              {chefId ? (
                <QRCode
                  value={API + "/store/" + chefId}
                  size={208}
                  color="#17100B"
                  backgroundColor="#FFFFFF"
                  logo={require("@/assets/images/icon.png")}
                  logoSize={46}
                  logoBackgroundColor="#FFFFFF"
                  logoBorderRadius={10}
                  logoMargin={3}
                />
              ) : null}
            </View>

            <Text style={s.qrHint}>
              اطبعه على أكياسك أو انشره في حساباتك — خذ لقطة شاشة للرمز لحفظه.
            </Text>

            <TouchableOpacity
              style={s.qrShareBtn}
              onPress={async () => {
                if (!chefId) return;
                try {
                  await Share.share({
                    message: "تصفح متجري على زعفران واطلب مباشرة:\n" + API + "/store/" + chefId,
                  });
                } catch {}
              }}
            >
              <Share2 size={16} color={c.onGold} />
              <Text style={s.qrShareText}>مشاركة الرابط</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe:              { flex: 1, backgroundColor: c.bg },
  header:            { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  title:             { fontSize: 18, fontWeight: "900", color: c.text, fontFamily: "Almarai_800ExtraBold" },
  refreshBtn:        { padding: 4 },
  logoutBtn:         { padding: 4 },
  backHomeBtn:       { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  statusBar:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1 },
  drinksBar:         { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: c.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.goldBorder },
  drinksInfo:        { flexDirection: "row-reverse", alignItems: "center", gap: 6, flex: 1 },
  drinksText:        { color: c.text, fontSize: 13, fontFamily: "Almarai_700Bold" },

  locationBtn:        { marginHorizontal: 16, marginBottom: 12, backgroundColor: c.surface, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: c.goldBorder },
  locationBtnText:     { color: c.text, fontSize: 13, fontFamily: "Almarai_700Bold" },
  certCard:            { marginHorizontal: 16, marginBottom: 12, backgroundColor: c.surface, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: c.goldBorder },
  certRow:             { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  certTitle:           { color: c.text, fontSize: 13, fontFamily: "Almarai_700Bold" },
  certStatus:          { color: c.gold, fontSize: 12, lineHeight: 20, marginTop: 6, fontFamily: "Almarai_400Regular", textAlign: "right" },
  certBtn:             { marginTop: 10, backgroundColor: c.gold, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  certBtnText:         { color: c.surface, fontSize: 13, fontFamily: "Almarai_800ExtraBold" },

  mapHeader:          { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: c.goldSoft },
  mapHeaderBtn:        { color: c.gold, fontSize: 14, fontFamily: "Almarai_700Bold" },
  mapHeaderTitle:      { color: c.text, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  mapFooter:          { padding: 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.goldSoft },
  mapHint:            { color: c.textSoft, fontSize: 12, fontFamily: "Almarai_400Regular", textAlign: "center", marginBottom: 12 },
  saveLocationBtn:     { backgroundColor: c.gold, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveLocationBtnText: { color: c.bg, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  useCurrentBtn:       { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10, paddingVertical: 10, minHeight: 40 },
  useCurrentBtnText:   { color: c.gold, fontSize: 13, fontFamily: "Almarai_700Bold" },
  statusTitle:       { fontSize: 11, color: c.textSoft, textAlign: "right", fontFamily: "Almarai_400Regular", marginBottom: 4 },
  statusVal:         { fontSize: 15, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold" },
  statusDesc:        { fontSize: 11, color: c.textSoft, textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  statusChange:      { fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  liveBtn:           { marginHorizontal: 16, marginBottom: 12, backgroundColor: c.goldSoft, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder },
  liveBtnText:       { color: c.gold, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  liveOnBar:         { marginHorizontal: 16, marginBottom: 12, backgroundColor: c.dangerSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.danger, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  liveInfo:          { flex: 1 },
  liveDotRow:        { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  liveDot:           { width: 9, height: 9, borderRadius: 5, backgroundColor: c.danger },
  liveOnTitle:       { color: c.danger, fontSize: 14, textAlign: "right", fontFamily: "Almarai_800ExtraBold" },
  liveOnSub:         { color: c.textSoft, fontSize: 11, textAlign: "right", marginTop: 4, fontFamily: "Almarai_400Regular" },
  liveStopBtn:       { minWidth: 76, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: c.danger, alignItems: "center", justifyContent: "center" },
  liveStopText:      { color: c.danger, fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  liveBox:           { width: "100%", backgroundColor: c.surface, borderRadius: 26, borderWidth: 1, borderColor: c.border, padding: 22, paddingTop: 44 },
  liveCancelBtn:     { marginTop: 10, minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  liveCancelText:    { color: c.textSoft, fontSize: 14, fontFamily: "Almarai_700Bold" },
  liveModalSub:      { color: c.textSoft, fontSize: 12.5, lineHeight: 22, textAlign: "right", marginTop: 8, marginBottom: 18, fontFamily: "Almarai_400Regular" },
  liveLabel:         { color: c.textSoft, fontSize: 12, textAlign: "right", marginBottom: 7, fontFamily: "Almarai_700Bold" },
  liveInput:         { minHeight: 50, borderRadius: 14, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, color: c.text, fontSize: 14, textAlign: "left", fontFamily: "Almarai_400Regular" },
  liveNote:          { color: c.textMuted, fontSize: 11, textAlign: "right", marginTop: 8, fontFamily: "Almarai_400Regular" },
  liveGoBtn:         { marginTop: 18, minHeight: 50, borderRadius: 15, backgroundColor: c.goldSolid, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 },
  liveGoText:        { color: c.onGold, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  qrOverlay:         { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", paddingHorizontal: 26 },
  qrBox:             { width: "100%", backgroundColor: c.surface, borderRadius: 26, borderWidth: 1, borderColor: c.border, padding: 22, paddingTop: 44, alignItems: "center" },
  qrClose:           { position: "absolute", top: 10, left: 10, padding: 10, zIndex: 5 },
  qrTitle:           { color: c.text, fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  qrSub:             { color: c.textSoft, fontSize: 12, marginTop: 5, marginBottom: 16, fontFamily: "Almarai_400Regular" },
  qrFrame:           { backgroundColor: "#FFFFFF", padding: 14, borderRadius: 18 },
  qrHint:            { color: c.textSoft, fontSize: 12, lineHeight: 21, textAlign: "center", marginTop: 16, fontFamily: "Almarai_400Regular" },
  qrShareBtn:        { marginTop: 16, minHeight: 46, borderRadius: 15, backgroundColor: c.goldSolid, alignSelf: "stretch", alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 },
  qrShareText:       { color: c.onGold, fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  menuBtn:           { marginHorizontal: 16, marginBottom: 12, backgroundColor: c.goldSoft, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder },
  menuBtnText:       { color: c.gold, fontSize: 15, fontWeight: "900", fontFamily: "Almarai_800ExtraBold" },
  statsRow:          { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard:          { flex: 1, backgroundColor: c.surface, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.goldSoft },
  statNum:           { fontSize: 20, fontWeight: "900", color: c.gold, fontFamily: "Almarai_800ExtraBold" },
  statLabel:         { fontSize: 10, color: c.textSoft, fontFamily: "Almarai_400Regular", marginTop: 2 },
  tabRow:            { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn:            { flex: 1, backgroundColor: c.surface, borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: c.goldSoft },
  tabBtnActive:      { backgroundColor: c.border, borderColor: c.goldBorder },
  tabText:           { fontSize: 12, color: c.textSoft, fontFamily: "Almarai_700Bold" },
  tabTextActive:     { color: c.gold },
  card:              { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  cardPreorder:      { borderColor: c.border, backgroundColor: c.surface },
  row:               { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  badgesRow:         { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  preorderTag:       { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: c.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  preorderTagText:   { color: c.gold, fontSize: 10, fontFamily: "Almarai_700Bold" },
  orderId:           { fontSize: 13, fontWeight: "800", color: c.text, fontFamily: "Almarai_700Bold" },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:         { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  customer:          { fontSize: 14, color: c.text, textAlign: "right", marginBottom: 2, fontFamily: "Almarai_700Bold" },
  phone:             { fontSize: 12, color: c.gold, textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  address:           { fontSize: 12, color: c.textSoft, textAlign: "right", marginBottom: 8, fontFamily: "Almarai_400Regular" },
  orderItem:         { fontSize: 12, color: c.gold, textAlign: "right", marginBottom: 2, fontFamily: "Almarai_400Regular" },
  totalRow:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  total:             { fontSize: 16, fontWeight: "900", color: c.gold, fontFamily: "Almarai_800ExtraBold" },
  delivery:          { fontSize: 11, color: c.textSoft, fontFamily: "Almarai_400Regular" },
  notes:             { fontSize: 12, color: c.textSoft, textAlign: "right", marginBottom: 10, fontFamily: "Almarai_400Regular" },
  requestedTimeBox:  { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: c.border, padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  requestedTimeText: { flex: 1, color: c.gold, textAlign: "right", fontSize: 12, fontFamily: "Almarai_700Bold" },
  confirmedTimeBox:  { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: c.successSoft, padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.successSoft },
  confirmedTimeText: { flex: 1, color: c.success, textAlign: "right", fontSize: 12, fontFamily: "Almarai_700Bold" },
  btns:              { flexDirection: "row-reverse", gap: 8, marginTop: 8 },
  btnInner:          { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  btnAcc:            { flex: 1, backgroundColor: c.goldBorder, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder, marginTop: 8 },
  btnRej:            { flex: 1, backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.dangerSoft, marginTop: 8 },
  btnProp:           { flex: 1, backgroundColor: c.successSoft, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.successSoft, marginTop: 8 },
  btnText:           { color: c.gold, fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextRej:        { color: c.danger, fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextProp:       { color: c.success, fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  emptyWrap:         { alignItems: "center", marginTop: 60, gap: 16 },
  empty:             { textAlign: "center", color: c.textSoft, fontSize: 14, fontFamily: "Almarai_400Regular" },
  modalOverlay:      { flex: 1, backgroundColor: c.overlay, justifyContent: "flex-end" },
  modalBox:          { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: c.goldBorder, maxHeight: "85%" },
  modalTitle:        { fontSize: 18, fontWeight: "900", color: c.text, textAlign: "right", marginBottom: 16, fontFamily: "Almarai_800ExtraBold" },
  statusOption:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.goldSoft, backgroundColor: c.surfaceAlt },
  statusOptionLabel: { fontSize: 15, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold", marginBottom: 4 },
  statusOptionDesc:  { fontSize: 11, color: c.textSoft, textAlign: "right", fontFamily: "Almarai_400Regular" },
  modalClose:        { backgroundColor: c.dangerSoft, borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: c.dangerSoft },
  modalCloseText:    { color: c.danger, fontSize: 14, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  pickerLabel:       { color: c.gold, textAlign: "right", fontSize: 12, fontFamily: "Almarai_800ExtraBold", marginBottom: 8, marginTop: 12 },
  datesRow:          { flexDirection: "row-reverse", gap: 8, paddingVertical: 4, paddingBottom: 8 },
  dateChip:          { width: 54, height: 64, borderRadius: 14, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", gap: 4 },
  dateChipActive:    { backgroundColor: c.goldBorder, borderColor: c.goldBorder },
  dateChipDay:       { color: c.textSoft, fontSize: 10, fontFamily: "Almarai_400Regular" },
  dateChipNum:       { color: c.text, fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  dateChipTextActive:{ color: c.gold },
  timeChip:          { paddingHorizontal: 14, height: 40, borderRadius: 12, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  timeChipText:      { color: c.textSoft, fontSize: 12, fontFamily: "Almarai_700Bold" },
  minutesRow:        { flexDirection: "row-reverse", gap: 10, marginBottom: 8 },
  minuteChip:        { flex: 1, height: 46, borderRadius: 12, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  minuteChipText:    { color: c.textSoft, fontSize: 14, fontFamily: "Almarai_700Bold" },
});