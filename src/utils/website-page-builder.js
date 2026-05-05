/**
 * src/utils/website-page-builder.js — S661 Page composition for website builder
 *
 * Helpers for composing wedding website pages from reusable blocks.
 * Each block has a type, content, and layout position.
 *
 * @module website-page-builder
 * @owner website
 */

let pageCounter = 0;
let blockCounter = 0;

/**
 * Available block types.
 * @type {ReadonlyArray<string>}
 */
export const BLOCK_TYPES = Object.freeze([
  "hero",
  "story",
  "gallery",
  "countdown",
  "rsvp",
  "registry",
  "venue",
  "schedule",
  "faq",
  "footer",
  "text",
  "image",
  "video",
  "map",
  "divider",
]);

/**
 * Reset counters (test helper).
 */
export function resetCounters() {
  pageCounter = 0;
  blockCounter = 0;
}

/**
 * @typedef {object} Block
 * @property {string} id
 * @property {string} type
 * @property {Record<string, unknown>} content
 * @property {number} order
 * @property {boolean} visible
 */

/**
 * @typedef {object} Page
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {Block[]} blocks
 * @property {boolean} published
 * @property {string} createdAt
 */

/**
 * Create a new page.
 *
 * @param {string} title
 * @param {string} [slug]
 * @returns {Page}
 */
export function createPage(title, slug) {
  pageCounter++;
  return {
    id: `page_${pageCounter}`,
    title: title || "Untitled",
    slug: slug ?? slugify(title),
    blocks: [],
    published: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Add a block to a page.
 *
 * @param {Page} page
 * @param {string} type
 * @param {Record<string, unknown>} [content]
 * @returns {Block|null}
 */
export function addBlock(page, type, content = {}) {
  if (!page || !BLOCK_TYPES.includes(type)) return null;
  blockCounter++;
  /** @type {Block} */
  const block = {
    id: `block_${blockCounter}`,
    type,
    content,
    order: page.blocks.length,
    visible: true,
  };
  page.blocks.push(block);
  return block;
}

/**
 * Remove a block from a page.
 *
 * @param {Page} page
 * @param {string} blockId
 * @returns {boolean}
 */
export function removeBlock(page, blockId) {
  if (!page) return false;
  const idx = page.blocks.findIndex((b) => b.id === blockId);
  if (idx === -1) return false;
  page.blocks.splice(idx, 1);
  reorderBlocks(page);
  return true;
}

/**
 * Move a block to a new position.
 *
 * @param {Page} page
 * @param {string} blockId
 * @param {number} newIndex
 * @returns {boolean}
 */
export function moveBlock(page, blockId, newIndex) {
  if (!page) return false;
  const idx = page.blocks.findIndex((b) => b.id === blockId);
  if (idx === -1 || newIndex < 0 || newIndex >= page.blocks.length) return false;

  const [block] = page.blocks.splice(idx, 1);
  page.blocks.splice(newIndex, 0, block);
  reorderBlocks(page);
  return true;
}

/**
 * Toggle block visibility.
 *
 * @param {Page} page
 * @param {string} blockId
 * @returns {boolean}
 */
export function toggleBlockVisibility(page, blockId) {
  if (!page) return false;
  const block = page.blocks.find((b) => b.id === blockId);
  if (!block) return false;
  block.visible = !block.visible;
  return true;
}

/**
 * Publish or unpublish a page.
 *
 * @param {Page} page
 * @param {boolean} [published]
 * @returns {boolean}
 */
export function setPublished(page, published = true) {
  if (!page) return false;
  page.published = published;
  return true;
}

/**
 * Duplicate a page with new IDs.
 *
 * @param {Page} page
 * @returns {Page|null}
 */
export function duplicatePage(page) {
  if (!page) return null;
  const copy = createPage(`${page.title} (copy)`, `${page.slug}-copy`);
  for (const block of page.blocks) {
    addBlock(copy, block.type, { ...block.content });
  }
  return copy;
}

/**
 * Generate a default wedding page with common blocks.
 *
 * @param {string} [coupleName]
 * @returns {Page}
 */
export function defaultWeddingPage(coupleName) {
  const page = createPage(coupleName ?? "Our Wedding");
  addBlock(page, "hero", { heading: page.title, subheading: "We're getting married!" });
  addBlock(page, "countdown", {});
  addBlock(page, "story", { heading: "Our Story" });
  addBlock(page, "venue", { heading: "Venue" });
  addBlock(page, "schedule", { heading: "Schedule" });
  addBlock(page, "gallery", { heading: "Photos" });
  addBlock(page, "rsvp", { heading: "RSVP" });
  addBlock(page, "registry", { heading: "Registry" });
  addBlock(page, "faq", { heading: "FAQ" });
  addBlock(page, "footer", {});
  return page;
}

/**
 * Slugify a title string.
 *
 * @param {string} title
 * @returns {string}
 */
function slugify(title) {
  if (!title) return "untitled";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Re-index block order values after mutation.
 *
 * @param {Page} page
 */
function reorderBlocks(page) {
  for (let i = 0; i < page.blocks.length; i++) {
    page.blocks[i].order = i;
  }
}
