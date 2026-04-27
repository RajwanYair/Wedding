/**
 * src/services/oauth-providers.js — Unified OAuth provider abstraction (S94)
 *
 * Each section's auth UI calls a single entrypoint:
 *
 *     await signInWith("google" | "facebook" | "apple")
 *
 * The implementation chooses the right pathway:
 *   - Facebook  → always Supabase Auth redirect (S93 dropped the JS SDK)
 *   - Google    → Google Identity Services (GIS) when `window.google` is
 *                 present, else Supabase Auth redirect
 *   - Apple     → AppleID JS when `window.AppleID` is present, else Supabase
 *
 * This is a non-breaking layer on top of the existing direct calls. Once the
 * Supabase backend flip lands (S96), all three providers will route through
 * Supabase and the SDK branches become dead code.
 */

/** @typedef {'google' | 'facebook' | 'apple'} OAuthProvider */

/**
 * @typedef {object} OAuthProfile
 * @property {string} email
 * @property {string} name
 * @property {string} [picture]
 * @property {OAuthProvider} provider
 */

/**
 * Returns the loaded SDK detection result for diagnostics.
 * @returns {{ google: boolean, apple: boolean, facebook: boolean }}
 */
export function detectInstalledSdks() {
  /** @type {any} */
  const w = typeof window === "undefined" ? {} : window;
  return {
    google: typeof w.google?.accounts?.id?.prompt === "function",
    apple: typeof w.AppleID?.auth?.signIn === "function",
    // S93: FB SDK is removed; always false.
    facebook: false,
  };
}

/**
 * Determine which transport will be used for `provider` if the user signs in
 * right now. Useful for telemetry and showing the correct loading UI.
 * @param {OAuthProvider} provider
 * @returns {"sdk" | "supabase"}
 */
export function preferredTransport(provider) {
  if (provider === "facebook") return "supabase";
  const sdks = detectInstalledSdks();
  if (provider === "google") return sdks.google ? "sdk" : "supabase";
  if (provider === "apple") return sdks.apple ? "sdk" : "supabase";
  return "supabase";
}

/**
 * Initiate the OAuth flow for `provider`. Returns a promise that resolves once
 * the SDK round-trip completes; for the Supabase redirect path, the page
 * navigates away and the promise never resolves.
 *
 * The legacy callback-style flows in `main.js` continue to work — this helper
 * is offered as a typed alternative for new callsites.
 *
 * @param {OAuthProvider} provider
 * @returns {Promise<OAuthProfile | null>}
 */
export async function signInWith(provider) {
  const transport = preferredTransport(provider);
  if (transport === "supabase") {
    const { signInWithProvider } = await import("./supabase-auth.js");
    signInWithProvider(provider);
    // Redirect-based flow: the function does not resolve to a profile.
    return null;
  }
  /** @type {any} */
  const w = window;
  if (provider === "apple") {
    const resp = await w.AppleID.auth.signIn();
    const email = resp?.user?.email ?? "";
    const name = `${resp?.user?.name?.firstName ?? ""} ${resp?.user?.name?.lastName ?? ""}`.trim();
    return { email, name, provider };
  }
  if (provider === "google") {
    return new Promise((resolve, reject) => {
      try {
        w.google.accounts.id.prompt((/** @type {any} */ notification) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            resolve(null);
          }
        });
        // Google credential listener is wired in main.js; this is a transport
        // detection helper. New callsites should adopt the One-Tap flow once
        // the credential listener is folded into this module.
        resolve(null);
      } catch (err) {
        reject(err);
      }
    });
  }
  return null;
}
