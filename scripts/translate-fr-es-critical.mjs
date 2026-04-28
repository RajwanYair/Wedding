// scripts/translate-fr-es-critical.mjs — S202: translate critical UI keys for fr + es.
// Fills the most-visible empty keys with proper translations.
// Only overwrites keys that are currently empty in the target file.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dir, "..", "src", "i18n");

// ── French translations ─────────────────────────────────────────────────────
const fr = {
  charts_title: "Analyses des invités",
  analytics_rsvp_title: "Statut RSVP",
  analytics_side_title: "Répartition par côté",
  analytics_meal_title: "Préférences de repas",
  analytics_sent_title: "Statut des invitations",
  analytics_headcount_title: "Résumé des effectifs",
  analytics_confirmed_heads: "Effectif confirmé : {n}",
  analytics_total_guests: "Total des enregistrements : {n}",
  analytics_adults: "Adultes",
  analytics_children: "Enfants",
  analytics_total_heads: "Total des convives",
  analytics_confirmed_count: "Convives confirmés",
  analytics_access_count: "Besoins d'accessibilité",
  chart_rsvp_title: "Statut RSVP",
  chart_meal_title: "Préférences de repas",
  chart_side_title: "Répartition par côté",
  chart_total: "Total",
  chart_guests: "Invités",
  analytics_heatmap_title: "Carte thermique côté/table",
  analytics_funnel_title: "Entonnoir RSVP",
  action_add_guest: "Ajouter un invité",
  action_add_table: "Ajouter une table",
  action_save: "Enregistrer",
  action_cancel: "Annuler",
  action_delete: "Supprimer",
  action_edit: "Modifier",
  action_close: "Fermer",
  action_confirm: "Confirmer",
  action_decline: "Décliner",
  btn_export: "Exporter",
  btn_import: "Importer",
  budget_save: "Enregistrer",
  guests_title: "Liste des invités",
  tables_title: "Tables",
  rsvp_title: "RSVP",
  rsvp_name_label: "Nom",
  rsvp_phone_label: "Téléphone",
  rsvp_submit: "Envoyer le RSVP",
  rsvp_confirm: "Confirmer la présence",
  rsvp_decline: "Décliner l'invitation",
  rsvp_found: "Invité trouvé !",
  rsvp_not_found: "Invité introuvable. Vérifiez votre numéro.",
  rsvp_success: "Votre réponse a été enregistrée.",
  toast_saved: "Enregistré avec succès",
  toast_deleted: "Supprimé avec succès",
  toast_error: "Une erreur est survenue",
  toast_copied: "Copié !",
  error_required: "Ce champ est obligatoire",
  error_invalid_phone: "Numéro de téléphone invalide",
  checkin_scan: "Scanner",
  checkin_manual: "Manuel",
  search_guests: "Rechercher des invités…",
  filter_all: "Tous",
  filter_confirmed: "Confirmés",
  filter_declined: "Déclinés",
  filter_pending: "En attente",
  col_name: "Nom",
  col_phone: "Téléphone",
  col_status: "Statut",
  col_table: "Table",
  col_side: "Côté",
  col_guests_count: "Invités",
  label_guest_count: "Nombre d'invités",
  label_guest_table: "Table",
  label_venue_address: "Adresse",
  countdown_days: "jours",
  wedding_date_label: "Date du mariage",
};

// ── Spanish translations ────────────────────────────────────────────────────
const es = {
  charts_title: "Análisis de invitados",
  analytics_rsvp_title: "Estado RSVP",
  analytics_side_title: "Distribución por lado",
  analytics_meal_title: "Preferencias de comida",
  analytics_sent_title: "Estado de invitaciones",
  analytics_headcount_title: "Resumen de asistentes",
  analytics_confirmed_heads: "Asistentes confirmados: {n}",
  analytics_total_guests: "Total de registros: {n}",
  analytics_adults: "Adultos",
  analytics_children: "Niños",
  analytics_total_heads: "Total de asistentes",
  analytics_confirmed_count: "Asistentes confirmados",
  analytics_access_count: "Necesidades de accesibilidad",
  chart_rsvp_title: "Estado RSVP",
  chart_meal_title: "Preferencias de comida",
  chart_side_title: "Distribución por lado",
  chart_total: "Total",
  chart_guests: "Invitados",
  analytics_heatmap_title: "Mapa de calor lado/mesa",
  analytics_funnel_title: "Embudo RSVP",
  action_add_guest: "Añadir invitado",
  action_add_table: "Añadir mesa",
  action_save: "Guardar",
  action_cancel: "Cancelar",
  action_delete: "Eliminar",
  action_edit: "Editar",
  action_close: "Cerrar",
  action_confirm: "Confirmar",
  action_decline: "Rechazar",
  btn_export: "Exportar",
  btn_import: "Importar",
  budget_save: "Guardar",
  guests_title: "Lista de invitados",
  tables_title: "Mesas",
  rsvp_title: "RSVP",
  rsvp_name_label: "Nombre",
  rsvp_phone_label: "Teléfono",
  rsvp_submit: "Enviar RSVP",
  rsvp_confirm: "Confirmar asistencia",
  rsvp_decline: "Rechazar invitación",
  rsvp_found: "¡Invitado encontrado!",
  rsvp_not_found: "Invitado no encontrado. Verifique su número.",
  rsvp_success: "Su respuesta ha sido registrada.",
  toast_saved: "Guardado correctamente",
  toast_deleted: "Eliminado correctamente",
  toast_error: "Se ha producido un error",
  toast_copied: "¡Copiado!",
  error_required: "Este campo es obligatorio",
  error_invalid_phone: "Número de teléfono inválido",
  checkin_scan: "Escanear",
  checkin_manual: "Manual",
  search_guests: "Buscar invitados…",
  filter_all: "Todos",
  filter_confirmed: "Confirmados",
  filter_declined: "Rechazados",
  filter_pending: "Pendientes",
  col_name: "Nombre",
  col_phone: "Teléfono",
  col_status: "Estado",
  col_table: "Mesa",
  col_side: "Lado",
  col_guests_count: "Invitados",
  label_guest_count: "Número de invitados",
  label_guest_table: "Mesa",
  label_venue_address: "Dirección",
  countdown_days: "días",
  wedding_date_label: "Fecha de la boda",
};

function patch(file, translations) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  let count = 0;
  for (const [k, v] of Object.entries(translations)) {
    if (k in data && (data[k] === "" || data[k] === null)) {
      data[k] = v;
      count++;
    }
  }
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return count;
}

const frCount = patch(join(i18nDir, "fr.json"), fr);
const esCount = patch(join(i18nDir, "es.json"), es);
console.log(`S202: translated ${frCount} keys in fr.json, ${esCount} keys in es.json`);
