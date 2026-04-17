/**
 * src/services/contact-dedup.js — Sprint 136
 *
 * Detect and merge duplicate guest contacts by phone or name similarity.
 */

/**
 * @typedef {{ id: string, firstName: string, lastName: string,
 *   phone?: string, email?: string }} ContactRecord
 * @typedef {{ a: string, b: string, reason: string, score: number }} DuplicatePair
 */

/**
 * Normalise a phone for comparison: digits only.
 * @param {string | undefined} phone
 * @returns {string}
 */
function _normalisePhone(phone) {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "").replace(/^0/, "972");
}

/**
 * Compute Jaro-Winkler similarity (simplified: Jaro only) between two strings.
 * Returns 0–1 where 1 = identical.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function jaroSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  if (matchWindow < 0) return 0;

  const aMatches = Array(a.length).fill(false);
  const bMatches = Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - matchWindow);
    const hi = Math.min(b.length - 1, i + matchWindow);
    for (let j = lo; j <= hi; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
}

/**
 * Find potential duplicate contacts.
 * @param {ContactRecord[]} contacts
 * @param {{ phoneThreshold?: number, nameThreshold?: number }} [opts]
 * @returns {DuplicatePair[]}
 */
export function findDuplicates(contacts, { phoneThreshold = 1, nameThreshold = 0.92 } = {}) {
  /** @type {DuplicatePair[]} */
  const pairs = [];
  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];

      // Phone match
      const pa = _normalisePhone(a.phone);
      const pb = _normalisePhone(b.phone);
      if (pa && pb && pa === pb) {
        pairs.push({ a: a.id, b: b.id, reason: "phone", score: phoneThreshold });
        continue;
      }

      // Name similarity
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      const score = jaroSimilarity(nameA, nameB);
      if (score >= nameThreshold) {
        pairs.push({ a: a.id, b: b.id, reason: "name", score });
      }
    }
  }
  return pairs;
}

/**
 * Merge contact B into contact A (A wins for non-empty fields).
 * @param {ContactRecord} primary
 * @param {ContactRecord} secondary
 * @returns {ContactRecord}
 */
export function mergeContacts(primary, secondary) {
  return {
    ...secondary,
    ...primary,
    phone: primary.phone || secondary.phone,
    email: primary.email || secondary.email,
  };
}
