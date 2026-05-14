import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert, Modal,
  TextInput, ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

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
  { id: "available",  label: "🟢 متاح",         desc: "يضاف للسلة فوراً" },
  { id: "preorder",   label: "🟡 حجز مسبق",      desc: "العميل يحدد وقت" },
  { id: "unavailable",label: "🔴 غير متاح",       desc: "يختفي من القائمة" },
];

export default function MenuScreen() {
  const [chefId, setChefId]     = useState<string | null>(null);
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // فورم الإضافة
  const [name, setName]         = useState("");
  const [price, setPrice]       = useState("");
  const [category, setCategory] = useState("rice");
  const [status, setStatus]     = useState("available");
  const [prepHours, setPrepHours] = useState("0");
  const [description, setDescription] = useState("");

  const router = useRouter();
  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    AsyncStorage.getItem("user").then(async u => {
      if (!u) return;
      const user = JSON.parse(u);
      const res  = await fetch(`${API}/api/chefs?user_id=${user.id}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setChefId(json.data[0].id);
      }
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
    setStatus("available"); setPrepHours("0"); setDescription("");
    setEditItem(null);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category || "rice");
    setStatus(item.status || "available");
    setPrepHours(String(item.prep_hours || 0));
    setDescription(item.description || "");
    setShowAdd(true);
  };

  const saveItem = async () => {
    if (!name.trim()) { Alert.alert("تنبيه", "أدخل اسم الوجبة"); return; }
    if (!price || isNaN(Number(price))) { Alert.alert("تنبيه", "أدخل سعر صحيح"); return; }

    setSaving(true);
    try {
      const body = {
        chef_id:     chefId,
        name:        name.trim(),
        price:       parseFloat(price),
        category,
        status,
        prep_hours:  status === "preorder" ? parseInt(prepHours) : 0,
        description: description.trim(),
        is_available: status === "available",
      };

      let res;
      if (editItem) {
        res = await fetch(`${API}/api/menu/${editItem.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`${API}/api/menu`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const json = await res.json();
      if (json.success) {
        Alert.alert("✅ تم", editItem ? "تم تعديل الوجبة" : "تم إضافة الوجبة");
        setShowAdd(false);
        resetForm();
        loadItems();
      } else {
        Alert.alert("خطأ", json.message);
      }
    } finally { setSaving(false); }
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
    const newStatus = item.status === "available" ? "unavailable" :
                      item.status === "unavailable" ? "available" : item.status;
    await fetch(`${API}/api/menu/${item.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, is_available: newStatus === "available" }),
    });
    loadItems();
  };

  if (!fontsLoaded) return null;

  const STATUS_COLORS: any = {
    available:   "#4CAF50",
    preorder:    "#F0A500",
    unavailable: "#E53935",
  };

  const STATUS_LABELS: any = {
    available:   "🟢 متاح",
    preorder:    "🟡 حجز مسبق",
    unavailable: "🔴 غير متاح",
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* الهيدر */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>وجباتي 🍲</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }}>
          <Text style={s.addBtn}>+ إضافة</Text>
        </TouchableOpacity>
      </View>

      {/* القائمة */}
      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} size="large" />
        : <FlatList
            data={items}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.cardInfo}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemCat}>{CATEGORIES.find(c => c.id === item.category)?.label || item.category}</Text>
                    {item.status === "preorder" && item.prep_hours > 0 && (
                      <Text style={s.prepTime}>⏱️ وقت التحضير: {item.prep_hours} ساعة</Text>
                    )}
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.itemPrice}>{item.price} ريال</Text>
                    <TouchableOpacity
                      style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status || "available"] + "22" }]}
                      onPress={() => toggleItemStatus(item)}
                    >
                      <Text style={[s.statusBadgeText, { color: STATUS_COLORS[item.status || "available"] }]}>
                        {STATUS_LABELS[item.status || "available"]}
                      </Text>
                    </TouchableOpacity>
                  </View>
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

      {/* Modal إضافة/تعديل وجبة */}
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
              <TextInput style={[s.input, { height: 70 }]} placeholder="وصف مختصر للوجبة..." placeholderTextColor="#5A3A18" value={description} onChangeText={setDescription} textAlign="right" multiline/>
            </View>

            {/* الكاتيجوري */}
            <Text style={s.label}>التصنيف</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row-reverse", gap: 8, paddingVertical: 4 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.catBtn, category === c.id && s.catBtnActive]}
                    onPress={() => setCategory(c.id)}
                  >
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
                style={[s.statusOption, status === st.id && { borderColor: STATUS_COLORS[st.id], backgroundColor: STATUS_COLORS[st.id] + "11" }]}
                onPress={() => setStatus(st.id)}
              >
                <View>
                  <Text style={[s.statusLabel, { color: STATUS_COLORS[st.id] }]}>{st.label}</Text>
                  <Text style={s.statusDesc}>{st.desc}</Text>
                </View>
                {status === st.id && <Text style={{ color: STATUS_COLORS[st.id], fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            ))}

            {/* وقت التحضير — للحجز المسبق فقط */}
            {status === "preorder" && (
              <>
                <Text style={s.label}>وقت التحضير (ساعات)</Text>
                <View style={s.inputWrap}>
                  <TextInput style={s.input} placeholder="مثال: 12" placeholderTextColor="#5A3A18" keyboardType="numeric" value={prepHours} onChangeText={setPrepHours} textAlign="right"/>
                </View>
              </>
            )}

            {/* زر الحفظ */}
            <TouchableOpacity style={s.saveBtn} onPress={saveItem} disabled={saving}>
              {saving
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
  safe:            { flex: 1, backgroundColor: "#0E0700" },
  header:          { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  modalHeader:     { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#0E0700", borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:           { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:            { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  addBtn:          { color: "#F0A500", fontSize: 15, fontWeight: "900", fontFamily: "Almarai_800ExtraBold" },
  card:            { backgroundColor: "#1C1000", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  cardTop:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardInfo:        { flex: 1 },
  cardRight:       { alignItems: "flex-end", gap: 6 },
  itemName:        { fontSize: 15, fontWeight: "800", color: "#FDF0DC", textAlign: "right", fontFamily: "Almarai_700Bold" },
  itemCat:         { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  prepTime:        { fontSize: 11, color: "#F0A500", textAlign: "right", fontFamily: "Almarai_400Regular", marginTop: 2 },
  itemPrice:       { fontSize: 16, fontWeight: "900", color: "#F0A500", fontFamily: "Almarai_800ExtraBold" },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: "800", fontFamily: "Almarai_700Bold" },
  itemDesc:        { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", marginBottom: 8 },
  cardActions:     { flexDirection: "row-reverse", gap: 8 },
  editBtn:         { flex: 1, backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)" },
  editBtnText:     { color: "#F0A500", fontSize: 12, fontFamily: "Almarai_700Bold" },
  deleteBtn:       { flex: 1, backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  deleteBtnText:   { color: "#E53935", fontSize: 12, fontFamily: "Almarai_700Bold" },
  emptyWrap:       { alignItems: "center", marginTop: 60 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  empty:           { color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular", marginBottom: 16 },
  emptyAddBtn:     { backgroundColor: "#F0A500", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyAddText:    { color: "#0E0700", fontSize: 14, fontWeight: "900", fontFamily: "Almarai_800ExtraBold" },
  label:           { fontSize: 11, fontWeight: "700", color: "#C97D20", letterSpacing: 2, textAlign: "right", marginBottom: 6, fontFamily: "Almarai_700Bold" },
  inputWrap:       { backgroundColor: "#1C1000", borderRadius: 14, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)", paddingHorizontal: 14, marginBottom: 16 },
  input:           { height: 50, color: "#FDF0DC", fontSize: 15, fontFamily: "Almarai_400Regular" },
  catBtn:          { backgroundColor: "#1C1000", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  catBtnActive:    { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  catText:         { color: "#8A6030", fontSize: 12, fontFamily: "Almarai_700Bold" },
  catTextActive:   { color: "#F0A500" },
  statusOption:    { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)", backgroundColor: "#1C1000" },
  statusLabel:     { fontSize: 14, fontWeight: "800", textAlign: "right", fontFamily: "Almarai_700Bold", marginBottom: 2 },
  statusDesc:      { fontSize: 11, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular" },
  saveBtn:         { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 40 },
  saveBtnText:     { fontSize: 16, fontWeight: "900", color: "#0E0700", fontFamily: "Almarai_800ExtraBold" },
});
