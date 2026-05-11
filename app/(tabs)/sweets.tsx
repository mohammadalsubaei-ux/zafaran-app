import { View, Text, StyleSheet } from "react-native";

export default function PastriesScreen() {
  return (
    <View style={s.safe}>
      <Text style={s.title}>🥐 فطائر</Text>
      <Text style={s.sub}>قريباً...</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: "#0E0700", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 40, fontWeight: "900", color: "#F0A500" },
  sub:   { fontSize: 16, color: "#8A6030", marginTop: 10 },
});