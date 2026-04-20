/**
 * src/utils/search-index.js
 * Client-side full-text search index for guests and vendors.
 * Pure data / string processing — no DOM, no network.
 *
 * @module search-index
 */

// ── Normalisation ──────────────────────────────────────────────────────────

/**
 * Normalises a search query: lowercase, collapse whitespace, trim.
 * @param {string} query
 * @returns {string}
 */
export function normalizeSearchQuery(query) {
  if (typeof query !== "string") return "";
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Tokenises a string into lowercase words (strips punctuation).
 * @param {string} text
 * @returns {string[]}
 */
function tokenise(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// ── Index operations ───────────────────────────────────────────────────────

/**
 * Creates an empty search index.
 * @returns {{ docs: Map<string, object>, tokens: Map<string, Set<string>> }}
 */
export function createIndex() {
  return {
    docs: new Map(),
    tokens: new Map(), // token → Set of docIds
  };
}

/**
 * Indexes a single document. If a document with the same id already exists it is replaced.
 * @param {{ docs: Map, tokens: Map }} index
 * @param {{ id: string, [key: string]: unknown }} doc
 * @param {string[]} [fields] - field names to index; defaults to all string-valued fields
 * @returns {void}
 */
export function indexDocument(index, doc, fields) {
  if (!index || !doc || typeof doc.id === "undefined") return;

  // Remove old tokens if re-indexing
  removeDocument(index, String(doc.id));

  const id = String(doc.id);
  index.docs.set(id, doc);

  const targetFields = fields ?? Object.keys(doc).filter((k) => k !== "id");
  const words = new Set();

  for (const field of targetFields) {
    const val = doc[field];
    if (typeof val === "string") {
      for (const token of tokenise(val)) {
        words.add(token);
      }
    }
  }

  for (const token of words) {
    if (!index.tokens.has(token)) {
      index.tokens.set(token, new Set());
    }
    index.tokens.get(token).add(id);
  }
}

/**
 * Indexes multiple documents at once.
 * @param {{ docs: Map, tokens: Map }} index
 * @param {object[]} docs
 * @param {string[]} [fields]
 * @returns {void}
 */
export function indexDocuments(index, docs, fields) {
  if (!Array.isArray(docs)) return;
  for (const doc of docs) {
    indexDocument(index, doc, fields);
  }
}

/**
 * Removes a document from the index.
 * @param {{ docs: Map, tokens: Map }} index
 * @param {string} id
 * @returns {void}
 */
export function removeDocument(index, id) {
  if (!index || !index.docs.has(String(id))) return;

  const docId = String(id);
  index.docs.delete(docId);

  for (const [token, set] of index.tokens) {
    set.delete(docId);
    if (set.size === 0) {
      index.tokens.delete(token);
    }
  }
}

// ── Search ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, score: number, doc: object }} SearchResult
 */

/**
 * Searches the index for documents matching the query.
 * Returns results ranked by score (most matching tokens first).
 * @param {{ docs: Map, tokens: Map }} index
 * @param {string} query
 * @returns {SearchResult[]}
 */
export function searchIndex(index, query) {
  if (!index || !query) return [];

  const normalised = normalizeSearchQuery(query);
  if (!normalised) return [];

  const queryTokens = tokenise(normalised);
  if (queryTokens.length === 0) return [];

  // Count how many query tokens each doc matches
  const scores = new Map(); // docId → matchCount

  for (const token of queryTokens) {
    // Exact token match
    if (index.tokens.has(token)) {
      for (const docId of index.tokens.get(token)) {
        scores.set(docId, (scores.get(docId) ?? 0) + 1);
      }
    }
    // Prefix match: token is prefix of an indexed word
    for (const [indexedToken, docSet] of index.tokens) {
      if (indexedToken !== token && indexedToken.startsWith(token)) {
        for (const docId of docSet) {
          scores.set(docId, (scores.get(docId) ?? 0) + 0.5);
        }
      }
    }
  }

  const results = [];
  for (const [docId, score] of scores) {
    results.push({ id: docId, score, doc: index.docs.get(docId) });
  }

  return rankResults(results);
}

/**
 * Ranks search results by descending score, then ascending id for stable sort.
 * @param {SearchResult[]} results
 * @returns {SearchResult[]}
 */
export function rankResults(results) {
  if (!Array.isArray(results)) return [];
  return [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.id).localeCompare(String(b.id));
  });
}

// ── Domain builders ────────────────────────────────────────────────────────

/**
 * Builds and returns an index pre-loaded with guest documents.
 * Indexes: name, phone, tableId, notes, group, side.
 * @param {object[]} guests
 * @returns {{ docs: Map, tokens: Map }}
 */
export function buildGuestIndex(guests) {
  const idx = createIndex();
  indexDocuments(idx, guests, ["name", "phone", "tableId", "notes", "group", "side"]);
  return idx;
}

/**
 * Builds and returns an index pre-loaded with vendor documents.
 * Indexes: name, category, contact, notes, status.
 * @param {object[]} vendors
 * @returns {{ docs: Map, tokens: Map }}
 */
export function buildVendorIndex(vendors) {
  const idx = createIndex();
  indexDocuments(idx, vendors, ["name", "category", "contact", "notes", "status"]);
  return idx;
}

// ── Highlight helper ───────────────────────────────────────────────────────

/**
 * Returns the text with matching query tokens wrapped in `<mark>` tags.
 * Operates on a plain string; callers must set innerHTML safely (use with textContent pipeline).
 * @param {string} text
 * @param {string} query
 * @returns {string}
 */
export function highlightMatches(text, query) {
  if (!text || !query) return text ?? "";

  const normalised = normalizeSearchQuery(query);
  const tokens = tokenise(normalised);
  if (tokens.length === 0) return text;

  // Escape tokens for regex use
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}
