import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function PastriesScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.emoji}>🥐</Text>
        <Text style={s.title}>الفطائر</Text>
        <Text style={s.sub}>قريباً في زعفران 🍲</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#0E0700" },
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji:     { fontSize: 64, marginBottom: 16 },
  title:     { fontSize: 24, fontWeight: "900", color: "#FDF0DC", marginBottom: 8 },
  sub:       { fontSize: 14, color: "#8A6030" },
});
