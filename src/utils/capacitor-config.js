/**
 * src/utils/capacitor-config.js — S136 Capacitor config builder.
 *
 * Pure data-model builder that produces a valid `capacitor.config.json`
 * shape for Capacitor v6+ (iOS + Android). No file I/O; caller writes the
 * result with `JSON.stringify`. Designed for the Phase-D7 native-app path.
 */

/** @type {readonly string[]} */
const VALID_APP_ID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/i;

/** @type {readonly string[]} */
export const CAPACITOR_PLATFORMS = /** @type {const} */ (["ios", "android", "web"]);

/**
 * @typedef {object} CapacitorIosConfig
 * @property {string}  [scheme]           - URL scheme for deep links (default: appId)
 * @property {string}  [backgroundColor]  - Hex background shown during launch
 * @property {boolean} [allowsLinkPreview]
 * @property {string[]} [allowNavigation] - Extra origins for WKWebView
 */

/**
 * @typedef {object} CapacitorAndroidConfig
 * @property {string}  [backgroundColor]
 * @property {boolean} [allowMixedContent]
 * @property {string[]} [allowNavigation]
 * @property {boolean} [captureInput]
 * @property {boolean} [webContentsDebuggingEnabled]
 */

/**
 * @typedef {object} CapacitorPluginsConfig
 * @property {{ launchShowDuration?: number, backgroundColor?: string, androidSplashResourceName?: string }} [SplashScreen]
 * @property {{ androidAndIos?: boolean, presentationStyle?: string }} [StatusBar]
 * @property {{ sound?: boolean, vibration?: boolean }} [Haptics]
 * @property {{ requestPermissions?: boolean }} [PushNotifications]
 */

/**
 * @typedef {object} CapacitorAppConfig
 * @property {string}                  appId          - Reverse-domain bundle ID (e.g. "com.example.wedding")
 * @property {string}                  appName        - Display name shown on home screen
 * @property {string}                  [webDir]       - Build output dir (default: "dist")
 * @property {string[]}                [platforms]    - Enabled platforms (default: ["ios","android"])
 * @property {string}                  [server]       - Dev server URL (removed in production builds)
 * @property {CapacitorIosConfig}      [ios]
 * @property {CapacitorAndroidConfig}  [android]
 * @property {CapacitorPluginsConfig}  [plugins]
 */

/**
 * Build a Capacitor configuration object ready to be serialised as
 * `capacitor.config.json`.
 *
 * @param {CapacitorAppConfig} input
 * @returns {{ ok: boolean, config: object|null, errors: string[] }}
 */
export function buildCapacitorConfig(input) {
  /** @type {string[]} */ const errors = [];

  const appId = (input?.appId ?? "").trim();
  const appName = (input?.appName ?? "").trim();
  const webDir = (input?.webDir ?? "dist").trim() || "dist";

  if (!appId) errors.push("appId is required");
  else if (!VALID_APP_ID_RE.test(appId))
    errors.push(`appId "${appId}" must be reverse-domain format with ≥3 segments (e.g. com.example.wedding)`);

  if (!appName) errors.push("appName is required");

  const platforms = (input?.platforms ?? ["ios", "android"]).filter((p) =>
    CAPACITOR_PLATFORMS.includes(p),
  );
  if (platforms.length === 0) errors.push("at least one valid platform is required");

  if (errors.length > 0) return { ok: false, config: null, errors };

  /** @type {Record<string, unknown>} */
  const config = { appId, appName, webDir };

  // Optional dev server (stripped from production shape when absent)
  if (input?.server) config.server = { url: String(input.server) };

  // iOS platform block
  if (platforms.includes("ios")) {
    const ios = input?.ios ?? {};
    /** @type {Record<string, unknown>} */ const iosOut = {};
    if (ios.scheme) iosOut.scheme = String(ios.scheme);
    if (ios.backgroundColor) iosOut.backgroundColor = String(ios.backgroundColor);
    if (typeof ios.allowsLinkPreview === "boolean")
      iosOut.allowsLinkPreview = ios.allowsLinkPreview;
    if (Array.isArray(ios.allowNavigation) && ios.allowNavigation.length > 0)
      iosOut.allowNavigation = ios.allowNavigation.map(String);
    if (Object.keys(iosOut).length > 0) config.ios = iosOut;
  }

  // Android platform block
  if (platforms.includes("android")) {
    const and = input?.android ?? {};
    /** @type {Record<string, unknown>} */ const andOut = {};
    if (and.backgroundColor) andOut.backgroundColor = String(and.backgroundColor);
    if (typeof and.allowMixedContent === "boolean")
      andOut.allowMixedContent = and.allowMixedContent;
    if (typeof and.captureInput === "boolean") andOut.captureInput = and.captureInput;
    if (typeof and.webContentsDebuggingEnabled === "boolean")
      andOut.webContentsDebuggingEnabled = and.webContentsDebuggingEnabled;
    if (Array.isArray(and.allowNavigation) && and.allowNavigation.length > 0)
      andOut.allowNavigation = and.allowNavigation.map(String);
    if (Object.keys(andOut).length > 0) config.android = andOut;
  }

  // Plugins block
  const plugins = input?.plugins;
  if (plugins) {
    /** @type {Record<string, unknown>} */ const pluginsOut = {};
    if (plugins.SplashScreen) pluginsOut.SplashScreen = { ...plugins.SplashScreen };
    if (plugins.StatusBar) pluginsOut.StatusBar = { ...plugins.StatusBar };
    if (plugins.Haptics) pluginsOut.Haptics = { ...plugins.Haptics };
    if (plugins.PushNotifications) pluginsOut.PushNotifications = { ...plugins.PushNotifications };
    if (Object.keys(pluginsOut).length > 0) config.plugins = pluginsOut;
  }

  return { ok: true, config, errors: [] };
}

/**
 * Validate an existing (parsed) `capacitor.config.json` object.
 * Returns the same `{ok, config, errors}` shape.
 *
 * @param {unknown} raw
 * @returns {{ ok: boolean, config: object|null, errors: string[] }}
 */
export function validateCapacitorConfig(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, config: null, errors: ["config must be a non-null object"] };
  }
  const obj = /** @type {Record<string, unknown>} */ (raw);
  return buildCapacitorConfig({
    appId: String(obj.appId ?? ""),
    appName: String(obj.appName ?? ""),
    webDir: obj.webDir ? String(obj.webDir) : "dist",
    server: obj.server ? String(/** @type {Record<string,unknown>}*/(obj.server).url ?? "") : undefined,
    ios: /** @type {CapacitorIosConfig|undefined} */ (obj.ios),
    android: /** @type {CapacitorAndroidConfig|undefined} */ (obj.android),
    plugins: /** @type {CapacitorPluginsConfig|undefined} */ (obj.plugins),
  });
}
