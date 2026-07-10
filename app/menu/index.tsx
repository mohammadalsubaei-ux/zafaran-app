import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
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
  Camera,
  Check,
  ChefHat,
  Clock3,
  ImageOff,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UploadCloud,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react-native";

const API      = "https://zafaran-backend-production.up.railway.app";
const SUPA_URL = "https://gnmsakxtdwgkvaajktco.supabase.co";
const SUPA_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImdubXNha3h0ZHdna3ZhYWprdGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwOTYsImV4cCI6MjA5MzMxMDA5Nn0.XOVMlX2IxzAzyN5vDnb9FEIsFS5fZg8HkUtJTZTHZzw";

type MenuStatus = "available" | "preorder" | "unavailable";

type MenuItem = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  category?: string | null;
  status?: MenuStatus | string | null;
  prep_minutes?: number | string | null;
  prep_hours?: number | string | null;
  description?: string | null;
  image_url?: string | null;
  is_available?: boolean | null;
};

type Chef = { id: string };

const CATEGORIES = [
  { id: "rice",      label: "أرز" },
  { id: "popular",   label: "شعبيات" },
  { id: "salad",     label: "سلطات" },
  { id: "sides",     label: "إيدامات" },
  { id: "spices",    label: "بهارات" },
  { id: "sauces",    label: "شطات" },
  { id: "sweets",    label: "حلويات" },
  { id: "pastries",  label: "معجنات" },
];

const ITEM_STATUS: Array<{
  id: MenuStatus;
  label: string;
  desc: string;
  color: string;
  Icon: any;
}> = [
  { id: "available",   label: "متاح",        desc: "يظهر للعميل ويضاف للسلة مباشرة",       color: "#4CAF50", Icon: BadgeCheck  },
  { id: "preorder",    label: "حجز مسبق",    desc: "يظهر للعميل مع وقت التحضير",           color: "#F2B233", Icon: CalendarDays },
  { id: "unavailable", label: "غير متاح",    desc: "يبقى محفوظًا لكنه غير متاح للطلب",     color: "#E53935", Icon: XCircle     },
];

const STATUS_COLORS: Record<string, string> = {
  available:   "#4CAF50",
  preorder:    "#F2B233",
  unavailable: "#E53935",
};

const STATUS_LABELS: Record<string, string> = {
  available:   "متاح",
  preorder:    "حجز مسبق",
  unavailable: "غير متاح",
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

function categoryLabel(id?: string | null) {
  return CATEGORIES.find((c) => c.id === id)?.label || "غير مصنف";
}

function formatPrepTime(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "";
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours   > 0) parts.push(`${hours} ساعة`);
  if (minutes > 0) parts.push(`${minutes} دقيقة`);
  return parts.join(" و ");
}

function normalizeStatus(status?: string | null): MenuStatus {
  if (status === "preorder")    return "preorder";
  if (status === "unavailable") return "unavailable";
  return "available";
}

export default function MenuScreen() {
  const router = useRouter();

  const [chefId,    setChefId]    = useState<string | null>(null);
  const [items,     setItems]     = useState<MenuItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [editItem,  setEditItem]  = useState<MenuItem | null>(null);
  const [imageUri,  setImageUri]  = useState<string | null>(null);

  const [name,        setName]        = useState("");
  const [price,       setPrice]       = useState("");
  const [category,    setCategory]    = useState("rice");
  const [status,      setStatus]      = useState<MenuStatus>("available");
  const [prepHours,   setPrepHours]   = useState("0");
  const [prepMinutes, setPrepMinutes] = useState("0");
  const [description, setDescription] = useState("");
  const [search,      setSearch]      = useState("");

  const [fontsLoaded] = useFonts({
    Almarai_400Regular,
    Almarai_700Bold,
    Almarai_800ExtraBold,
  });

  const availableCount   = useMemo(() => items.filter(i => normalizeStatus(i.status) === "available").length,   [items]);
  const preorderCount    = useMemo(() => items.filter(i => normalizeStatus(i.status) === "preorder").length,    [items]);
  const unavailableCount = useMemo(() => items.filter(i => normalizeStatus(i.status) === "unavailable").length, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter(item => {
        if (!q) return true;
        return (
          text(item.name, "").toLowerCase().includes(q) ||
          text(item.description, "").toLowerCase().includes(q) ||
          categoryLabel(item.category).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rank: Record<MenuStatus, number> = { available: 1, preorder: 2, unavailable: 3 };
        return rank[normalizeStatus(a.status)] - rank[normalizeStatus(b.status)];
      });
  }, [items, search]);

  const resetForm = useCallback(() => {
    setName(""); setPrice(""); setCategory("rice");
    setStatus("available"); setPrepHours("0"); setPrepMinutes("0");
    setDescription(""); setImageUri(null); setUploadMessage(""); setEditItem(null);
  }, []);

  const closeModal = useCallback(() => {
    if (saving || uploading) return;
    setShowAdd(false);
    resetForm();
  }, [resetForm, saving, uploading]);

  const loadItems = useCallback(async (silent = false) => {
    if (!chefId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/api/chefs/${chefId}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setItems([]);
        setError(json?.message || `خطأ ${res.status}`);
        return;
      }
      setItems(Array.isArray(json?.data?.menu) ? json.data.menu : []);
    } catch {
      setItems([]);
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [chefId]);

  const loadChef = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedUser) { setError("سجل الدخول من جديد."); setLoading(false); return; }
      let user: any = null;
      try { user = JSON.parse(storedUser); } catch {
        await AsyncStorage.multiRemove(["user", "user_id", "chef_id", "role"]);
        setError("جلسة غير صالحة."); setLoading(false); return;
      }
      const res  = await fetch(`${API}/api/chefs?user_id=${user.id}`);
      const json = await res.json().catch(() => null);
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        setChefId(String(json.data[0].id)); return;
      }
      setError("هذا الحساب غير مرتبط بملف شيف."); setLoading(false);
    } catch {
      setError("تعذر الاتصال بالخادم."); setLoading(false);
    }
  }, []);

  useEffect(() => { loadChef(); }, [loadChef]);
  useEffect(() => { if (chefId) loadItems(false); }, [chefId, loadItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (chefId) await loadItems(true);
    else { await loadChef(); setRefreshing(false); }
  }, [chefId, loadChef, loadItems]);

  const openAdd  = useCallback(() => { resetForm(); setShowAdd(true); }, [resetForm]);

  const openEdit = useCallback((item: MenuItem) => {
    setEditItem(item);
    setName(text(item.name, ""));
    setPrice(item.price === null || item.price === undefined ? "" : String(item.price));
    setCategory(text(item.category, "rice"));
    setStatus(normalizeStatus(item.status));
    const total = numberValue(item.prep_minutes);
    setPrepHours(String(Math.floor(total / 60)));
    setPrepMinutes(String(total % 60));
    setDescription(text(item.description, ""));
    setImageUri(text(item.image_url, "") || null);
    setUploadMessage("");
    setShowAdd(true);
  }, []);

  const pickImage = useCallback(async () => {
    if (saving || uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("إذن الصور مطلوب", "نحتاج إذن الوصول للصور."); return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.75,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }, [saving, uploading]);

  const uploadImage = useCallback(async (uri: string): Promise<string | null> => {
    setUploading(true); setUploadMessage("جاري رفع الصورة...");
    try {
      const rawExt  = uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
      const ext      = ["jpg","jpeg","png","webp"].includes(rawExt) ? rawExt : "jpg";
      const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
      const fileName = `menu_${Date.now()}_${Math.floor(Math.random() * 100000)}.${ext}`;
      const formData = new FormData();
      formData.append("file", { uri, name: fileName, type: mimeType } as any);
      const res = await fetch(`${SUPA_URL}/storage/v1/object/menu-images/${fileName}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY, "x-upsert": "true" },
        body: formData,
      });
      if (!res.ok) return null;
      setUploadMessage("تم رفع الصورة، جاري حفظ الوجبة...");
      return `${SUPA_URL}/storage/v1/object/public/menu-images/${fileName}`;
    } catch { return null; }
    finally { setUploading(false); }
  }, []);

  const validateForm = useCallback(() => {
    if (!chefId)                        { Alert.alert("خطأ", "لم يتم العثور على حساب الشيف."); return false; }
    if (!name.trim())                   { Alert.alert("تنبيه", "اكتب اسم الوجبة."); return false; }
    if (!price || Number(price) <= 0)   { Alert.alert("تنبيه", "اكتب سعر صحيح أكبر من صفر."); return false; }
    if (status === "preorder") {
      const total = Number(prepHours || 0) * 60 + Number(prepMinutes || 0);
      if (total <= 0) { Alert.alert("تنبيه", "حدد وقت تحضير للحجز المسبق."); return false; }
    }
    return true;
  }, [chefId, name, price, status, prepHours, prepMinutes]);

  const saveItem = useCallback(async () => {
    if (saving || uploading) return;
    if (!validateForm()) return;
    setSaving(true); setUploadMessage("");
    try {
      let imageUrl = text(editItem?.image_url, "");
      if (imageUri && imageUri !== editItem?.image_url) {
        const uploaded = await uploadImage(imageUri);
        if (!uploaded) { Alert.alert("فشل رفع الصورة", "حاول اختيار صورة أخرى."); return; }
        imageUrl = uploaded;
      }
      const totalMinutes = status === "preorder"
        ? Number(prepHours || 0) * 60 + Number(prepMinutes || 0)
        : 0;
      const body = {
        chef_id:      chefId,
        name:         name.trim(),
        price:        Number(price),
        category,
        status,
        prep_hours:   status === "preorder" ? Number(prepHours || 0) : 0,
        prep_minutes: totalMinutes,
        description:  description.trim(),
        image_url:    imageUrl || "",
        is_available: status !== "unavailable",
      };
      const url    = editItem ? `${API}/api/menu/${editItem.id}` : `${API}/api/menu`;
      const method = editItem ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json   = await res.json().catch(() => null);
      if (!res.ok) { Alert.alert("تعذر الحفظ", json?.message || `خطأ ${res.status}`); return; }
      if (json?.success) {
        Alert.alert("تم", editItem ? "تم تعديل الوجبة." : "تم إضافة الوجبة.");
        setShowAdd(false); resetForm(); await loadItems(true); return;
      }
      Alert.alert("تعذر الحفظ", json?.message || "لم تتم العملية.");
    } catch {
      Alert.alert("خطأ", "تعذر حفظ الوجبة.");
    } finally {
      setSaving(false); setUploadMessage("");
    }
  }, [saving, uploading, validateForm, editItem, imageUri, uploadImage, chefId, name, price, category, status, prepHours, prepMinutes, description, resetForm, loadItems]);

  const deleteItem = useCallback((id: string) => {
    Alert.alert("حذف الوجبة", "هل تريد حذف هذه الوجبة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => {
        try {
          const res = await fetch(`${API}/api/menu/${id}`, { method: "DELETE" });
          if (!res.ok) { Alert.alert("تعذر الحذف", `خطأ ${res.status}`); return; }
          await loadItems(true);
        } catch { Alert.alert("خطأ", "تعذر حذف الوجبة."); }
      }},
    ]);
  }, [loadItems]);

  const toggleItemStatus = useCallback(async (item: MenuItem) => {
    const current   = normalizeStatus(item.status);
    const newStatus: MenuStatus = current === "available" ? "preorder" : current === "preorder" ? "unavailable" : "available";
    try {
      const body: any = { status: newStatus, is_available: newStatus !== "unavailable" };
      if (newStatus !== "preorder") { body.prep_hours = 0; body.prep_minutes = 0; }
      const res = await fetch(`${API}/api/menu/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { Alert.alert("تعذر تغيير الحالة", `خطأ ${res.status}`); return; }
      await loadItems(true);
    } catch { Alert.alert("خطأ", "تعذر تغيير حالة الوجبة."); }
  }, [loadItems]);

  const renderItem = useCallback(({ item }: { item: MenuItem }) => {
    const st      = normalizeStatus(item.status);
    const color   = STATUS_COLORS[st] || "#F2B233";
    const total   = numberValue(item.prep_minutes);
    const hours   = Math.floor(total / 60);
    const minutes = total % 60;

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={s.itemImg} />
          ) : (
            <View style={s.itemImgPlaceholder}>
              <ImageOff size={26} color="#6D4E2D" strokeWidth={1.5} />
            </View>
          )}

          <View style={s.cardInfo}>
            <Text style={s.itemName} numberOfLines={2}>{text(item.name, "وجبة")}</Text>
            <Text style={s.itemCat}>{categoryLabel(item.category)}</Text>

            {st === "preorder" && total > 0 && (
              <View style={s.prepRow}>
                <Clock3 size={12} color="#F2B233" strokeWidth={1.5} />
                <View style={s.prepTimeRow}>
                  {hours > 0 && (
                    <Text style={s.prepTime}>{hours} ساعة</Text>
                  )}
                  {hours > 0 && minutes > 0 && (
                    <Text style={s.prepTimeSep}>و</Text>
                  )}
                  {minutes > 0 && (
                    <Text style={s.prepTime}>{minutes} دقيقة</Text>
                  )}
                </View>
              </View>
            )}

            <Text style={s.itemPrice}>{money(item.price)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            style={[s.statusBadge, { backgroundColor: `${color}1F`, borderColor: `${color}44` }]}
            onPress={() => toggleItemStatus(item)}
          >
            <Text style={[s.statusBadgeText, { color }]}>{STATUS_LABELS[st]}</Text>
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={s.cardActions}>
          <TouchableOpacity activeOpacity={0.86} style={s.editBtn} onPress={() => openEdit(item)}>
            <Pencil size={14} color="#F2B233" strokeWidth={1.8} />
            <Text style={s.editBtnText}>تعديل</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} style={s.deleteBtn} onPress={() => deleteItem(String(item.id))}>
            <Trash2 size={14} color="#E53935" strokeWidth={1.8} />
            <Text style={s.deleteBtnText}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [deleteItem, openEdit, toggleItemStatus]);

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#F2B233" size="large" />
          <Text style={s.loadingText}>جاري تحميل وجباتك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={() => router.back()}>
          <ArrowRight size={20} color="#F2B233" strokeWidth={1.9} />
        </TouchableOpacity>
        <View style={s.headerTitleRow}>
          <ChefHat size={17} color="#F2B233" strokeWidth={1.8} />
          <Text style={s.title}>وجباتي</Text>
        </View>
        <TouchableOpacity activeOpacity={0.88} style={s.addBtnWrap} onPress={openAdd}>
          <Plus size={19} color="#17100B" strokeWidth={2.3} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F2B233" />}
        ListHeaderComponent={
          <View>
            <View style={s.heroCard}>
              <View style={s.heroBadge}>
                <UtensilsCrossed size={18} color="#F2B233" strokeWidth={1.8} />
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroTitle}>قائمتي</Text>
                <Text style={s.heroSub}>أضف وجباتك، حدّث الأسعار، وارفع صور جذابة للعملاء.</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{items.length}</Text>
                <Text style={s.statLabel}>كل الوجبات</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: "#4CAF50" }]}>{availableCount}</Text>
                <Text style={s.statLabel}>متاح</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: "#F2B233" }]}>{preorderCount}</Text>
                <Text style={s.statLabel}>حجز مسبق</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: "#E53935" }]}>{unavailableCount}</Text>
                <Text style={s.statLabel}>غير متاح</Text>
              </View>
            </View>

            <View style={s.searchBox}>
              <Search size={18} color="#F2B233" strokeWidth={1.8} />
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="ابحث في وجباتك..." placeholderTextColor="#7C6145"
                style={s.searchInput} textAlign="right"
              />
              {search.trim() ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={17} color="#8A6030" strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </View>

            {error ? (
              <TouchableOpacity activeOpacity={0.86} style={s.errorBox} onPress={onRefresh}>
                <RefreshCw size={17} color="#F2B233" strokeWidth={1.8} />
                <View style={s.errorTextWrap}>
                  <Text style={s.errorTitle}>حدثت مشكلة</Text>
                  <Text style={s.errorText}>{error}</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <UtensilsCrossed size={54} color="#5A3A18" strokeWidth={1.5} />
            </View>
            <Text style={s.emptyTitle}>
              {search.trim() ? "لا توجد نتائج مطابقة" : "ما أضفت وجبات بعد"}
            </Text>
            <Text style={s.emptySub}>
              {search.trim()
                ? "غيّر كلمة البحث أو امسح الفلتر."
                : "ابدأ بإضافة أول وجبة تظهر للعملاء في صفحة الشيف."}
            </Text>
            <TouchableOpacity activeOpacity={0.9} style={s.primaryBtn}
              onPress={search.trim() ? () => setSearch("") : openAdd}>
              <Text style={s.primaryBtnText}>{search.trim() ? "مسح البحث" : "إضافة أول وجبة"}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showAdd} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <TouchableOpacity activeOpacity={0.85} style={s.headerBtn} onPress={closeModal}>
              <X size={20} color="#F2B233" strokeWidth={1.9} />
            </TouchableOpacity>
            <View style={s.headerTitleRow}>
              <UtensilsCrossed size={17} color="#F2B233" strokeWidth={1.8} />
              <Text style={s.title}>{editItem ? "تعديل وجبة" : "إضافة وجبة"}</Text>
            </View>
            <View style={s.headerBtnGhost} />
          </View>

          <ScrollView contentContainerStyle={s.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={s.label}>صورة الوجبة</Text>
            <TouchableOpacity activeOpacity={0.9} style={s.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.imagePreview} />
              ) : (
                <View style={s.imagePlaceholder}>
                  <Camera size={38} color="#8A6030" strokeWidth={1.5} />
                  <Text style={s.imagePlaceholderText}>اضغط لإضافة صورة</Text>
                  <Text style={s.imagePlaceholderSub}>يفضل صورة واضحة للوجبة</Text>
                </View>
              )}
            </TouchableOpacity>

            {imageUri ? (
              <TouchableOpacity activeOpacity={0.86} style={s.removeImg}
                onPress={() => setImageUri(null)} disabled={saving || uploading}>
                <Trash2 size={14} color="#E53935" strokeWidth={1.8} />
                <Text style={s.removeImgText}>حذف الصورة</Text>
              </TouchableOpacity>
            ) : null}

            {saving || uploading || uploadMessage ? (
              <View style={s.uploadBox}>
                {saving || uploading
                  ? <ActivityIndicator color="#F2B233" />
                  : <UploadCloud size={17} color="#F2B233" />}
                <Text style={s.uploadText}>{uploadMessage || "جاري الحفظ..."}</Text>
              </View>
            ) : null}

            <Text style={s.label}>اسم الوجبة *</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="مثال: كبسة دجاج"
                placeholderTextColor="#5A3A18" value={name} onChangeText={setName} textAlign="right" />
            </View>

            <Text style={s.label}>السعر *</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="35" placeholderTextColor="#5A3A18"
                keyboardType="numeric" value={price} onChangeText={setPrice} textAlign="right" />
            </View>

            <Text style={s.label}>الوصف</Text>
            <View style={[s.inputWrap, s.textAreaWrap]}>
              <TextInput style={[s.input, s.textArea]} placeholder="اكتب وصفًا مختصرًا للوجبة..."
                placeholderTextColor="#5A3A18" value={description} onChangeText={setDescription}
                textAlign="right" multiline />
            </View>

            <Text style={s.label}>التصنيف</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.id} activeOpacity={0.86}
                  style={[s.catBtn, category === c.id && s.catBtnActive]}
                  onPress={() => setCategory(c.id)}>
                  <Text style={[s.catText, category === c.id && s.catTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>حالة الوجبة</Text>
            {ITEM_STATUS.map(st => {
              const Icon   = st.Icon;
              const active = status === st.id;
              return (
                <TouchableOpacity key={st.id} activeOpacity={0.9}
                  style={[s.statusOption, active && { borderColor: st.color, backgroundColor: `${st.color}12` }]}
                  onPress={() => setStatus(st.id)}>
                  <View style={s.statusLeft}>
                    <View style={[s.statusIconBox, { backgroundColor: `${st.color}12` }]}>
                      <Icon size={19} color={st.color} strokeWidth={1.8} />
                    </View>
                    <View>
                      <Text style={[s.statusLabel, { color: st.color }]}>{st.label}</Text>
                      <Text style={s.statusDesc}>{st.desc}</Text>
                    </View>
                  </View>
                  {active ? <Check size={19} color={st.color} strokeWidth={2.2} /> : null}
                </TouchableOpacity>
              );
            })}

            {status === "preorder" && (
              <>
                <Text style={s.label}>وقت التحضير</Text>
                <View style={s.timePickerWrap}>
                  <View style={s.pickerBox}>
                    <Text style={s.pickerTitle}>دقيقة</Text>
                    <Picker selectedValue={prepMinutes} onValueChange={setPrepMinutes}
                      itemStyle={s.pickerItem} style={s.picker}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <Picker.Item key={i} label={`${i}`} value={String(i)} />
                      ))}
                    </Picker>
                  </View>
                  <View style={s.pickerBox}>
                    <Text style={s.pickerTitle}>ساعة</Text>
                    <Picker selectedValue={prepHours} onValueChange={setPrepHours}
                      itemStyle={s.pickerItem} style={s.picker}>
                      {Array.from({ length: 49 }, (_, i) => (
                        <Picker.Item key={i} label={`${i}`} value={String(i)} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity activeOpacity={0.92}
              style={[s.saveBtn, (saving || uploading) && s.saveBtnDisabled]}
              onPress={saveItem} disabled={saving || uploading}>
              {saving || uploading ? (
                <View style={s.saveLoadingWrap}>
                  <ActivityIndicator color="#17100B" />
                  <Text style={s.saveBtnText}>{uploading ? "جاري رفع الصورة..." : "جاري الحفظ..."}</Text>
                </View>
              ) : (
                <View style={s.saveLoadingWrap}>
                  <Save size={18} color="#17100B" strokeWidth={2.1} />
                  <Text style={s.saveBtnText}>{editItem ? "حفظ التعديلات" : "إضافة الوجبة"}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: "#17100B" },
  modalSafe:     { flex: 1, backgroundColor: "#17100B" },
  loadingWrap:   { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText:   { color: "#FDF0DC", fontSize: 14, fontFamily: "Almarai_700Bold" },
  header:        { minHeight: 66, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  modalHeader:   { minHeight: 66, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  headerBtn:     { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(242,178,51,0.08)", borderWidth: 1, borderColor: "rgba(242,178,51,0.14)", alignItems: "center", justifyContent: "center" },
  headerBtnGhost:{ width: 42, height: 42 },
  headerTitleRow:{ flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  title:         { color: "#FDF0DC", fontSize: 18, fontFamily: "Almarai_800ExtraBold" },
  addBtnWrap:    { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F2B233", alignItems: "center", justifyContent: "center" },
  listContent:   { padding: 16, paddingBottom: 40 },
  heroCard:      { borderRadius: 28, backgroundColor: "#21160D", borderWidth: 1, borderColor: "rgba(242,178,51,0.13)", padding: 16, marginBottom: 12, flexDirection: "row-reverse", alignItems: "center", gap: 13 },
  heroBadge:     { width: 54, height: 54, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(242,178,51,0.08)", borderWidth: 1, borderColor: "rgba(242,178,51,0.14)" },
  heroInfo:      { flex: 1 },
  heroTitle:     { color: "#FDF0DC", textAlign: "right", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  heroSub:       { color: "#A98961", textAlign: "right", marginTop: 5, fontSize: 12, lineHeight: 20, fontFamily: "Almarai_400Regular" },
  statsRow:      { flexDirection: "row-reverse", gap: 8, marginBottom: 12 },
  statCard:      { flex: 1, minHeight: 72, borderRadius: 20, backgroundColor: "#21160D", borderWidth: 1, borderColor: "rgba(242,178,51,0.09)", alignItems: "center", justifyContent: "center", gap: 3 },
  statValue:     { color: "#FDF0DC", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  statLabel:     { color: "#6D4E2D", fontSize: 10, fontFamily: "Almarai_400Regular" },
  searchBox:     { minHeight: 50, borderRadius: 18, backgroundColor: "#21160D", borderWidth: 1, borderColor: "rgba(242,178,51,0.09)", paddingHorizontal: 13, marginBottom: 12, flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  searchInput:   { flex: 1, height: 50, color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_400Regular" },
  errorBox:      { marginBottom: 12, borderRadius: 18, padding: 13, backgroundColor: "#321717", borderWidth: 1, borderColor: "rgba(229,57,53,0.22)", flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  errorTextWrap: { flex: 1 },
  errorTitle:    { color: "#FFB0B0", textAlign: "right", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  errorText:     { color: "#FFCECE", textAlign: "right", marginTop: 3, fontSize: 11, lineHeight: 18, fontFamily: "Almarai_400Regular" },
  card:          { backgroundColor: "#21160D", borderRadius: 23, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "rgba(242,178,51,0.09)" },
  cardTop:       { flexDirection: "row-reverse", gap: 12, alignItems: "flex-start" },
  itemImg:       { width: 76, height: 76, borderRadius: 18, backgroundColor: "#2A1E00" },
  itemImgPlaceholder: { width: 76, height: 76, borderRadius: 18, backgroundColor: "#2A1E00", alignItems: "center", justifyContent: "center" },
  cardInfo:      { flex: 1 },
  itemName:      { color: "#FDF0DC", textAlign: "right", fontSize: 15, lineHeight: 23, fontFamily: "Almarai_800ExtraBold" },
  itemCat:       { color: "#8A6030", textAlign: "right", marginTop: 3, fontSize: 11, fontFamily: "Almarai_400Regular" },
  prepRow:       { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginTop: 5 },
  prepTimeRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  prepTime:      { color: "#F2B233", fontSize: 11, fontFamily: "Almarai_700Bold" },
  prepTimeSep:   { color: "#8A6030", fontSize: 10, fontFamily: "Almarai_400Regular" },
  itemPrice:     { color: "#F2B233", textAlign: "right", marginTop: 6, fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
  statusBadge:   { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontFamily: "Almarai_800ExtraBold" },
  itemDesc:      { color: "#8A6030", textAlign: "right", marginTop: 10, fontSize: 12, lineHeight: 20, fontFamily: "Almarai_400Regular" },
  cardActions:   { flexDirection: "row-reverse", gap: 8, marginTop: 12 },
  editBtn:       { flex: 1, minHeight: 42, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(242,178,51,0.08)", borderRadius: 15, borderWidth: 1, borderColor: "rgba(242,178,51,0.16)" },
  editBtnText:   { color: "#F2B233", fontSize: 12, fontFamily: "Almarai_800ExtraBold" },
  deleteBtn:     { flex: 1, minHeight: 42, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(229,57,53,0.09)", borderRadius: 15, borderWidth: 1, borderColor: "rgba(229,57,53,0.17)" },
  deleteBtnText: { color: "#E53935", fontSize: 12, fontFamily: "Almarai_800ExtraBold" },
  emptyWrap:     { alignItems: "center", marginTop: 56, paddingHorizontal: 26 },
  emptyIcon:     { width: 108, height: 108, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: "#21160D", borderWidth: 1, borderColor: "rgba(242,178,51,0.09)", marginBottom: 18 },
  emptyTitle:    { color: "#FDF0DC", textAlign: "center", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  emptySub:      { color: "#8A6030", textAlign: "center", marginTop: 8, marginBottom: 18, fontSize: 12, lineHeight: 21, fontFamily: "Almarai_400Regular" },
  primaryBtn:    { minWidth: 170, minHeight: 48, borderRadius: 16, backgroundColor: "#F2B233", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  primaryBtnText:{ color: "#17100B", fontSize: 13, fontFamily: "Almarai_800ExtraBold" },
  modalContent:  { padding: 20, paddingBottom: 46 },
  label:         { color: "#F2B233", textAlign: "right", fontSize: 12, marginBottom: 7, fontFamily: "Almarai_800ExtraBold" },
  inputWrap:     { backgroundColor: "#21160D", borderRadius: 17, borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", paddingHorizontal: 14, marginBottom: 16 },
  input:         { height: 50, color: "#FDF0DC", fontSize: 14, fontFamily: "Almarai_400Regular" },
  textAreaWrap:  { minHeight: 92, paddingTop: 8 },
  textArea:      { minHeight: 82, textAlignVertical: "top" },
  imagePicker:   { backgroundColor: "#21160D", borderRadius: 22, borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", marginBottom: 10, overflow: "hidden" },
  imagePreview:  { width: "100%", height: 210, resizeMode: "cover" },
  imagePlaceholder: { height: 170, alignItems: "center", justifyContent: "center", gap: 8 },
  imagePlaceholderText: { color: "#A98961", fontSize: 13, fontFamily: "Almarai_700Bold" },
  imagePlaceholderSub:  { color: "#5A3A18", fontSize: 11, fontFamily: "Almarai_400Regular" },
  removeImg:     { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 },
  removeImgText: { color: "#E53935", fontSize: 12, fontFamily: "Almarai_700Bold" },
  uploadBox:     { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(242,178,51,0.08)", borderWidth: 1, borderColor: "rgba(242,178,51,0.16)", borderRadius: 14, padding: 11, marginBottom: 16 },
  uploadText:    { color: "#F2B233", fontSize: 12, textAlign: "center", fontFamily: "Almarai_800ExtraBold" },
  catRow:        { flexDirection: "row-reverse", gap: 8, paddingVertical: 4, paddingBottom: 16 },
  catBtn:        { backgroundColor: "#21160D", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: "rgba(242,178,51,0.12)" },
  catBtnActive:  { backgroundColor: "rgba(242,178,51,0.12)", borderColor: "rgba(242,178,51,0.45)" },
  catText:       { color: "#8A6030", fontSize: 12, fontFamily: "Almarai_800ExtraBold" },
  catTextActive: { color: "#F2B233" },
  statusOption:  { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: "rgba(242,178,51,0.1)", backgroundColor: "#21160D" },
  statusLeft:    { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  statusIconBox: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  statusLabel:   { fontSize: 14, textAlign: "right", fontFamily: "Almarai_800ExtraBold", marginBottom: 3 },
  statusDesc:    { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  timePickerWrap:{ flexDirection: "row", gap: 12, marginBottom: 16 },
  pickerBox:     { flex: 1, backgroundColor: "#21160D", borderRadius: 17, borderWidth: 1, borderColor: "rgba(242,178,51,0.12)", overflow: "hidden" },
  pickerTitle:   { color: "#F2B233", fontSize: 12, textAlign: "center", marginTop: 10, fontFamily: "Almarai_800ExtraBold" },
  picker:        { height: 150, color: "#FDF0DC" },
  pickerItem:    { color: "#FDF0DC", fontSize: 18, fontFamily: "Almarai_700Bold" },
  saveBtn:       { backgroundColor: "#F2B233", borderRadius: 18, minHeight: 56, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnDisabled: { opacity: 0.72 },
  saveLoadingWrap: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnText:   { color: "#17100B", fontSize: 15, fontFamily: "Almarai_800ExtraBold" },
});