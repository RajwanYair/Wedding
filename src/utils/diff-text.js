/**
 * Line-level text diff using LCS (longest common subsequence) backtracking.
 * Produces a sequence of {type, value} ops where type ∈ {"equal", "add",
 * "remove"}.  Suitable for change-review UIs.
 *
 * @typedef {object} DiffOp
 * @property {"equal" | "add" | "remove"} type
 * @property {string} value
 */

/**
 * Diff two strings line-by-line.
 *
 * @param {string} a
 * @param {string} b
 * @returns {DiffOp[]}
 */
export function diffLines(a, b) {
  const aLines = splitLines(a);
  const bLines = splitLines(b);
  const m = aLines.length;
  const n = bLines.length;

  // LCS length matrix
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (aLines[i] === bLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  /** @type {DiffOp[]} */
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) {
      ops.push({ type: "equal", value: aLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", value: aLines[i] });
      i += 1;
    } else {
      ops.push({ type: "add", value: bLines[j] });
      j += 1;
    }
  }
  while (i < m) {
    ops.push({ type: "remove", value: aLines[i] });
    i += 1;
  }
  while (j < n) {
    ops.push({ type: "add", value: bLines[j] });
    j += 1;
  }
  return ops;
}

/**
 * Render diff ops as a unified-diff style string with `+`/`-`/` ` prefixes.
 *
 * @param {DiffOp[]} ops
 * @returns {string}
 */
export function renderUnified(ops) {
  return ops
    .map((op) => {
      const prefix = op.type === "add" ? "+" : op.type === "remove" ? "-" : " ";
      return `${prefix}${op.value}`;
    })
    .join("\n");
}

/**
 * Count additions / removals.
 *
 * @param {DiffOp[]} ops
 * @returns {{added: number, removed: number, equal: number}}
 */
export function diffStats(ops) {
  let added = 0;
  let removed = 0;
  let equal = 0;
  for (const op of ops) {
    if (op.type === "add") added += 1;
    else if (op.type === "remove") removed += 1;
    else equal += 1;
  }
  return { added, removed, equal };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function splitLines(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  return text.split(/\r?\n/);
}
