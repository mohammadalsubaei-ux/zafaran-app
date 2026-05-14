import { useEffect, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Modal,
  TextInput, ScrollView, Image
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API      = "https://zafaran-backend-production.up.railway.app";
const SUPA_URL = "https://gnmsakxtdwgkvaajktco.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXNha3h0ZHdna3ZhYWprdGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwOTYsImV4cCI6MjA5MzMxMDA5Nn0.XOVMlX2IxzAzyN5vDnb9FEIsFS5fZg8HkUtJTZTHZzw";

const CATEGORIES = [
  { id: "rice",    label: "أرز" },
  { id: "popular", label: "شعبيات" },
  { id: "salad",   label: "سلطات" },
  { id: "sides",   label: "إيدامات" },
  { id: "spices",  label: "بهارات" },
  { id: "sauces",  label: "شطات" },
  { id: "sweets",  label: "حلويات" },
  { id: "pastries",label: "معجنات" },
];

const ITEM_STATUS = [
  { id: "available",   label: "🟢 متاح",        desc: "يضاف للسلة فوراً",   color: "#4CAF50" },
  { id: "preorder",    label: "🟡 حجز مسبق",     desc: "العميل يحدد وقت",   color: "#F0A500" },
  { id: "unavailable", label: "🔴 غير متاح",      desc: "يختفي من القائمة",  color: "#E53935" },
];

const STATUS_COLORS: any = { available: "#4CAF50", preorder: "#F0A500", unavailable: "#E53935" };
const STATUS_LABELS: any = { available: "🟢 متاح", preorder: "🟡 حجز مسبق", unavailable: "🔴 غير متاح" };

export default function MenuScreen() {
  const [chefId, setChefId]         = useState<string | null>(null);
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [editItem, setEditItem]     = useState<any>(null);
  const [imageUri, setImageUri]     = useState<string | null>(null);

  const [name, setName]             = useState("");
  const [price, setPrice]           = useState("");
  const [category, setCategory]     = useState("rice");
  const [status, setStatus]         = useState("available");
  const [prepHours, setPrepHours]   = useState("0");
  const [prepMinutes, setPrepMinutes] = useState("0");
  const [description, setDescription] = useState("");

  const router = useRouter();
  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    AsyncStorage.getItem("user").then(async u => {
      if (!u) { setLoading(false); return; }
      try {
        const user = JSON.parse(u);
        const res  = await fetch(`${API}/api/chefs?user_id=${user.id}`);
        const json = await res.json();
        if (json.success && json.data.length > 0) setChefId(json.data[0].id);
        else setLoading(false);
      } catch { setLoading(false); }
    });
  }, []);

  useEffect(() => { if (chefId) loadItems(); }, [chefId]);

  const loadItems = async () => {
    if (!chefId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/chefs/${chefId}`);
      const json = await res.json();
      if (json.success) setItems(json.data.menu || []);
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setName(""); setPrice(""); setCategory("rice");
    setStatus("available"); setPrepHours("0"); setPrepMinutes("0");
    setDescription(""); setImageUri(null); setEditItem(null);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setName(item.name || "");
    setPrice(String(item.price || ""));
    setCategory(item.category || "rice");
    setStatus(item.status || "available");
    const totalMinutes = Number(item.prep_minutes || 0);
    setPrepHours(String(Math.floor(totalMinutes / 60)));
    setPrepMinutes(String(totalMinutes % 60));
    setDescription(item.description || "");
    setImageUri(item.image_url || null);
    setShowAdd(true);
  };

  // ━━━ اختيار صورة ━━━
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("تنبيه", "نحتاج إذن الوصول للصور"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // ━━━ رفع الصورة لـ Supabase ━━━
  const uploadImage = async (uri: string): Promise<string | null> => {
  setUploading(true);
  try {
    const ext      = uri.split(".").pop() || "jpg";
    const fileName = `menu_${Date.now()}.${ext}`;
    const formData = new FormData();
    formData.append("file", { uri, name: fileName, type: `image/${ext}` } as any);
    const res = await fetch(`${SUPA_URL}/storage/v1/object/menu-images/${fileName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPA_KEY}`,
      },
      body: formData,
    });
    if (res.ok) {
      return `${SUPA_URL}/storage/v1/object/public/menu-images/${fileName}`;
    }
    const err = await res.text();
    console.log("Upload error:", err);
    return null;
  } catch { return null; }
  finally { setUploading(false); }
};

  // ━━━ حفظ الوجبة ━━━
  const saveItem = async () => {
    if (!chefId) { Alert.alert("خطأ", "لم يتم العثور على حساب الشيف"); return; }
    if (!name.trim()) { Alert.alert("تنبيه", "أدخل اسم الوجبة"); return; }
    if (!price || isNaN(Number(price))) { Alert.alert("تنبيه", "أدخل سعر صحيح"); return; }

    setSaving(true);
    try {
      // رفع الصورة لو تغيرت
      let imageUrl = editItem?.image_url || null;
      if (imageUri && imageUri !== editItem?.image_url && !imageUrl) {
  Alert.alert("خطأ", "فشل رفع الصورة");
  return;
}

      const totalMinutes = (parseInt(prepHours || "0") * 60) + parseInt(prepMinutes || "0");

      const body = {
        chef_id:      chefId,
        name:         name.trim(),
        price:        parseFloat(price),
        category,
        status,
        prep_hours:   status === "preorder" ? parseInt(prepHours || "0") : 0,
        prep_minutes: status === "preorder" ? totalMinutes : 0,
        description:  description.trim(),
        image_url:    imageUrl,
        is_available: status !== "unavailable",
      };

      const url    = editItem ? `${API}/api/menu/${editItem.id}` : `${API}/api/menu`;
      const method = editItem ? "PATCH" : "POST";

      const res  = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        Alert.alert("✅ تم", editItem ? "تم تعديل الوجبة" : "تم إضافة الوجبة");
        setShowAdd(false); resetForm(); loadItems();
      } else { Alert.alert("خطأ", json.message || "لم تتم العملية"); }
    } catch { Alert.alert("خطأ", "تعذر حفظ الوجبة"); }
    finally { setSaving(false); }
  };

  const deleteItem = (id: string) => {
    Alert.alert("حذف الوجبة", "تبي تحذف هذه الوجبة؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم", style: "destructive", onPress: async () => {
        await fetch(`${API}/api/menu/${id}`, { method: "DELETE" });
        loadItems();
      }},
    ]);
  };

  const toggleItemStatus = async (item: any) => {
    const current  = item.status || "available";
    const newStatus = current === "available" ? "preorder" : current === "preorder" ? "unavailable" : "available";
    await fetch(`${API}/api/menu/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, is_available: newStatus !== "unavailable" }),
    });
    loadItems();
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>وجباتي 🍲</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }}>
          <Text style={s.addBtn}>+ إضافة</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.cardTop}>
                  {item.image_url
                    ? <Image source={{ uri: item.image_url }} style={s.itemImg}/>
                    : <View style={s.itemImgPlaceholder}><Text style={{ fontSize: 28 }}>🍽️</Text></View>
                  }
                  <View style={s.cardInfo}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemCat}>{CATEGORIES.find(c => c.id === item.category)?.label || item.category}</Text>
                    {item.status === "preorder" && item.prep_minutes > 0 && (
                      <Text style={s.prepTime}>
                        ⏱️ {Math.floor(item.prep_minutes / 60)} ساعة {item.prep_minutes % 60 > 0 ? `و ${item.prep_minutes % 60} دقيقة` : ""}
                      </Text>
                    )}
                    <Text style={s.itemPrice}>{item.price} ريال</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status || "available"] + "22" }]}
                    onPress={() => toggleItemStatus(item)}
                  >
                    <Text style={[s.statusBadgeText, { color: STATUS_COLORS[item.status || "available"] }]}>
                      {STATUS_LABELS[item.status || "available"]}
                    </Text>
                  </TouchableOpacity>
                </View>
                {item.description ? <Text style={s.itemDesc}>{item.description}</Text> : null}
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                    <Text style={s.editBtnText}>✏️ تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => deleteItem(item.id)}>
                    <Text style={s.deleteBtnText}>🗑️ حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>🍽️</Text>
                <Text style={s.empty}>ما أضفت وجبات بعد</Text>
                <TouchableOpacity style={s.emptyAddBtn} onPress={() => { resetForm(); setShowAdd(true); }}>
                  <Text style={s.emptyAddText}>+ أضف أول وجبة</Text>
                </TouchableOpacity>
              </View>
            }
          />
      }

      {/* Modal إضافة/تعديل */}
      <Modal visible={showAdd} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0E0700" }}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <Text style={s.back}>✕ إلغاء</Text>
            </TouchableOpacity>
            <Text style={s.title}>{editItem ? "تعديل وجبة" : "إضافة وجبة"}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>

            {/* صورة الوجبة */}
            <Text style={s.label}>صورة الوجبة</Text>
            <TouchableOpacity style={s.imagePicker} onPress={pickImage}>
              {imageUri
                ? <Image source={{ uri: imageUri }} style={s.imagePreview}/>
                : <View style={s.imagePlaceholder}>
                    <Text style={s.imagePlaceholderIcon}>📷</Text>
                    <Text style={s.imagePlaceholderText}>اضغط لإضافة صورة</Text>
                  </View>
              }
            </TouchableOpacity>
            {imageUri && (
              <TouchableOpacity style={s.removeImg} onPress={() => setImageUri(null)}>
                <Text style={s.removeImgText}>🗑️ حذف الصورة</Text>
              </TouchableOpacity>
            )}

            {/* الاسم */}
            <Text style={s.label}>اسم الوجبة *</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="مثال: دجاج مع رز" placeholderTextColor="#5A3A18" value={name} onChangeText={setName} textAlign="right"/>
            </View>

            {/* السعر */}
            <Text style={s.label}>السعر (ريال) *</Text>
            <View style={s.inputWrap}>
              <TextInput style={s.input} placeholder="35" placeholderTextColor="#5A3A18" keyboardType="numeric" value={price} onChangeText={setPrice} textAlign="right"/>
            </View>

            {/* الوصف */}
            <Text style={s.label}>الوصف (اختياري)</Text>
            <View style={[s.inputWrap, { height: 80 }]}>
              <TextInput style={[s.input, { height: 70 }]} placeholder="وصف مختصر..." placeholderTextColor="#5A3A18" value={description} onChangeText={setDescription} textAlign="right" multiline/>
            </View>

            {/* الكاتيجوري */}
            <Text style={s.label}>التصنيف</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row-reverse", gap: 8, paddingVertical: 4 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c.id} style={[s.catBtn, category === c.id && s.catBtnActive]} onPress={() => setCategory(c.id)}>
                    <Text style={[s.catText, category === c.id && s.catTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* الحالة */}
            <Text style={s.label}>حالة المنتج</Text>
            {ITEM_STATUS.map(st => (
              <TouchableOpacity
                key={st.id}
                style={[s.statusOption, status === st.id && { borderColor: st.color, backgroundColor: st.color + "11" }]}
                onPress={() => setStatus(st.id)}
              >
                <View>
                  <Text style={[s.statusLabel, { color: st.color }]}>{st.label}</Text>
                  <Text style={s.statusDesc}>{st.desc}</Text>
                </View>
                {status === st.id && <Text style={{ color: st.color, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}

            {/* وقت التحضير */}
            {status === "preorder" && (
              <>
                <Text style={s.label}>وقت التحضير</Text>
                <View style={s.timePickerWrap}>
                  <View style={s.pickerBox}>
                    <Text style={s.pickerTitle}>دقيقة</Text>
                    <Picker selectedValue={prepMinutes} onValueChange={setPrepMinutes} itemStyle={s.pickerItem} style={s.picker}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <Picker.Item key={i} label={`${i}`} value={String(i)} />
                      ))}
                    </Picker>
                  </View>
                  <View style={s.pickerBox}>
                    <Text style={s.pickerTitle}>ساعة</Text>
                    <Picker selectedValue={prepHours} onValueChange={setPrepHours} itemStyle={s.pickerItem} style={s.picker}>
                      {Array.from({ length: 49 }, (_, i) => (
                        <Picker.Item key={i} label={`${i}`} value={String(i)} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity style={s.saveBtn} onPress={saveItem} disabled={saving || uploading}>
              {saving || uploading
                ? <ActivityIndicator color="#0E0700" />
                : <Text style={s.saveBtnText}>{editItem ? "حفظ التعديلات ✅" : "إضافة الوجبة ✅"}</Text>
              }
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                 { flex: 1, backgroundColor: "#0E0700" },
  header:               { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  modalHeader:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#0E0700", borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:                { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:                 { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  addBtn:               { color: "#F0A500", fontSize: 15, fontWeight: "900", fontFamily: "Almarai_800ExtraBold" },
  card:                 { backgroundColor: "#1C1000", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  cardTop:              { flexDirection: "row-reverse", gap: 12, marginBottom: 8, alignItems: "flex-start" },
  itemImg:              { width: 70, height: 70, borderRadius: 12 },
  itemImgPlaceholder:   { width: 70, height: 70, borderRadius: 12, backgroundColor: "#251400", alignItems: "center", justifyContent: "center" },
  cardInfo:             { flex: 1 },
  itemName:             { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold" },
  itemCat:              { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  prepTime:             { fontSize: 11, color: "#F0A500", textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  itemPrice:            { fontSize: 15, fontWeight: "900", color: "#F0A500", textAlign: "right", fontFamily: "Almarai_800ExtraBold", marginTop: 4 },
  statusBadge:          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText:      { fontSize: 10, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  itemDesc:             { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginBottom: 8 },
  cardActions:          { flexDirection: "row-reverse", gap: 8 },
  editBtn:              { flex: 1, backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)" },
  editBtnText:          { color: "#F0A500", fontSize: 12, fontFamily: "Almarai_700Bold" },
  deleteBtn:            { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  deleteBtnText:        { color: "#E53935", fontSize: 12, fontFamily: "Almarai_700Bold" },
  emptyWrap:            { alignItems: "center", marginTop: 60 },
  emptyEmoji:           { fontSize: 48, marginBottom: 12 },
  empty:                { color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular", marginBottom: 16 },
  emptyAddBtn:          { backgroundColor: "#F0A500", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyAddText:         { color: "#0E0700", fontSize: 14, fontWeight: "900", fontFamily: "Almarai_800ExtraBold" },
  label:                { fontSize: 11, fontWeight: "700", color: "#C97D20", letterSpacing: 2, textAlign: "right", marginBottom: 6, fontFamily: "Almarai_700Bold" },
  inputWrap:            { backgroundColor: "#1C1000", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14, marginBottom: 16 },
  input:                { height: 50, color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_400Regular" },
  imagePicker:          { backgroundColor: "#1C1000", borderRadius: 16, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", marginBottom: 8, overflow: "hidden" },
  imagePreview:         { width: "100%", height: 200, resizeMode: "cover" },
  imagePlaceholder:     { height: 150, alignItems: "center", justifyContent: "center", gap: 8 },
  imagePlaceholderIcon: { fontSize: 40 },
  imagePlaceholderText: { color: "#8A6030", fontSize: 13, fontFamily: "Almarai_400Regular" },
  removeImg:            { alignItems: "center", marginBottom: 16 },
  removeImgText:        { color: "#E53935", fontSize: 12, fontFamily: "Almarai_700Bold" },
  catBtn:               { backgroundColor: "#1C1000", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  catBtnActive:         { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  catText:              { color: "#8A6030", fontSize: 12, fontFamily: "Almarai_700Bold" },
  catTextActive:        { color: "#F0A500" },
  statusOption:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", backgroundColor: "#1C1000" },
  statusLabel:          { fontSize: 14, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold", marginBottom: 2 },
  statusDesc:           { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  timePickerWrap:       { flexDirection: "row", gap: 12, marginBottom: 16 },
  pickerBox:            { flex: 1, backgroundColor: "#1C1000", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", overflow: "hidden" },
  pickerTitle:          { color: "#F0A500", fontSize: 12, textAlign: "center", marginTop: 10, fontFamily: "Almarai_700Bold" },
  picker:               { height: 150, color: "#FDF0DC" },
  pickerItem:           { color: "#FDF0DC", fontSize: 18, fontFamily: "Almarai_700Bold" },
  saveBtn:              { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 40 },
  saveBtnText:          { fontSize: 16, fontWeight: "900", color: "#0E0700", fontFamily: "Almarai_800ExtraBold" },
});
