import { Redirect } from "expo-router";

// شاشة الحلويات المستقلة كانت فاضية ومكررة — التصنيف الفعلي مبني بالكامل
// بشاشة categories.tsx، فنكتفي بتوجيه أي دخول قديم لهذا المسار مباشرة إليها.
export default function SweetsScreen() {
  return <Redirect href="/(tabs)/categories?category=sweets" />;
}