import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, type Colors } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
const isWeb = require('react-native').Platform.OS === 'web';
const MapView = isWeb ? () => null : require('react-native-maps').default;
const Marker  = isWeb ? () => null : require('react-native-maps').Marker;
import { useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold } from "@expo-google-fonts/almarai";
import { ArrowRight, Home, Briefcase, Star, MapPin, Trash2 } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

const LABELS = [
  { id: "منزل",     Icon: Home },
  { id: "عمل",      Icon: Briefcase },
  { id: "استراحة",  Icon: Star },
  { id: "أخرى",     Icon: MapPin },
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
  const { c } = useTheme();
  const s = useMemo(() => make_s(c), [c]);

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

        // حفظ العنوان الافتراضي في AsyncStorage مع الإحداثيات (مطلوبة لحساب رسوم التوصيل)
        if (addresses.length === 0) {
          await AsyncStorage.multiSet([
            ["last_address", addressText],
            ["last_address_lat", String(selectedLocation.lat)],
            ["last_address_lng", String(selectedLocation.lng)],
          ]);
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
    await AsyncStorage.multiSet([
      ["last_address", String(address.address || "")],
      ["last_address_lat", String(address.lat ?? "")],
      ["last_address_lng", String(address.lng ?? "")],
    ]);
    loadAddresses(user.id);
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity activeOpacity={0.8} style={s.headerBtn} onPress={() => router.back()}>
          <ArrowRight size={20} color={c.gold} />
        </TouchableOpacity>
        <Text style={s.title}>عناويني</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading
        ? <ActivityIndicator color={c.gold} style={{ marginTop: 40 }} />
        : <FlatList
            data={addresses}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View style={[s.card, item.is_default && s.cardDefault]}>
                <View style={s.cardRight}>
                  <View style={s.cardIconBox}>
                    {(() => {
                      const LabelIcon = LABELS.find(l => l.id === item.label)?.Icon || MapPin;
                      return <LabelIcon size={18} color={c.gold} strokeWidth={1.8} />;
                    })()}
                  </View>
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
                    <Trash2 size={15} color={c.danger} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <View style={{ marginBottom: 12 }}>
                  <MapPin size={44} color={c.textMuted} strokeWidth={1.4} />
                </View>
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
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
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
            showsUserLocation={false}
          >
            {selectedLocation && (
              <Marker
                coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
                pinColor={c.gold}
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
                  <l.Icon size={18} color={selectedLabel === l.id ? c.gold : c.textSoft} strokeWidth={1.8} style={{ marginBottom: 3 }} />
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
              placeholderTextColor={c.textMuted}
              textAlign="right"
            />

            {/* زر تحديد موقعي */}
            <TouchableOpacity style={s.locBtn} onPress={getMyLocation}>
              <Text style={s.locBtnText}>📌 استخدم موقعي الحالي</Text>
            </TouchableOpacity>

            {/* زر الحفظ */}
            <TouchableOpacity style={s.saveBtn} onPress={saveAddress} disabled={savingAddress}>
              {savingAddress
                ? <ActivityIndicator color={c.onGold} />
                : <Text style={s.saveBtnText}>حفظ العنوان</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const make_s = (c: Colors) => StyleSheet.create({
  safe:           { flex: 1, backgroundColor: c.bg },
  header:         { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  mapHeader:      { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border },
  title:          { fontSize: 18, fontWeight: "900", color: c.text, fontFamily: "Almarai_800ExtraBold" },
  back:           { color: c.gold, fontSize: 15, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  cardIconBox:    { width: 38, height: 38, borderRadius: 12, backgroundColor: c.goldSoft, alignItems: "center", justifyContent: "center" },
  headerBtn:      { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: c.goldBorder, alignItems: "center", justifyContent: "center" },
  card:           { backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.goldSoft },
  cardDefault:    { borderColor: c.goldBorder, backgroundColor: c.goldSoft },
  cardRight:      { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  cardEmoji:      { fontSize: 28 },
  cardInfo:       { flex: 1 },
  cardTitleRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 4 },
  cardLabel:      { fontSize: 15, fontWeight: "800", color: c.text, fontFamily: "Almarai_700Bold" },
  defaultBadge:   { backgroundColor: c.goldBorder, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: c.goldBorder },
  defaultText:    { fontSize: 10, color: c.gold, fontFamily: "Almarai_700Bold" },
  cardAddress:    { fontSize: 12, color: c.textSoft, textAlign: "right", fontFamily: "Almarai_400Regular", lineHeight: 18 },
  cardActions:    { flexDirection: "row-reverse", gap: 8, justifyContent: "flex-start" },
  actionBtn:      { backgroundColor: c.goldSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: c.goldBorder },
  actionBtnText:  { fontSize: 11, color: c.gold, fontFamily: "Almarai_700Bold" },
  deleteBtn:      { backgroundColor: c.dangerSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: c.dangerSoft },
  deleteBtnText:  { fontSize: 14 },
  emptyWrap:      { alignItems: "center", marginTop: 80 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  empty:          { color: c.textSoft, fontSize: 14, fontFamily: "Almarai_400Regular" },
  footer:         { padding: 16, borderTopWidth: 1, borderTopColor: c.goldSoft },
  addBtn:         { backgroundColor: c.gold, borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 28 },
  addBtnText:     { fontSize: 16, fontWeight: "900", color: c.bg, fontFamily: "Almarai_800ExtraBold" },
  mapFooter:      { backgroundColor: c.bg, padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: c.border },
  labelsRow:      { flexDirection: "row-reverse", gap: 8 },
  labelBtn:       { flex: 1, alignItems: "center", backgroundColor: c.surface, borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: c.goldSoft },
  labelBtnActive: { backgroundColor: c.border, borderColor: c.goldBorder },
  labelEmoji:     { fontSize: 20, marginBottom: 2 },
  labelText:      { fontSize: 10, color: c.textSoft, fontFamily: "Almarai_700Bold" },
  labelTextActive:{ color: c.gold },
  addressInput:   { backgroundColor: c.surface, borderRadius: 12, padding: 12, color: c.text, fontFamily: "Almarai_400Regular", borderWidth: 1, borderColor: c.goldBorder, fontSize: 14 },
  locBtn:         { backgroundColor: c.goldSoft, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: c.goldBorder },
  locBtnText:     { color: c.gold, fontSize: 14, fontWeight: "700", fontFamily: "Almarai_700Bold" },
  saveBtn:        { backgroundColor: c.gold, borderRadius: 16, padding: 16, alignItems: "center" },
  saveBtnText:    { fontSize: 16, fontWeight: "900", color: c.bg, fontFamily: "Almarai_800ExtraBold" },
});