/**
 * S434: REST API key management utility.
 * Generates, stores, and revokes a local API key in localStorage.
 * Key is crypto.randomUUID-based and stored under the standard prefix.
 */

const STORAGE_KEY = "wedding_v1_api_key";

/**
 * Generate a new API key and persist it.
 * @returns {string} The newly generated key
 */
export function generateApiKey() {
  const key = `wk_${crypto.randomUUID().replace(/-/g, "")}`;
  localStorage.setItem(STORAGE_KEY, key);
  return key;
}

/**
 * Return the stored API key, or null if none.
 * @returns {string|null}
 */
export function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Revoke (delete) the stored API key.
 */
export function revokeApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage disabled — ignore
  }
}
