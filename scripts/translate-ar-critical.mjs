// scripts/translate-ar-critical.mjs — one-off helper for S117.
// Translates the most-visible UI keys in src/i18n/ar.json to Arabic.
// Other keys remain as English fallback until future sprints translate them.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const path = join(__dir, "..", "src", "i18n", "ar.json");
const data = JSON.parse(readFileSync(path, "utf8"));

const ar = {
  app_title: "مدير الزفاف",
  app_subtitle: "نظام إدارة فعالية الزفاف",
  nav_dashboard: "لوحة التحكم",
  nav_guests: "الضيوف",
  nav_tables: "الطاولات",
  nav_invitation: "الدعوة",
  nav_whatsapp: "واتساب",
  nav_rsvp: "تأكيد الحضور",
  nav_settings: "الإعدادات",
  stat_total: "إجمالي المدعوين",
  stat_confirmed: "مؤكدون",
  stat_pending: "بانتظار الرد",
  stat_declined: "اعتذروا",
  stat_maybe: "ربما",
  stat_guests: "ضيوف",
  stat_tables: "طاولات",
  stat_seated: "تم الإجلاس",
  stat_groom_side: "ضيوف العريس",
  stat_bride_side: "ضيوف العروس",
  stat_vegetarian: "نباتي/نباتي صرف",
  stat_accessibility: "تسهيلات للوصول",
  stat_transport: "وسيلة نقل",
  progress_title: "تقدم تأكيد الحضور",
  progress_confirmed: "مؤكدون",
  progress_sent: "دعوات مُرسَلة",
  progress_unsent: "لم تُرسَل",
  charts_title: "إحصائيات الضيوف",
  analytics_title: "إحصائيات تفصيلية",
  chart_total: "الإجمالي",
  chart_guests: "ضيوف",
};

let count = 0;
for (const [k, v] of Object.entries(ar)) {
  if (k in data) {
    data[k] = v;
    count++;
  }
}
writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`S117: translated ${count} critical keys to Arabic in ${path}`);
