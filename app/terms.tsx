import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, FileText } from "lucide-react-native";
import {
  useFonts, Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold,
} from "@expo-google-fonts/almarai";

const LAST_UPDATED = "يوليو 2026";

const SECTIONS = [
  {
    title: "طبيعة الخدمة",
    body: "زعفران منصة وسيطة تربط العملاء بالأسر المنتجة (طبخ بيتي، حلا، قهوة، مخبوزات وسائر التخصصات) ومناديب التوصيل في منطقة القصيم. المنتجات تعدها الأسر المنتجة بمطابخها الخاصة، ودور زعفران تنظيم الطلب والدفع والتوصيل وضمان جودة التجربة.",
  },
  {
    title: "الحسابات والتسجيل",
    body: "يشترط للتسجيل بيانات صحيحة ورقم جوال فعال، وأنت مسؤول عن سرية كلمة مرورك وعن كل نشاط يتم عبر حسابك. يحق لإدارة زعفران إيقاف أي حساب يخالف هذه الشروط أو يسيء استخدام المنصة.",
  },
  {
    title: "الطلبات والأسعار",
    body: "الأسعار المعروضة تحددها الأسر المنتجة، وتضاف رسوم التوصيل حسب المسافة وتظهر بوضوح قبل تأكيد الطلب. بتأكيدك الطلب تلتزم باستلامه ودفع قيمته. أوقات التحضير تقديرية وقد تختلف حسب طبيعة المنتج البيتي وضغط الطلبات.",
  },
  {
    title: "الإلغاء والاسترجاع",
    body: "يمكن إلغاء الطلب قبل قبول الأسرة المنتجة له. بعد بدء التحضير يعالج الإلغاء حسب الحالة وبالتنسيق مع الدعم. عند وجود خطأ أو نقص بالطلب يرجى إبلاغ الدعم خلال وقت قصير من الاستلام مع ما يثبت الحالة، وسنعالجها بما يحفظ حقك.",
  },
  {
    title: "طبيعة المنتجات البيتية",
    body: "منتجات زعفران بيتية الطابع تعد بأيدي أسر منتجة، وهذا سر تميزها. على العميل التأكد من مكونات المنتج وسؤال الأسرة المنتجة عن أي مكون يخص الحساسية الغذائية قبل الطلب، إذ تقع مسؤولية الإفصاح عن المكونات على الأسرة المنتجة.",
  },
  {
    title: "التزامات الأسر المنتجة",
    body: "تلتزم الأسرة المنتجة بجودة المنتج وسلامته ونظافة إعداده ودقة وصفه وصوره، وبتحضير الطلبات المقبولة في وقتها، وبتحديث حالة مطبخها (متاح/مغلق) بما يعكس جاهزيتها الفعلية. تحتسب المنصة عمولة متفق عليها من قيمة الطلبات مقابل خدماتها.",
  },
  {
    title: "التزامات مناديب التوصيل",
    body: "يلتزم المندوب بالمحافظة على الطلب وسلامته أثناء النقل وإيصاله بأمانة وسرعة لعنوان العميل، وبالتعامل اللائق مع جميع الأطراف. يحصل المندوب على حصته من رسوم التوصيل حسب النسب المعلنة بالمنصة.",
  },
  {
    title: "الأرباح والسحب",
    body: "تقيد أرباح الأسر المنتجة والمناديب بمحافظهم داخل المنصة فور إتمام الطلبات، ويمكن طلب سحبها متى بلغت الحد الأدنى المعلن. تعالج طلبات السحب من الإدارة وتحول للحساب البنكي خلال فترة معقولة.",
  },
  {
    title: "الاستخدام المقبول",
    body: "يحظر استخدام المنصة لأي غرض غير مشروع، أو انتحال صفة الغير، أو نشر محتوى مضلل، أو أي سلوك يضر بالمنصة أو مستخدميها. المخالفة تعرض الحساب للإيقاف أو الحذف مع حفظ حقوق المنصة النظامية.",
  },
  {
    title: "التعديلات",
    body: "يحق لزعفران تحديث هذه الشروط بما يواكب تطور الخدمة، مع التنبيه داخل التطبيق لأي تغيير جوهري. استمرارك باستخدام المنصة بعد التحديث يعد قبولاً بالنسخة المحدثة.",
  },
];

export default function Terms() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Almarai_400Regular, Almarai_700Bold, Almarai_800ExtraBold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={{ width: 38 }} />
        <Text style={s.title}>الشروط والأحكام</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowRight size={20} color="#F2B233" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroRow}>
          <FileText size={20} color="#F2B233" strokeWidth={1.8} />
          <Text style={s.updated}>آخر تحديث: {LAST_UPDATED}</Text>
        </View>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.card}>
            <Text style={s.secTitle}>{i + 1}. {sec.title}</Text>
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