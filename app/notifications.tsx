import { useCallback, useState } from "react";
import {
  ActivityIndicator, FlatList, RefreshControl, SafeAreaView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronRight, Bell, BellOff } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("user");
      const user = stored ? JSON.parse(stored) : null;
      if (!user?.id) { setItems([]); return; }

      const res = await fetch(`${API}/api/notifications/${user.id}`);
      const json = await res.json().catch(() => null);
      setItems(json?.success ? json.data || [] : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const openNotif = useCallback((item: Notif) => {
    const orderId = item.data?.order_id;
    if (orderId) router.push(`/orders/${orderId}` as any);
  }, [router]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronRight size={22} color="#F2B233" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>الإشعارات</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#F2B233" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F2B233" />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <BellOff size={48} color="#5A3A18" strokeWidth={1.5} />
              <Text style={s.emptyTitle}>ما فيه إشعارات بعد</Text>
              <Text style={s.emptyText}>أي تحديث على طلباتك بيظهر هنا</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.88} style={s.card} onPress={() => openNotif(item)}>
              <View style={s.iconWrap}>
                <Bell size={16} color="#F2B233" strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>
                <Text style={s.cardTime}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#17100B" },
  header: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(242,178,51,0.1)",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FDF0DC", fontSize: 16, fontWeight: "800" },

  card: {
    flexDirection: "row-reverse", gap: 12, backgroundColor: "#21160D", borderRadius: 16,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(242,178,51,0.09)",
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(242,178,51,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { color: "#FDF0DC", fontSize: 14, fontWeight: "800", textAlign: "right", marginBottom: 3 },
  cardBody: { color: "#A98961", fontSize: 12, textAlign: "right", marginBottom: 5, lineHeight: 18 },
  cardTime: { color: "#5A3A18", fontSize: 10, textAlign: "right" },

  emptyWrap: { alignItems: "center", marginTop: 100, gap: 10 },
  emptyTitle: { color: "#FDF0DC", fontSize: 15, fontWeight: "800" },
  emptyText: { color: "#8A6030", fontSize: 12 },
});