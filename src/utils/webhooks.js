/**
 * S441: Webhook subscription management.
 * Stores webhook endpoints in localStorage; supports add, list, remove, and ping.
 * @owner sections
 */

const STORAGE_KEY = "wedding_v1_webhooks";

/** @typedef {{ id: string, url: string, events: string[], createdAt: string }} Webhook */

/** @returns {Webhook[]} */
function _load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** @param {Webhook[]} list */
function _save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* storage disabled */ }
}

/**
 * Add a new webhook subscription.
 * @param {{ url: string, events: string[] }} opts
 * @returns {Webhook}
 */
export function addWebhook({ url, events }) {
  const list = _load();
  const entry = { id: crypto.randomUUID(), url, events, createdAt: new Date().toISOString() };
  list.push(entry);
  _save(list);
  return entry;
}

/**
 * Return all registered webhooks.
 * @returns {Webhook[]}
 */
export function listWebhooks() {
  return _load();
}

/**
 * Remove a webhook by id.
 * @param {string} id
 */
export function removeWebhook(id) {
  _save(_load().filter((w) => w.id !== id));
}

/**
 * Send a test POST to a webhook URL.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function pingWebhook(id) {
  const webhook = _load().find((w) => w.id === id);
  if (!webhook) return false;
  try {
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "ping", timestamp: new Date().toISOString() }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
