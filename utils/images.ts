// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  أداة الصور الموحدة لمنصة زعفران
//  شروط الرفع (تُفرض تلقائياً — البائع يصور بجواله والنظام يتكفل):
//  - صور فقط (يرفض أي ملف آخر من المصدر)
//  - تصغير إجباري: أقصى عرض 1200 بكسل
//  - ضغط إجباري: JPEG بجودة 70%
//  النتيجة: صورة جوال 4-12 ميجا تنزل لحدود 150-400 كيلوبايت
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

const SUPA_URL = "https://gnmsakxtdwgkvaajktco.supabase.co";
const SUPA_KEY = "sb_publishable_VpziBJN-IvDQzJGjwbJvsg_AUBG3K41";

export const MAX_IMAGE_WIDTH = 1200;
export const IMAGE_QUALITY = 0.7;

// ━━━ التقاط صورة من المعرض + ضغط إجباري ━━━
// options.crop: قص تفاعلي بنسبة محددة (لصور الوجبات 4:3) — الشهادات بدون قص
// ترجع رابط الصورة المضغوطة محلياً، أو null عند الإلغاء/الرفض/الفشل
// لا يوجد مسار يمرر الصورة الأصلية بدون ضغط — الشرط إجباري
export async function pickCompressedImage(
  options?: { crop?: [number, number] }
): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("الإذن مطلوب", "نحتاج الوصول للصور حتى تتمكن من الرفع.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: !!options?.crop,
    ...(options?.crop ? { aspect: options.crop } : {}),
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: MAX_IMAGE_WIDTH } }],
      { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulated.uri;
  } catch {
    Alert.alert("تعذر معالجة الصورة", "جرب صورة أخرى.");
    return null;
  }
}

// ━━━ رفع صورة مضغوطة إلى باكت في Supabase Storage ━━━
// bucket: menu-images | certificates
// prefix: بادئة اسم الملف (menu | cert)
// ترجع الرابط العام للصورة، أو null عند الفشل
export async function uploadImageToBucket(
  bucket: string,
  prefix: string,
  uri: string
): Promise<string | null> {
  try {
    const fileName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}.jpg`;

    const formData = new FormData();
    formData.append("file", { uri, name: fileName, type: "image/jpeg" } as any);

    const res = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY, "x-upsert": "true" },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.log("[upload-debug] bucket:", bucket, "| status:", res.status, "| body:", errBody);
      return null;
    }
    return `${SUPA_URL}/storage/v1/object/public/${bucket}/${fileName}`;
  } catch (e: any) {
    console.log("[upload-debug] network error:", e?.message || String(e));
    return null;
  }
}
