#!/usr/bin/env node
// Temporary script to sync i18n key parity
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const I18N = join(__dir, "..", "src", "i18n");

const toAdd_he = {
  "followup_days_ago": "לפני {days} ימים",
  "followup_today": "היום",
  "noshow_confirmed": "אישרו",
  "noshow_note": "מבוסס על תזמון האישור ודפוסים היסטוריים",
  "noshow_none": "אין מספיק נתונים",
  "noshow_low": "נמוך",
  "noshow_high": "גבוה",
  "suggest_table_title": "הצעות שיבוץ לשולחנות",
  "suggest_table_empty": "אין הצעות — כל האורחים שובצו או אין שולחנות פנויים",
  "suggest_table_apply": "החל הצעות",
  "suggest_table_applied": "{n} הצעות הוחלו",
  "plural_guests": "{count, plural, =0 {אין אורחים} one {אורח אחד} two {שני אורחים} few {# אורחים} many {# אורחים} other {# אורחים}}",
  "plural_tables": "{count, plural, =0 {אין שולחנות} one {שולחן אחד} two {שני שולחנות} few {# שולחנות} many {# שולחנות} other {# שולחנות}}",
  "plural_days": "{count, plural, =0 {היום} one {יום אחד} two {יומיים} few {# ימים} many {# ימים} other {# ימים}}",
  "plural_children": "{count, plural, =0 {אין ילדים} one {ילד אחד} two {שני ילדים} few {# ילדים} many {# ילדים} other {# ילדים}}",
  "plural_vendors": "{count, plural, =0 {אין ספקים} one {ספק אחד} two {שני ספקים} few {# ספקים} many {# ספקים} other {# ספקים}}",
  "plural_items": "{count, plural, =0 {אין פריטים} one {פריט אחד} two {שני פריטים} few {# פריטים} many {# פריטים} other {# פריטים}}",
  "wa_reminder_schedule": "תזמן תזכורת",
  "wa_reminder_scheduled_for": "תזכורת מתוזמנת ל-{date}",
  "wa_reminder_cancel_schedule": "בטל תזמון",
  "wa_reminder_queue_empty": "אין תזכורות מתוזמנות",
  "wa_thankyou_progress": "שולח... {sent}/{total}",
  "wa_thankyou_via_api": "שלח תודה דרך API",
  "email_send_invitation": "שלח הזמנה במייל",
  "email_send_reminder": "שלח תזכורת במייל",
  "email_send_thankyou": "שלח תודה במייל",
  "email_subject_invitation": "{groom} ו-{bride} — הזמנה לחתונה",
  "email_subject_reminder": "תזכורת: אישור הגעה לחתונה",
  "email_subject_thankyou": "תודה — {groom} ו-{bride}",
  "funnel_clicked": "לחץ על קישור",
  "funnel_started": "התחיל מילוי",
  "pdf_summary": "דוח סיכום PDF"
};

const toAdd_en = {
  "followup_days_ago": "{days} days ago",
  "followup_today": "Today",
  "noshow_confirmed": "Confirmed",
  "noshow_note": "Based on RSVP timing and historical patterns",
  "noshow_none": "Not enough data",
  "noshow_low": "Low",
  "noshow_high": "High",
  "suggest_table_title": "Table Assignment Suggestions",
  "suggest_table_empty": "No suggestions — all guests assigned or no available tables",
  "suggest_table_apply": "Apply Suggestions",
  "suggest_table_applied": "{n} suggestions applied",
  "plural_guests": "{count, plural, =0 {no guests} one {1 guest} other {# guests}}",
  "plural_tables": "{count, plural, =0 {no tables} one {1 table} other {# tables}}",
  "plural_days": "{count, plural, =0 {today} one {1 day} other {# days}}",
  "plural_children": "{count, plural, =0 {no children} one {1 child} other {# children}}",
  "plural_vendors": "{count, plural, =0 {no vendors} one {1 vendor} other {# vendors}}",
  "plural_items": "{count, plural, =0 {no items} one {1 item} other {# items}}",
  "wa_reminder_schedule": "Schedule Reminder",
  "wa_reminder_scheduled_for": "Reminder scheduled for {date}",
  "wa_reminder_cancel_schedule": "Cancel Schedule",
  "wa_reminder_queue_empty": "No scheduled reminders",
  "wa_thankyou_progress": "Sending... {sent}/{total}",
  "wa_thankyou_via_api": "Send Thank-You via API",
  "email_send_invitation": "Send Invitation Email",
  "email_send_reminder": "Send Reminder Email",
  "email_send_thankyou": "Send Thank-You Email",
  "email_subject_invitation": "{groom} & {bride} — Wedding Invitation",
  "email_subject_reminder": "Reminder: RSVP for Wedding",
  "email_subject_thankyou": "Thank You — {groom} & {bride}",
  "funnel_clicked": "Clicked link",
  "funnel_started": "Started filling",
  "pdf_summary": "PDF Summary Report"
};

const toAdd_ar = {
  "user_mgr_none": "لم يتم إضافة مسؤولين. أضف بريدًا إلكترونيًا للمنح.",
  "user_mgr_remove": "إزالة الوصول",
  "noshow_actual_expected": "المتوقع الحضور",
  "noshow_late_rsvp": "تأكيد متأخر",
  "noshow_on_time": "في الوقت المحدد",
  "suggest_same_side": "نفس الجهة",
  "suggest_same_group": "نفس المجموعة",
  "suggest_same_meal": "تفضيل طعام مماثل",
  "suggest_best_fit": "مقعد متاح",
  "ics_wedding_title": "حفل الزفاف"
};

const toAdd_ru = {
  "user_mgr_none": "Нет добавленных администраторов. Добавьте email для разрешения.",
  "user_mgr_remove": "Удалить доступ",
  "noshow_actual_expected": "Ожидается присутствие",
  "noshow_late_rsvp": "Поздний RSVP",
  "noshow_on_time": "Вовремя",
  "suggest_same_side": "Та же сторона",
  "suggest_same_group": "Та же группа",
  "suggest_same_meal": "Похожие предпочтения в еде",
  "suggest_best_fit": "Свободное место",
  "ics_wedding_title": "Свадьба"
};

for (const [locale, additions] of [["he", toAdd_he], ["en", toAdd_en], ["ar", toAdd_ar], ["ru", toAdd_ru]]) {
  const filePath = join(I18N, `${locale}.json`);
  const existing = JSON.parse(readFileSync(filePath, "utf8"));
  Object.assign(existing, additions);
  writeFileSync(filePath, JSON.stringify(existing, null, 4), "utf8");
  console.log(`Updated ${locale}.json: added ${Object.keys(additions).length} keys`);
}
