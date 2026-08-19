import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import { ArrowDownToLine, X } from "lucide-react-native";

const API = "https://zafaran-backend-production.up.railway.app";
const PLAY_URL = "https://play.google.com/store/apps/details?id=com.zafaran.app";

// رقم النسخة الحالية من app.json — expo-constants يقرأه وقت التشغيل
function currentVersionCode(): number {
  const android = (Constants.expoConfig as any)?.android;
  const code = Number(android?.versionCode);
  return Number.isFinite(code) ? code : 0;
}

export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkUpdate = useCallback(async () => {
    // iOS يتحدث عبر App Store بمسار مختلف — الفحص لأندرويد فقط حالياً
    if (Platform.OS !== "android") return;

    try {
      const res = await fetch(`${API}/api/settings/latest_version_code`);
      const json = await res.json().catch(() => null);

      const latest = Number(json?.data?.value);
      const current = currentVersionCode();

      // أي فشل في القراءة = لا رسالة، لا نزعج المستخدم بلا سبب
      if (!Number.isFinite(latest) || latest <= 0) return;
      if (current <= 0) return;

      if (latest > current) setVisible(true);
    } catch {
      // تجاهل صامت — فحص التحديث ليس وظيفة حرجة
    }
  }, []);

  useEffect(() => {
    checkUpdate();
  }, [checkUpdate]);

  const openStore = useCallback(() => {
    Linking.openURL(PLAY_URL).catch(() => {});
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.iconWrap}>
            <ArrowDownToLine size={34} color="#F2B233" strokeWidth={1.6} />
          </View>

          <Text style={s.title}>يتوفر تحديث جديد</Text>
          <Text style={s.sub}>
            حدّثنا زعفران بإصلاحات وتحسينات — حمّل آخر نسخة لتجربة أفضل.
          </Text>

          <TouchableOpacity activeOpacity={0.9} style={s.updateBtn} onPress={openStore}>
            <Text style={s.updateBtnText}>تحديث الآن</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} style={s.laterBtn} onPress={close}>
            <Text style={s.laterText}>لاحقاً</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  box: {
    width: "100%",
    backgroundColor: "#1C1000",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.18)",
  },

  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 28,
    backgroundColor: "rgba(242,178,51,0.09)",
    borderWidth: 1,
    borderColor: "rgba(242,178,51,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    color: "#FDF0DC",
    fontSize: 19,
    textAlign: "center",
    fontFamily: "Almarai_800ExtraBold",
  },

  sub: {
    color: "#A98961",
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 22,
    fontFamily: "Almarai_400Regular",
  },

  updateBtn: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F2B233",
    alignItems: "center",
    justifyContent: "center",
  },

  updateBtnText: {
    color: "#17100B",
    fontSize: 15,
    fontFamily: "Almarai_800ExtraBold",
  },

  laterBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },

  laterText: {
    color: "#A98961",
    fontSize: 13,
    fontFamily: "Almarai_700Bold",
  },
});