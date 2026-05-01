/**
 * @file Capacitor platform detection + safe wrappers.
 * Web stays as the default; native bridges are dynamically imported only
 * when running inside iOS / Android Capacitor shells.
 *
 * @owner native-bridge
 */

/** @returns {boolean} true when running inside a Capacitor (iOS/Android) shell */
export function isNative() {
  if (typeof globalThis === "undefined") return false;
  const cap = /** @type {{ Capacitor?: { isNativePlatform?: () => boolean } }} */ (globalThis).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** @returns {"ios" | "android" | "web"} */
export function platform() {
  if (typeof globalThis === "undefined") return "web";
  const cap = /** @type {{ Capacitor?: { getPlatform?: () => string } }} */ (globalThis).Capacitor;
  const p = cap?.getPlatform?.() ?? "web";
  return /** @type {"ios" | "android" | "web"} */ (p);
}

/** @returns {boolean} */
export const isIOS = () => platform() === "ios";
/** @returns {boolean} */
export const isAndroid = () => platform() === "android";
/** @returns {boolean} */
export const isWeb = () => platform() === "web";
