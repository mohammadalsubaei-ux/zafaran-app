import { Redirect } from "expo-router";

// شاشة المعجنات المستقلة كانت فاضية ومكررة — التصنيف الفعلي مبني بالكامل
// بشاشة categories.tsx، فنكتفي بتوجيه أي دخول قديم لهذا المسار مباشرة إليها.
export default function PastriesScreen() {
  return <Redirect href="/(tabs)/categories?category=pastries" />;
}