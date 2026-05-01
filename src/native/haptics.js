/**
 * @file Haptics bridge — Capacitor `@capacitor/haptics` on native,
 * `navigator.vibrate` fallback on web. All calls are no-ops when
 * neither is available, so the rest of the app can call them blindly.
 *
 * @owner native-bridge
 */

import { isNative } from "./platform.js";

/** @type {Record<"light" | "medium" | "heavy", number[]>} */
const VIBRATE_PATTERNS = {
  light: [10],
  medium: [25],
  heavy: [50],
};

/**
 * @param {"light" | "medium" | "heavy"} [style]
 * @returns {Promise<void>}
 */
export async function impact(style = "medium") {
  const pattern = VIBRATE_PATTERNS[style] ?? VIBRATE_PATTERNS.medium;
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import(/* @vite-ignore */ "@capacitor/haptics");
      const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: styleMap[style] ?? ImpactStyle.Medium });
      return;
    } catch {
      // fall through to web vibrate
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

/** @returns {Promise<void>} */
export async function notificationSuccess() {
  if (isNative()) {
    try {
      const { Haptics, NotificationType } = await import(/* @vite-ignore */ "@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([10, 30, 10]);
  }
}

/** @returns {Promise<void>} */
export async function selectionChanged() {
  if (isNative()) {
    try {
      const { Haptics } = await import(/* @vite-ignore */ "@capacitor/haptics");
      await Haptics.selectionChanged();
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(5);
  }
}
