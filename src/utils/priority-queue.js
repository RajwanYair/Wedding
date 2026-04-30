/**
 * Binary min-heap priority queue.  Pure: `compare(a, b)` returns negative
 * when `a` should come out first.  Default compare orders by `priority`.
 */

/**
 * @template T
 * @typedef {(a: T, b: T) => number} Compare
 */

/**
 * @template T
 * @param {{ compare?: Compare<T> }} [opts]
 */
export function createPriorityQueue(opts = {}) {
  /** @type {T[]} */
  const heap = [];
  const compare =
    opts.compare ??
    (
      /** @type {Compare<any>} */
      (a, b) => (a?.priority ?? 0) - (b?.priority ?? 0)
    );

  return {
    /** @param {T} value */
    push(value) {
      heap.push(value);
      bubbleUp(heap, heap.length - 1, compare);
    },
    /** @returns {T | undefined} */
    pop() {
      if (heap.length === 0) return undefined;
      const top = heap[0];
      const last = heap.pop();
      if (heap.length > 0 && last !== undefined) {
        heap[0] = last;
        bubbleDown(heap, 0, compare);
      }
      return top;
    },
    /** @returns {T | undefined} */
    peek() {
      return heap[0];
    },
    get size() {
      return heap.length;
    },
    clear() {
      heap.length = 0;
    },
    toArray() {
      return [...heap];
    },
  };
}

/**
 * @template T
 * @param {T[]} h
 * @param {number} idx
 * @param {Compare<T>} cmp
 */
function bubbleUp(h, idx, cmp) {
  let i = idx;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (cmp(h[i], h[parent]) < 0) {
      [h[i], h[parent]] = [h[parent], h[i]];
      i = parent;
    } else break;
  }
}

/**
 * @template T
 * @param {T[]} h
 * @param {number} idx
 * @param {Compare<T>} cmp
 */
function bubbleDown(h, idx, cmp) {
  let i = idx;
  for (;;) {
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let best = i;
    if (l < h.length && cmp(h[l], h[best]) < 0) best = l;
    if (r < h.length && cmp(h[r], h[best]) < 0) best = r;
    if (best === i) break;
    [h[i], h[best]] = [h[best], h[i]];
    i = best;
  }
}
