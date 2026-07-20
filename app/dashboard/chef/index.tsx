import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Modal,
  ScrollView, RefreshControl, Switch,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  ArrowRight, FileText
} from "lucide-react-native";
import { pickCompressedImage, uploadImageToBucket } from "@/utils/images";

const API = "https://zafaran-backend-production.up.railway.app";

const STATUS: any = {
  pending:        { label: "بانتظار القبول",        color: "#F0A500" },
  pending_time:   { label: "بانتظار تأكيد الوقت",   color: "#FF9800" },
  time_confirmed: { label: "تم تأكيد الوقت",        color: "#8BC34A" },
  accepted:       { label: "تم القبول",              color: "#2196F3" },
  preparing:      { label: "قيد التحضير",            color: "#FF6600" },
  ready:          { label: "جاهز",                    color: "#9C27B0" },
  delivering:     { label: "في الطريق",              color: "#03A9F4" },
  delivered:      { label: "تم التسليم",             color: "#4CAF50" },
  cancelled:      { label: "ملغي",                   color: "#E53935" },
};



const CHEF_STATUS = [
  { id: "open",          label: "مفتوح",          desc: "يستقبل طلبات فورية",          color: "#4CAF50" },
  { id: "preorder",      label: "حجز مسبق فقط",   desc: "للبوفيهات والمطابخ الكبيرة", color: "#F0A500" },
  { id: "closed",        label: "غير متاح",        desc: "يختفي من القائمة كلياً",     color: "#E53935" },
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
    const user = JSON.parse(u);
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
      const res  = await fetch(`${API}/api/orders/chef/${chefId}`);
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
        router.replace("/login");
      }},
    ]);
  };

  const openLocationMap = async () => {
    // نطلب موقع الجوال الحالي فعلياً دايماً (نفس سلوك شاشة العميل) —
    // بدل الاعتماد بصمت على إحداثيات قديمة قد تكون بيانات تجريبية غير حقيقية
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === "granted") {
      try {
        const loc = await Location.getCurrentPositionAsync({});
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
      Alert.alert("إذن الموقع مطلوب", "فعّل إذن الموقع من إعدادات الجوال، أو حدد موقعك يدوياً على الخريطة.");
    }

    setShowLocationMap(true);
  };

  const useMyCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن الموقع مطلوب", "فعّل إذن الموقع من إعدادات الجوال.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setMapRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    setSelectedLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ lat: latitude, lng: longitude });
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
      Alert.alert("تم التحديث", `حالتك الآن: ${CHEF_STATUS.find(s => s.id === newStatus)?.label}`);
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
  const currentStatus = CHEF_STATUS.find(s => s.id === chefStatus) || CHEF_STATUS[0];

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
              <CalendarDays size={14} color="#FF9800" strokeWidth={1.8} />
              <Text style={s.requestedTimeText}>
                الوقت المطلوب: {formatArabicDateTime(requestedTime)}
              </Text>
            </View>
          )}
          <View style={s.btns}>
            <TouchableOpacity style={s.btnAcc} onPress={() => openTimeModal(order, "confirm")}>
              <View style={s.btnInner}><CheckCircle2 size={14} color="#F0A500" /><Text style={s.btnText}>تأكيد الوقت</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnProp} onPress={() => openTimeModal(order, "propose")}>
              <View style={s.btnInner}><Clock3 size={14} color="#8BC34A" /><Text style={s.btnTextProp}>وقت بديل</Text></View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[s.btnRej, { marginTop: 8 }]} onPress={() => Alert.alert("رفض الحجز", "تبي ترفض طلب الحجز؟", [
            { text: "لا", style: "cancel" },
            { text: "نعم", style: "destructive", onPress: () => updateStatus(id, "cancelled") },
          ])}>
            <View style={s.btnInner}><X size={14} color="#E53935" /><Text style={s.btnTextRej}>رفض الحجز</Text></View>
          </TouchableOpacity>
        </View>
      );
    }

    // الشيف اقترح وقت بديل — بانتظار رد العميل، ما فيه إجراء للشيف الحين
    if (status === "pending" && isPreorder && negotiation === "chef_countered") {
      return (
        <View style={s.requestedTimeBox}>
          <Clock3 size={14} color="#8BC34A" strokeWidth={1.8} />
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
            <View style={s.btnInner}><Check size={14} color="#F0A500" /><Text style={s.btnText}>قبول وبدء التحضير</Text></View>
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
          <View style={s.btnInner}><Check size={14} color="#F0A500" /><Text style={s.btnText}>قبول</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnRej} onPress={() => Alert.alert("رفض الطلب", "تبي ترفض؟", [
          { text: "لا", style: "cancel" },
          { text: "نعم", style: "destructive", onPress: () => updateStatus(id, "cancelled") },
        ])}>
          <View style={s.btnInner}><X size={14} color="#E53935" /><Text style={s.btnTextRej}>رفض</Text></View>
        </TouchableOpacity>
      </View>
    );


    if (status === "accepted") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "preparing")}>
        <View style={s.btnInner}><Flame size={14} color="#F0A500" /><Text style={s.btnText}>بدأ التحضير</Text></View>
      </TouchableOpacity>
    );

    if (status === "preparing") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => updateStatus(id, "ready")}>
        <View style={s.btnInner}><Check size={14} color="#F0A500" /><Text style={s.btnText}>{order.delivery_address === "استلام شخصي" ? "الطلب جاهز — أبلغ العميل" : "الطلب جاهز — ابلغ المندوب"}</Text></View>
      </TouchableOpacity>
    );

    // طلب استلام شخصي جاهز: الشيف يوثق استلام العميل (وترصد الأرباح)
    if (status === "ready" && order.delivery_address === "استلام شخصي") return (
      <TouchableOpacity style={s.btnAcc} onPress={() => Alert.alert("تأكيد الاستلام", "العميل استلم طلبه فعلياً؟", [
        { text: "لا", style: "cancel" },
        { text: "نعم", onPress: () => updateStatus(id, "delivered") },
      ])}>
        <View style={s.btnInner}><CheckCircle2 size={14} color="#F0A500" /><Text style={s.btnText}>تم استلام العميل — إتمام الطلب</Text></View>
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
            <ArrowRight size={20} color="#F0A500" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <LogOut size={18} color="#E53935" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <Text style={s.title}>{chef?.offers_drinks ? "لوحة الباريستا" : "لوحة الشيف"}</Text>
        <TouchableOpacity onPress={() => load(true)} style={s.refreshBtn}>
          <RefreshCw size={18} color="#F0A500" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[s.statusBar, { borderColor: currentStatus.color + "44" }]} onPress={() => setShowStatus(true)}>
        <View style={s.btnInner}>
          <ChevronDown size={16} color={currentStatus.color} />
          <Text style={[s.statusChange, { color: currentStatus.color }]}>تغيير</Text>
        </View>
        <View>
          <Text style={s.statusTitle}>حالة مطبخي</Text>
          <Text style={[s.statusVal, { color: currentStatus.color }]}>● {currentStatus.label}</Text>
          <Text style={s.statusDesc}>{currentStatus.desc}</Text>
        </View>
      </TouchableOpacity>

      <View style={s.drinksBar}>
        <Switch
          value={Boolean(chef?.offers_drinks)}
          onValueChange={toggleDrinks}
          trackColor={{ false: "#3A2A1A", true: "#F0A50055" }}
          thumbColor={chef?.offers_drinks ? "#F0A500" : "#8A6030"}
        />
        <View style={s.drinksInfo}>
          <Coffee size={15} color="#F0A500" strokeWidth={1.8} />
          <Text style={s.drinksText}>أقدّم مشروبات (باريستا)</Text>
        </View>
      </View>

      <TouchableOpacity style={s.locationBtn} onPress={openLocationMap}>
        <View style={s.btnInner}>
          <MapPin size={16} color={chef?.lat && chef?.lng ? "#4CAF50" : "#E53935"} strokeWidth={1.8} />
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
              color={certInfo.state === "uploaded" ? "#4CAF50" : certInfo.state === "late" ? "#E53935" : "#F0A500"}
              strokeWidth={1.8}
            />
            <Text style={s.certTitle}>شهادة العمل الحر</Text>
          </View>

          <Text
            style={[
              s.certStatus,
              certInfo.state === "uploaded" && { color: "#8AF0A5" },
              certInfo.state === "late" && { color: "#FF9A9A" },
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
              ? <ActivityIndicator color="#1C0F00" size="small" />
              : <Text style={s.certBtnText}>{certInfo.state === "uploaded" ? "استبدال الشهادة" : "رفع الشهادة"}</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/menu" as any)}>
        <View style={s.btnInner}>
          <UtensilsCrossed size={16} color="#F0A500" />
          <Text style={s.menuBtnText}>قائمتي</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/dashboard/chef/earnings" as any)}>
        <View style={s.btnInner}>
          <Wallet size={16} color="#F0A500" />
          <Text style={s.menuBtnText}>الأرباح والمحفظة</Text>
        </View>
      </TouchableOpacity>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{activeOrders.length}</Text>
          <Text style={s.statLabel}>نشطة</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{activeOrders.filter(o => o.order_type === "preorder").length}</Text>
          <Text style={[s.statLabel, { color: "#FF9800" }]}>حجوزات</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{historyOrders.filter(o => o.status === "delivered").length}</Text>
          <Text style={s.statLabel}>مكتملة</Text>
        </View>
        <View style={s.statCard}>
          <View style={s.btnInner}>
            <Star size={12} color="#F0A500" />
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

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={displayOrders}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0A500" />}
            renderItem={({ item }) => (
              <View style={[s.card, item.order_type === "preorder" && s.cardPreorder]}>
                <View style={s.row}>
                  <Text style={s.orderId}>#{item.id.slice(0, 8)}</Text>
                  <View style={s.badgesRow}>
                    {item.order_type === "preorder" && (
                      <View style={s.preorderTag}>
                        <CalendarDays size={10} color="#FF9800" strokeWidth={1.8} />
                        <Text style={s.preorderTagText}>حجز مسبق</Text>
                      </View>
                    )}
                    <View style={[s.badge, { backgroundColor: STATUS[item.status]?.color + "22" }]}>
                      <Text style={[s.badgeText, { color: STATUS[item.status]?.color }]}>
                        {STATUS[item.status]?.label}
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
                    <CheckCircle2 size={14} color="#8BC34A" strokeWidth={1.8} />
                    <Text style={s.confirmedTimeText}>
                      الوقت المؤكد: {formatArabicDateTime(item.confirmed_time)}
                    </Text>
                  </View>
                )}

                {getActions(item.status, item.id, item)}
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                {tab === "active" ? <Package size={52} color="#5A3A18" /> : <ClipboardList size={52} color="#5A3A18" />}
                <Text style={s.empty}>{tab === "active" ? "ما في طلبات نشطة" : "ما في سجل بعد"}</Text>
              </View>
            }
          />
      }

      {/* Modal حالة المطبخ */}
      <Modal visible={showStatus} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>اختر حالة مطبخك</Text>
            {CHEF_STATUS.map(st => (
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

            {timeModalOrder?.requested_time && (
              <View style={s.requestedTimeBox}>
                <CalendarDays size={14} color="#FF9800" strokeWidth={1.8} />
                <Text style={s.requestedTimeText}>
                  طلب العميل: {formatArabicDateTime(timeModalOrder.requested_time)}
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
              {timeLoading ? <ActivityIndicator color="#F0A500" /> : (
                <View style={s.btnInner}>
                  <CheckCircle2 size={14} color="#F0A500" />
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
      <Modal visible={showLocationMap} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#17100B" }}>
          <View style={s.mapHeader}>
            <TouchableOpacity onPress={() => setShowLocationMap(false)}>
              <Text style={s.mapHeaderBtn}>✕ إلغاء</Text>
            </TouchableOpacity>
            <Text style={s.mapHeaderTitle}>حدد موقع مطبخك</Text>
            <View style={{ width: 60 }} />
          </View>

          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation
          >
            {selectedLocation && (
              <Marker
                coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
                pinColor="#F0A500"
              />
            )}
          </MapView>

          <View style={s.mapFooter}>
            <Text style={s.mapHint}>اضغط على الخريطة لتحديد موقع مطبخك بدقة</Text>
            <TouchableOpacity style={s.useCurrentBtn} onPress={useMyCurrentLocation}>
              <MapPin size={14} color="#F0A500" strokeWidth={1.8} />
              <Text style={s.useCurrentBtnText}>استخدم موقعي الحالي</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.saveLocationBtn}
              onPress={saveLocation}
              disabled={!selectedLocation || savingLocation}
            >
              {savingLocation
                ? <ActivityIndicator color="#17100B" />
                : <Text style={s.saveLocationBtnText}>حفظ الموقع</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: "#0E0700" },
  header:            { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:             { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  refreshBtn:        { padding: 4 },
  logoutBtn:         { padding: 4 },
  backHomeBtn:       { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.25)", alignItems: "center", justifyContent: "center" },
  statusBar:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", margin: 16, backgroundColor: "#1C1000", borderRadius: 16, padding: 16, borderWidth: 1 },
  drinksBar:         { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: "#1C1000", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  drinksInfo:        { flexDirection: "row-reverse", alignItems: "center", gap: 6, flex: 1 },
  drinksText:        { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold" },

  locationBtn:        { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#1C1000", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  locationBtnText:     { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold" },
  certCard:            { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#1C1000", borderRadius: 14, padding: 13, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)" },
  certRow:             { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  certTitle:           { color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold" },
  certStatus:          { color: "#FFD27A", fontSize: 12, lineHeight: 20, marginTop: 6, fontFamily: "Almarai_400Regular", textAlign: "right" },
  certBtn:             { marginTop: 10, backgroundColor: "#F0A500", borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  certBtnText:         { color: "#1C0F00", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },

  mapHeader:          { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)" },
  mapHeaderBtn:        { color: "#F0A500", fontSize: 14, fontFamily: "Almarai_700Bold" },
  mapHeaderTitle:      { color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  mapFooter:          { padding: 16, backgroundColor: "#1C1000", borderTopWidth: 1, borderTopColor: "rgba(242,178,51,0.1)" },
  mapHint:            { color: "#A98961", fontSize: 12, fontFamily: "Almarai_400Regular", textAlign: "center", marginBottom: 12 },
  saveLocationBtn:     { backgroundColor: "#F2B233", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  saveLocationBtnText: { color: "#17100B", fontSize: 14, fontFamily: "Almarai_800ExtraBold" },
  useCurrentBtn:       { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10, paddingVertical: 10 },
  useCurrentBtnText:   { color: "#F0A500", fontSize: 13, fontFamily: "Almarai_700Bold" },
  statusTitle:       { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginBottom: 4 },
  statusVal:         { fontSize: 15, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold" },
  statusDesc:        { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  statusChange:      { fontSize: 13, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  menuBtn:           { marginHorizontal: 16, marginBottom: 12, backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.25)" },
  menuBtnText:       { color: "#F0A500", fontSize: 15, fontWeight: "900", fontFamily: "Almarai_800ExtraBold" },
  statsRow:          { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard:          { flex: 1, backgroundColor: "#1C1000", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  statNum:           { fontSize: 20, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  statLabel:         { fontSize: 10, color: "#8A6030", fontFamily: "Almarai_400Regular", marginTop: 2 },
  tabRow:            { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn:            { flex: 1, backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  tabBtnActive:      { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  tabText:           { fontSize: 12, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  tabTextActive:     { color: "#F0A500" },
  card:              { backgroundColor: "#1C1000", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(240,165,0,0.12)" },
  cardPreorder:      { borderColor: "rgba(255,152,0,0.35)", backgroundColor: "#1A1200" },
  row:               { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  badgesRow:         { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  preorderTag:       { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: "rgba(255,152,0,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  preorderTagText:   { color: "#FF9800", fontSize: 10, fontFamily: "Almarai_700Bold" },
  orderId:           { fontSize: 13, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  badgeText:         { fontSize: 11, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  customer:          { fontSize: 14, color: "#FDF0DC", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_700Bold" },
  phone:             { fontSize: 12, color: "#F0A500", textAlign: "right", marginBottom: 4, fontFamily: "Almarai_400Regular" },
  address:           { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 8, fontFamily: "Almarai_400Regular" },
  orderItem:         { fontSize: 12, color: "#C97D20", textAlign: "right", marginBottom: 2, fontFamily: "Almarai_400Regular" },
  totalRow:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  total:             { fontSize: 16, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  delivery:          { fontSize: 11, color: "#8A6030", fontFamily: "Almarai_400Regular" },
  notes:             { fontSize: 12, color: "#8A6030", textAlign: "right", marginBottom: 10, fontFamily: "Almarai_400Regular" },
  requestedTimeBox:  { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(255,152,0,0.1)", padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,152,0,0.2)" },
  requestedTimeText: { flex: 1, color: "#FF9800", textAlign: "right", fontSize: 12, fontFamily: "Almarai_700Bold" },
  confirmedTimeBox:  { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "rgba(139,195,74,0.1)", padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(139,195,74,0.2)" },
  confirmedTimeText: { flex: 1, color: "#8BC34A", textAlign: "right", fontSize: 12, fontFamily: "Almarai_700Bold" },
  btns:              { flexDirection: "row-reverse", gap: 8, marginTop: 8 },
  btnInner:          { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  btnAcc:            { flex: 1, backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.3)", marginTop: 8 },
  btnRej:            { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)", marginTop: 8 },
  btnProp:           { flex: 1, backgroundColor: "rgba(139,195,74,0.1)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(139,195,74,0.25)", marginTop: 8 },
  btnText:           { color: "#F0A500", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextRej:        { color: "#E53935", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  btnTextProp:       { color: "#8BC34A", fontSize: 13, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  emptyWrap:         { alignItems: "center", marginTop: 60, gap: 16 },
  empty:             { textAlign: "center", color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:          { backgroundColor: "#1C1000", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", maxHeight: "85%" },
  modalTitle:        { fontSize: 18, fontWeight: "900", color: "#FDF0DC", textAlign: "right", marginBottom: 16, fontFamily: "Almarai_800ExtraBold" },
  statusOption:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", backgroundColor: "#251400" },
  statusOptionLabel: { fontSize: 15, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold", marginBottom: 4 },
  statusOptionDesc:  { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  modalClose:        { backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  modalCloseText:    { color: "#E53935", fontSize: 14, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  pickerLabel:       { color: "#F0A500", textAlign: "right", fontSize: 12, fontFamily: "Almarai_800ExtraBold", marginBottom: 8, marginTop: 12 },
  datesRow:          { flexDirection: "row-reverse", gap: 8, paddingVertical: 4, paddingBottom: 8 },
  dateChip:          { width: 54, height: 64, borderRadius: 14, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(240,165,0,0.12)", alignItems: "center", justifyContent: "center", gap: 4 },
  dateChipActive:    { backgroundColor: "rgba(240,165,0,0.15)", borderColor: "rgba(240,165,0,0.5)" },
  dateChipDay:       { color: "#8A6030", fontSize: 10, fontFamily: "Almarai_400Regular" },
  dateChipNum:       { color: "#FDF0DC", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  dateChipTextActive:{ color: "#F0A500" },
  timeChip:          { paddingHorizontal: 14, height: 40, borderRadius: 12, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(240,165,0,0.12)", alignItems: "center", justifyContent: "center" },
  timeChipText:      { color: "#8A6030", fontSize: 12, fontFamily: "Almarai_700Bold" },
  minutesRow:        { flexDirection: "row-reverse", gap: 10, marginBottom: 8 },
  minuteChip:        { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#251400", borderWidth: 1, borderColor: "rgba(240,165,0,0.12)", alignItems: "center", justifyContent: "center" },
  minuteChipText:    { color: "#8A6030", fontSize: 14, fontFamily: "Almarai_700Bold" },
});