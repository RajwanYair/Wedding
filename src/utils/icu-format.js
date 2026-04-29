/**
 * src/utils/icu-format.js — S118 minimal ICU MessageFormat subset.
 *
 * Supports the patterns we actually use in he/en/ar locales:
 *   - {var}                          — plain interpolation
 *   - {n, plural, =0{...} one{...} other{# ...}}
 *   - {gender, select, female{...} male{...} other{...}}
 *
 * Designed as a zero-dep replacement for `intl-messageformat`. Locale-aware
 * plural categories use `Intl.PluralRules`. Unknown patterns fall back to
 * the literal string so we never break the UI.
 */

const _pluralCache = new Map();
function pluralCategory(/** @type {string} */ locale, /** @type {number} */ n) {
  const key = locale || "en";
  let pr = _pluralCache.get(key);
  if (!pr) {
    pr = new Intl.PluralRules(key);
    _pluralCache.set(key, pr);
  }
  return pr.select(n);
}

/**
 * Format an ICU-lite message.
 *
 * @param {string} pattern
 * @param {Record<string, unknown>} vars
 * @param {string} [locale]
 * @returns {string}
 */
export function formatMessage(pattern, vars = {}, locale = "en") {
  if (typeof pattern !== "string" || pattern.length === 0) return "";
  let i = 0;
  let out = "";
  while (i < pattern.length) {
    const ch = pattern[i] ?? "";
    if (ch !== "{") {
      out += ch;
      i++;
      continue;
    }
    const close = findMatchingBrace(pattern, i);
    if (close === -1) {
      out += pattern.slice(i);
      break;
    }
    const inside = pattern.slice(i + 1, close);
    out += renderPlaceholder(inside, vars, locale);
    i = close + 1;
  }
  return out;
}

function findMatchingBrace(/** @type {string} */ s, /** @type {number} */ start) {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function renderPlaceholder(/** @type {string} */ inside, /** @type {Record<string,unknown>} */ vars, /** @type {string} */ locale) {
  // Three forms:
  //   "name"
  //   "n, plural, =0{...} one{...} other{...}"
  //   "g, select, female{...} other{...}"
  const commaIdx = indexOfTopLevelComma(inside);
  if (commaIdx === -1) {
    const v = vars[inside.trim()];
    return v == null ? "" : String(v);
  }
  const argName = inside.slice(0, commaIdx).trim();
  const rest = inside.slice(commaIdx + 1).trim();
  const typeIdx = indexOfTopLevelComma(rest);
  if (typeIdx === -1) return `{${inside}}`;
  const type = rest.slice(0, typeIdx).trim();
  const cases = parseCases(rest.slice(typeIdx + 1).trim());
  const argVal = vars[argName];

  if (type === "plural") {
    const n = Number(argVal);
    const exact = cases.get(`=${n}`);
    if (exact != null) return formatMessage(exact.replace(/#/g, String(n)), vars, locale);
    const cat = pluralCategory(locale, n);
    const branch = cases.get(cat) ?? cases.get("other") ?? "";
    return formatMessage(branch.replace(/#/g, String(n)), vars, locale);
  }
  if (type === "select") {
    const branch = cases.get(String(argVal)) ?? cases.get("other") ?? "";
    return formatMessage(branch, vars, locale);
  }
  return `{${inside}}`;
}

function indexOfTopLevelComma(/** @type {string} */ s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") depth--;
    else if (s[i] === "," && depth === 0) return i;
  }
  return -1;
}

function parseCases(/** @type {string} */ s) {
  /** @type {Map<string, string>} */
  const map = new Map();
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i] ?? "")) i++;
    let nameEnd = i;
    while (nameEnd < s.length && s[nameEnd] !== "{" && !/\s/.test(s[nameEnd] ?? "")) nameEnd++;
    const name = s.slice(i, nameEnd);
    i = nameEnd;
    while (i < s.length && /\s/.test(s[i] ?? "")) i++;
    if (s[i] !== "{") break;
    const close = findMatchingBrace(s, i);
    if (close === -1) break;
    map.set(name, s.slice(i + 1, close));
    i = close + 1;
  }
  return map;
}
