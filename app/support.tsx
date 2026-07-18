import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Linking, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowRight, ChevronDown, Headphones, MessageCircle, Mail,
} from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⬇️ ضع رقم واتساب الدعم هنا بالصيغة الدولية بدون + وبدون مسافات
//  مثال: رقم 0501234567 يُكتب 966501234567
const SUPPORT_WHATSAPP = "966500000000";
const SUPPORT_EMAIL = "support@zafaran.sa";
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WHATSAPP_MESSAGE = "مرحباً، أحتاج مساعدة بخصوص تطبيق زعفران";

const FAQS = [
  {
    q: "كيف أطلب من زعفران؟",
    a: "تصفح الأسر المنتجة من الصفحة الرئيسية أو التصنيفات، أضف ما يعجبك للسلة، ثم اختر التوصيل أو الاستلام الشخصي وأكمل الطلب. بيوصلك إشعار مع كل تحديث لحالة طلبك.",
  },
  {
    q: "كيف تحسب رسوم التوصيل؟",
    a: "رسوم التوصيل تعتمد على المسافة بينك وبين الأسرة المنتجة: رسوم أساسية للمسافات القريبة، وزيادة بسيطة لكل كيلومتر إضافي. الرسوم تظهر لك بوضوح في السلة قبل تأكيد الطلب.",
  },
  {
    q: "ما الفرق بين التوصيل والاستلام الشخصي؟",
    a: "التوصيل يوصلك الطلب مندوب زعفران حتى باب بيتك. الاستلام الشخصي تستلم طلبك بنفسك من موقع الأسرة المنتجة بدون رسوم توصيل — ويوصلك إشعار أول ما يكون الطلب جاهزاً.",
  },
  {
    q: "هل أقدر ألغي طلبي؟",
    a: "الطلب الذي لم تقبله الأسرة المنتجة بعد يمكن إلغاؤه. وبعد بدء التحضير نرجو التواصل مع الدعم وسنساعدك بأفضل حل ممكن.",
  },
  {
    q: "وصلني الطلب ناقصاً أو فيه مشكلة، وش أسوي؟",
    a: "تواصل معنا فوراً عبر واتساب الدعم مع رقم الطلب وصورة توضح المشكلة، وبنعالجها لك بأسرع وقت — رضاك أولويتنا.",
  },
  {
    q: "كيف أنضم كأسرة منتجة (شيف، حلا، قهوة، مخبوزات)؟",
    a: "من شاشة الدخول اختر \"سجّل مشروعك البيتي\" وأكمل بياناتك. بعد مراجعة حسابك وتوثيقه من فريق زعفران تقدر تضيف منتجاتك وتستقبل الطلبات وتتابع أرباحك من لوحتك.",
  },
  {
    q: "كيف أسحب أرباحي كأسرة منتجة أو مندوب؟",
    a: "من لوحتك افتح \"الأرباح والمحفظة\"، وحدد المبلغ واطلب السحب. الطلب يراجع من إدارة زعفران ويحول لحسابك، ويوصلك إشعار فور التحويل.",
  },
];

export default function Support() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  if (!fontsLoaded) return null;

  const openWhatsApp = async () => {
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("تنبيه", "تعذر فتح واتساب — تأكد من تثبيته على جهازك");
    }
  };

  const openEmail = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("استفسار — تطبيق زعفران")}`);
    } catch {
      Alert.alert("تنبيه", "تعذر فتح تطبيق البريد");
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={{ width: 38 }} />
        <Text style={s.title}>الدعم والمساعدة</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowRight size={20} color="#F2B233" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Headphones size={26} color="#F2B233" strokeWidth={1.7} />
          </View>
          <Text style={s.heroTitle}>كيف نقدر نساعدك؟</Text>
          <Text style={s.heroSub}>فريق زعفران جاهز لخدمتك — تصفح الأسئلة الشائعة أو تواصل معنا مباشرة</Text>
        </View>

        <Text style={s.sectionTitle}>تواصل معنا</Text>

        <TouchableOpacity style={s.waBtn} activeOpacity={0.88} onPress={openWhatsApp}>
          <View style={s.waIcon}>
            <MessageCircle size={20} color="#0E0700" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.waTitle}>محادثة واتساب</Text>
            <Text style={s.waSub}>الأسرع — رد خلال دقائق بأوقات العمل</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={s.mailRow} activeOpacity={0.86} onPress={openEmail}>
          <View style={s.mailIcon}>
            <Mail size={18} color="#F2B233" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.mailTitle}>البريد الإلكتروني</Text>
            <Text style={s.mailSub}>{SUPPORT_EMAIL}</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.sectionTitle}>الأسئلة الشائعة</Text>

        {FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <TouchableOpacity
              key={index}
              style={s.faqCard}
              activeOpacity={0.88}
              onPress={() => setOpenIndex(open ? null : index)}
            >
              <View style={s.faqHeader}>
                <ChevronDown
                  size={17}
                  color="#F2B233"
                  style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
                />
                <Text style={s.faqQ}>{faq.q}</Text>
              </View>
              {open ? <Text style={s.faqA}>{faq.a}</Text> : null}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: "#0E0700" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: "rgba(242,178,51,0.25)", alignItems: "center", justifyContent: "center" },
  title:   { color: "#FDF0DC", fontSize: 17, fontFamily: "Almarai_800ExtraBold" },
  scroll:  { paddingHorizontal: 16, paddingBottom: 20 },

  heroCard:  { backgroundColor: "#1C1208", borderRadius: 18, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "rgba(242,178,51,0.18)", marginBottom: 6 },
  heroIcon:  { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(242,178,51,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  heroTitle: { color: "#FDF0DC", fontSize: 16, fontFamily: "Almarai_800ExtraBold" },
  heroSub:   { color: "#A98961", fontSize: 12, fontFamily: "Almarai_400Regular", textAlign: "center", marginTop: 5, lineHeight: 19 },

  sectionTitle: { color: "#F2B233", fontSize: 14, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginTop: 18, marginBottom: 10 },

  waBtn:   { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "#F2B233", borderRadius: 16, padding: 14, marginBottom: 10 },
  waIcon:  { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(14,7,0,0.15)", alignItems: "center", justifyContent: "center" },
  waTitle: { color: "#0E0700", fontSize: 15, fontFamily: "Almarai_800ExtraBold", textAlign: "right" },
  waSub:   { color: "rgba(14,7,0,0.65)", fontSize: 11, fontFamily: "Almarai_400Regular", textAlign: "right", marginTop: 2 },

  mailRow:   { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "#1C1208", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(242,178,51,0.12)" },
  mailIcon:  { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(242,178,51,0.08)", alignItems: "center", justifyContent: "center" },
  mailTitle: { color: "#FDF0DC", fontSize: 14, fontFamily: "Almarai_700Bold", textAlign: "right" },
  mailSub:   { color: "#A98961", fontSize: 11, fontFamily: "Almarai_400Regular", textAlign: "right", marginTop: 2 },

  faqCard:   { backgroundColor: "#17100B", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(242,178,51,0.08)" },
  faqHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  faqQ:      { flex: 1, color: "#FDF0DC", fontSize: 13, fontFamily: "Almarai_700Bold", textAlign: "right" },
  faqA:      { color: "#A98961", fontSize: 12, fontFamily: "Almarai_400Regular", textAlign: "right", lineHeight: 20, marginTop: 10 },
});