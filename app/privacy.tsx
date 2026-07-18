import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ShieldCheck } from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const LAST_UPDATED = "يوليو 2026";

const SECTIONS = [
  {
    title: "مقدمة",
    body: "خصوصيتك أمانة عندنا. توضح هذه السياسة كيف يجمع تطبيق زعفران بياناتك وكيف يستخدمها ويحميها عند استخدامك المنصة، سواء كنت عميلاً أو أسرة منتجة أو مندوب توصيل. باستخدامك التطبيق فأنت توافق على ما ورد فيها.",
  },
  {
    title: "البيانات التي نجمعها",
    body: "نجمع البيانات التي تزودنا بها عند التسجيل: الاسم ورقم الجوال وكلمة المرور (محفوظة بتشفير لا يمكن عكسه). وعند استخدامك للتطبيق نجمع بيانات طلباتك وعناوين التوصيل التي تضيفها، وموقعك الجغرافي عند تفعيله لغرض حساب رسوم التوصيل وتتبع الطلب. الأسر المنتجة والمناديب نجمع منهم إضافة لذلك بيانات نشاطهم: المدينة، المنتجات، سجل الطلبات والأرباح.",
  },
  {
    title: "كيف نستخدم بياناتك",
    body: "نستخدم بياناتك حصراً لتشغيل الخدمة: تنفيذ الطلبات وتوصيلها، التواصل معك بشأنها عبر الإشعارات، حساب المستحقات المالية للأسر المنتجة والمناديب، تحسين تجربة الاستخدام، وحماية المنصة من إساءة الاستخدام. لا نبيع بياناتك ولا نشاركها مع أي جهة تسويقية.",
  },
  {
    title: "مشاركة البيانات",
    body: "تقتصر مشاركة بياناتك على الحد الضروري لإتمام الطلب: الأسرة المنتجة ترى اسمك وتفاصيل طلبك، والمندوب يرى اسمك وعنوان التوصيل ورقم تواصلك لإيصال الطلب. لا يطلع أي طرف على بيانات لا يحتاجها لأداء دوره.",
  },
  {
    title: "حماية البيانات",
    body: "بياناتك محفوظة لدى مزودي خدمات سحابية موثوقين وباتصالات مشفرة. كلمات المرور لا تخزن أبداً كنص مقروء بل بتجزئة مشفرة بمعيار حديث، ولا يمكن لأي أحد — بما في ذلك فريق زعفران — الاطلاع عليها.",
  },
  {
    title: "حقوقك",
    body: "لك الحق في الاطلاع على بياناتك وتصحيحها من داخل التطبيق، وطلب حذف حسابك نهائياً بالتواصل مع الدعم. عند حذف الحساب تحذف بياناتك الشخصية مع الاحتفاظ بما تلزمنا به الأنظمة من سجلات مالية.",
  },
  {
    title: "التعديلات على السياسة",
    body: "قد نحدث هذه السياسة من وقت لآخر بما يواكب تطور الخدمة أو المتطلبات النظامية، وسننبهك داخل التطبيق لأي تغيير جوهري. استمرارك باستخدام زعفران بعد التحديث يعد موافقة على النسخة المحدثة.",
  },
  {
    title: "تواصل معنا",
    body: "لأي استفسار يخص خصوصيتك وبياناتك، تواصل معنا عبر شاشة الدعم والمساعدة داخل التطبيق ويسعدنا خدمتك.",
  },
];

export default function Privacy() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={{ width: 38 }} />
        <Text style={s.title}>سياسة الخصوصية</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowRight size={20} color="#F2B233" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroRow}>
          <ShieldCheck size={20} color="#F2B233" strokeWidth={1.8} />
          <Text style={s.updated}>آخر تحديث: {LAST_UPDATED}</Text>
        </View>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.card}>
            <Text style={s.secTitle}>{sec.title}</Text>
            <Text style={s.secBody}>{sec.body}</Text>
          </View>
        ))}

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

  heroRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 14 },
  updated: { color: "#A98961", fontSize: 12, fontFamily: "Almarai_400Regular" },

  card:     { backgroundColor: "#17100B", borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: "rgba(242,178,51,0.08)" },
  secTitle: { color: "#F2B233", fontSize: 14, fontFamily: "Almarai_800ExtraBold", textAlign: "right", marginBottom: 7 },
  secBody:  { color: "#D9C4A5", fontSize: 12.5, fontFamily: "Almarai_400Regular", textAlign: "right", lineHeight: 22 },
});