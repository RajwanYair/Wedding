/**
 * src/utils/ab-test.js — Sprint 135
 *
 * A/B test assignment utility.
 * Deterministically assigns a user/guest to a variant using a hash of the key.
 */

/**
 * Simple deterministic hash (djb2).
 * @param {string} str
 * @returns {number}
 */
function _hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h);
}

/**
 * @typedef {{ name: string, weight: number }} Variant
 */

/**
 * Assign a subject (user/guest id) to a variant based on experiment name.
 * Assignment is deterministic: same subject + experiment = same variant.
 *
 * @param {string} subject      Subject identifier (user id etc.)
 * @param {string} experiment   Experiment name
 * @param {Variant[]} variants  Must have weights summing to 100
 * @returns {string}            Variant name
 */
export function assignVariant(subject, experiment, variants) {
  if (!variants || variants.length === 0) throw new Error("variants required");
  const totalWeight = variants.reduce((s, v) => s + v.weight, 0);
  if (totalWeight <= 0) throw new Error("Total weight must be > 0");

  const hash = _hash(`${experiment}:${subject}`) % totalWeight;
  let acc = 0;
  for (const v of variants) {
    acc += v.weight;
    if (hash < acc) return v.name;
  }
  return variants[variants.length - 1].name;
}

/**
 * Check if a subject is in a given variant for an experiment.
 * @param {string} subject
 * @param {string} experiment
 * @param {string} variantName
 * @param {Variant[]} variants
 * @returns {boolean}
 */
export function isInVariant(subject, experiment, variantName, variants) {
  return assignVariant(subject, experiment, variants) === variantName;
}

/**
 * Check if a feature is enabled for a subject (50/50 rollout).
 * @param {string} subject
 * @param {string} featureName
 * @param {number} [rolloutPercent=50]
 * @returns {boolean}
 */
export function isFeatureEnabled(subject, featureName, rolloutPercent = 50) {
  const variants = [
    { name: "enabled",  weight: rolloutPercent },
    { name: "disabled", weight: 100 - rolloutPercent },
  ];
  return assignVariant(subject, featureName, variants) === "enabled";
}
