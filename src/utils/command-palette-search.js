/**
 * src/utils/command-palette-search.js — S600 Cmd-K command palette helpers
 *
 * Pure helpers backing the upcoming next-gen command palette: a tiny
 * fuzzy matcher and a keyboard-navigation reducer. No DOM access; the
 * legacy palette in `src/utils/command-palette.js` will adopt these
 * helpers in a follow-up sprint.
 *
 * @owner ux
 */

/**
 * @typedef {object} Command
 * @property {string} id
 * @property {string} label
 * @property {string=} keywords
 * @property {string=} section
 * @property {string=} shortcut
 */

/**
 * Compute a fuzzy match score for `query` against `target`. Higher is
 * better; `0` means "no match". Empty query returns `1` so callers can
 * treat it as "everything matches".
 *
 * @param {string} target
 * @param {string} query
 * @returns {number}
 */
export function fuzzyScore(target, query) {
  if (typeof target !== "string" || typeof query !== "string") return 0;
  if (query === "") return 1;
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === 0) return 1000 + (100 - Math.min(99, target.length));
  if (idx > 0) return 500 - idx;
  let score = 0;
  let ti = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    score += 10 - Math.min(9, found - ti);
    ti = found + 1;
  }
  return Math.max(1, score);
}

/**
 * Search a command list. Returns commands sorted by score desc, ties
 * broken by label ascending. Empty query returns the original order.
 *
 * @param {readonly Command[]} commands
 * @param {string} query
 * @returns {Command[]}
 */
export function searchCommands(commands, query) {
  if (!Array.isArray(commands)) return [];
  if (!query) return [...commands];
  return commands
    .map((c) => ({ c, s: fuzzyScore(`${c.label} ${c.keywords ?? ""} ${c.section ?? ""}`, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.c.label.localeCompare(b.c.label))
    .map((x) => x.c);
}

/** @typedef {{ index: number, total: number }} PaletteState */

/**
 * Pure reducer for keyboard navigation inside the palette.
 *
 * @param {PaletteState} state
 * @param {{ type: "up"|"down"|"home"|"end"|"setTotal", total?: number }} action
 * @returns {PaletteState}
 */
export function paletteReducer(state, action) {
  const total = action.type === "setTotal" ? Math.max(0, action.total ?? 0) : state.total;
  if (total === 0) return { index: 0, total: 0 };
  switch (action.type) {
    case "up":
      return { ...state, total, index: (state.index - 1 + total) % total };
    case "down":
      return { ...state, total, index: (state.index + 1) % total };
    case "home":
      return { ...state, total, index: 0 };
    case "end":
      return { ...state, total, index: total - 1 };
    case "setTotal":
      return { total, index: Math.min(state.index, total - 1) };
    default:
      return state;
  }
}
