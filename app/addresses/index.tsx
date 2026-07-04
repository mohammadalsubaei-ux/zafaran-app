import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, Alert, ActivityIndicator, Modal, TextInput
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
const isWeb = require('react-native').Platform.OS === 'web';
const MapView = isWeb ? () => null : require('react-native-maps').default;
const Marker  = isWeb ? () => null : require('react-native-maps').Marker;
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";

const API = "https://zafaran-backend-production.up.railway.app";

const LABELS = [
  { id: "منزل",     emoji: "🏠" },
  { id: "عمل",      emoji: "💼" },
  { id: "استراحة",  emoji: "⭐" },
  { id: "أخرى",     emoji: "📍" },
];

export default function AddressesScreen() {
  const [user, setUser]           = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showMap, setShowMap]     = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("منزل");
  const [mapRegion, setMapRegion] = useState({
    latitude: 26.3260, longitude: 43.9750,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [addressText, setAddressText] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  useEffect(() => {
    AsyncStorage.getItem("user").then(u => {
      if (u) {
        const userData = JSON.parse(u);
        setUser(userData);
        loadAddresses(userData.id);
      }
    });
  }, []);

  const loadAddresses = async (userId: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/addresses/${userId}`);
      const json = await res.json();
      if (json.success) setAddresses(json.data);
    } finally {
      setLoading(false);
    }
  };

  const getMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    const geo = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude
    });

    setMapRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    setSelectedLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });

    if (geo.length > 0) {
      const g = geo[0];
      setAddressText(`${g.street || ""} ${g.district || ""} ${g.city || ""}`.trim());
    }
  };

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLocation({ lat: latitude, lng: longitude });

    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo.length > 0) {
      const g = geo[0];
      setAddressText(`${g.street || ""} ${g.district || ""} ${g.city || ""}`.trim());
    }
  };

  const saveAddress = async () => {
    if (!selectedLocation || !addressText) {
      Alert.alert("تنبيه", "حدد الموقع على الخريطة");
      return;
    }
    setSavingAddress(true);
    try {
      const res  = await fetch(`${API}/api/addresses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          user_id:    user.id,
          label:      selectedLabel,
          address:    addressText,
          lat:        selectedLocation.lat,
          lng:        selectedLocation.lng,
          is_default: addresses.length === 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowMap(false);
        setSelectedLocation(null);
        setAddressText("");
        loadAddresses(user.id);

        // حفظ العنوان الافتراضي في AsyncStorage
        if (addresses.length === 0) {
          await AsyncStorage.setItem("last_address", addressText);
        }
      }
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = (id: string) => {
    Alert.alert("حذف العنوان", "تبي تحذف هذا العنوان؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم", style: "destructive", onPress: async () => {
        await fetch(`${API}/api/addresses/${id}`, { method: "DELETE" });
        loadAddresses(user.id);
      }},
    ]);
  };

  const setDefault = async (address: any) => {
    await fetch(`${API}/api/addresses/${address.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...address, is_default: true, user_id: user.id }),
    });
    await AsyncStorage.setItem("last_address", address.address);
    loadAddresses(user.id);
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={s.title}>عناويني 📍</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <ActivityIndicator color="#F0A500" style={{ marginTop: 40 }} />
        : <FlatList
            data={addresses}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={[s.card, item.is_default && s.cardDefault]}>
                <View style={s.cardRight}>
                  <Text style={s.cardEmoji}>
                    {LABELS.find(l => l.id === item.label)?.emoji || "📍"}
                  </Text>
                  <View style={s.cardInfo}>
                    <View style={s.cardTitleRow}>
                      <Text style={s.cardLabel}>{item.label}</Text>
                      {item.is_default && (
                        <View style={s.defaultBadge}>
                          <Text style={s.defaultText}>افتراضي</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.cardAddress} numberOfLines={2}>{item.address}</Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  {!item.is_default && (
                    <TouchableOpacity style={s.actionBtn} onPress={() => setDefault(item)}>
                      <Text style={s.actionBtnText}>تعيين افتراضي</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.deleteBtn} onPress={() => deleteAddress(item.id)}>
                    <Text style={s.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>📍</Text>
                <Text style={s.empty}>ما عندك عناوين محفوظة</Text>
              </View>
            }
          />
      }

      {/* زر إضافة عنوان */}
      <View style={s.footer}>
        <TouchableOpacity style={s.addBtn} onPress={() => { setShowMap(true); getMyLocation(); }}>
          <Text style={s.addBtnText}>+ إضافة عنوان جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Modal الخريطة */}
      <Modal visible={showMap} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0E0700" }}>
          <View style={s.mapHeader}>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Text style={s.back}>✕ إلغاء</Text>
            </TouchableOpacity>
            <Text style={s.title}>عنوان التسليم الجديد</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* الخريطة */}
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

          {/* تفاصيل العنوان */}
          <View style={s.mapFooter}>
            {/* نوع العنوان */}
            <View style={s.labelsRow}>
              {LABELS.map(l => (
                <TouchableOpacity
                  key={l.id}
                  style={[s.labelBtn, selectedLabel === l.id && s.labelBtnActive]}
                  onPress={() => setSelectedLabel(l.id)}
                >
                  <Text style={s.labelEmoji}>{l.emoji}</Text>
                  <Text style={[s.labelText, selectedLabel === l.id && s.labelTextActive]}>{l.id}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* العنوان النصي */}
            <TextInput
              style={s.addressInput}
              value={addressText}
              onChangeText={setAddressText}
              placeholder="العنوان التفصيلي..."
              placeholderTextColor="#5A3A18"
              textAlign="right"
            />

            {/* زر تحديد موقعي */}
            <TouchableOpacity style={s.locBtn} onPress={getMyLocation}>
              <Text style={s.locBtnText}>📌 استخدم موقعي الحالي</Text>
            </TouchableOpacity>

            {/* زر الحفظ */}
            <TouchableOpacity style={s.saveBtn} onPress={saveAddress} disabled={savingAddress}>
              {savingAddress
                ? <ActivityIndicator color="#0E0700" />
                : <Text style={s.saveBtnText}>حفظ العنوان</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: "#0E0700" },
  header:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  mapHeader:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#0E0700", borderBottomWidth: 1, borderBottomColor: "rgba(240,165,0,0.12)" },
  title:          { fontSize: 18, fontWeight: "900", color: "#FDF0DC", fontFamily: "Almarai_800ExtraBold" },
  back:           { color: "#F0A500", fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  card:           { backgroundColor: "#1C1000", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  cardDefault:    { borderColor: "rgba(240,165,0,0.4)", backgroundColor: "rgba(240,165,0,0.05)" },
  cardRight:      { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  cardEmoji:      { fontSize: 28 },
  cardInfo:       { flex: 1 },
  cardTitleRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 },
  cardLabel:      { fontSize: 15, fontWeight: "800", color: "#FDF0DC", fontFamily: "Almarai_700Bold" },
  defaultBadge:   { backgroundColor: "rgba(240,165,0,0.15)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(240,165,0,0.3)" },
  defaultText:    { fontSize: 10, color: "#F0A500", fontFamily: "Almarai_700Bold" },
  cardAddress:    { fontSize: 12, color: "#8A6030", textAlign: "right", fontFamily: "Almarai_400Regular", lineHeight: 18 },
  cardActions:    { flexDirection: "row-reverse", gap: 8, justifyContent: "flex-start" },
  actionBtn:      { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(240,165,0,0.2)" },
  actionBtnText:  { fontSize: 11, color: "#F0A500", fontFamily: "Almarai_700Bold" },
  deleteBtn:      { backgroundColor: "rgba(229,57,53,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(229,57,53,0.2)" },
  deleteBtnText:  { fontSize: 14 },
  emptyWrap:      { alignItems: "center", marginTop: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  empty:          { color: "#8A6030", fontSize: 14, fontFamily: "Almarai_400Regular" },
  footer:         { padding: 16, borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.1)" },
  addBtn:         { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center" },
  addBtnText:     { fontSize: 16, fontWeight: "900", color: "#0E0700", fontFamily: "Almarai_800ExtraBold" },
  mapFooter:      { backgroundColor: "#0E0700", padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(240,165,0,0.12)" },
  labelsRow:      { flexDirection: "row-reverse", gap: 8 },
  labelBtn:       { flex: 1, alignItems: "center", backgroundColor: "#1C1000", borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(240,165,0,0.1)" },
  labelBtnActive: { backgroundColor: "rgba(240,165,0,0.12)", borderColor: "rgba(240,165,0,0.4)" },
  labelEmoji:     { fontSize: 20, marginBottom: 2 },
  labelText:      { fontSize: 10, color: "#8A6030", fontFamily: "Almarai_700Bold" },
  labelTextActive:{ color: "#F0A500" },
  addressInput:   { backgroundColor: "#1C1000", borderRadius: 12, padding: 12, color: "#FDF0DC", fontFamily: "Almarai_400Regular", borderWidth: 1, borderColor: "rgba(240,165,0,0.15)", fontSize: 14 },
  locBtn:         { backgroundColor: "rgba(240,165,0,0.1)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(240,165,0,0.2)" },
  locBtnText:     { color: "#F0A500", fontSize: 14, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  saveBtn:        { backgroundColor: "#F0A500", borderRadius: 16, padding: 16, alignItems: "center" },
  saveBtnText:    { fontSize: 16, fontWeight: "900", color: "#0E0700", fontFamily: "Almarai_800ExtraBold" },
});
