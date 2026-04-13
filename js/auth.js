'use strict';

/* ── Authentication ── */
/* ── Auth Functions ── */

/** Decode a JSON Web Token payload without a library (base64url → JSON) */
function decodeJwt(token) {
  try {
    let b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bytes = atob(b64);
    const pct = bytes.split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('');
    return JSON.parse(decodeURIComponent(pct));
  } catch (_e) { return null; }
}

/** Called by Google Identity Services after the user selects their Google account */
function handleGoogleCredential(response) {
  const payload = decodeJwt(response.credential);
  if (!payload || !payload.email) { showToast(t('auth_subtitle')); return; }
  _authUser = {
    name:      payload.name        || '',
    firstName: payload.given_name  || '',
    lastName:  payload.family_name || '',
    email:     payload.email,
    picture:   payload.picture     || '',
    isAdmin:   ADMIN_EMAILS.includes(payload.email),
    provider:  'google',
  };
  save('auth', {
    name: _authUser.name, email: _authUser.email,
    picture: _authUser.picture, isAdmin: _authUser.isAdmin, provider: 'google',
  });
  onAuthSuccess();
}

/**
 * Facebook Sign-In — requires setup:
 *   1. https://developers.facebook.com → My Apps → Create App → Consumer
 *   2. Add "Facebook Login" product; set Valid OAuth Redirect URIs to your domain
 *   3. Load Facebook SDK in HTML (see Facebook JS SDK docs)
 *   4. FB.init({ appId: 'YOUR_APP_ID', version: 'v19.0', cookie: true })
 *   5. Replace alert below with FB.login(cb, { scope: 'public_profile,email' })
 */
function loginFacebook() {
  alert(t('auth_fb_not_configured'));
}

/**
 * Apple Sign-In — requires setup:
 *   1. Apple Developer account → Certificates, IDs & Profiles → Services IDs
 *   2. Register Service ID, enable Sign In with Apple, set Return URLs
 *   3. Load Apple Sign-In JS SDK in HTML (see Apple developer docs)
 *   4. AppleID.auth.init({ clientId: 'YOUR_SERVICE_ID', scope: 'name email', ... })
 *   5. Replace alert below with AppleID.auth.signIn()
 */
function loginApple() {
  alert(t('auth_apple_not_configured'));
}

/** Continue as a guest: shows RSVP only, no pre-fill */
function loginGuest() {
  _authUser = { name: '', firstName: '', lastName: '', email: '', picture: '', isAdmin: false, provider: 'guest' };
  onAuthSuccess();
}

/** Sign out and return to the login screen */
function signOut() {
  _authUser = null;
  save('auth', null);
  // Revoke Sheets token
  if (_sheetsToken && typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(_sheetsToken, function() {});
  }
  _sheetsToken = null;
  _sheetsTokenClient = null;
  if (typeof window.google !== 'undefined' && window.google.accounts) {
    window.google.accounts.id.disableAutoSelect();
  }
  document.body.classList.remove('guest-mode');
  document.getElementById('userBarGroup').style.display = 'none';
  showAuthOverlay();
}

function showAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('auth-hidden');
  if (typeof window.google !== 'undefined' && window.google.accounts) {
    initGoogleSignIn();
  }
}

function hideAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('auth-hidden');
}

function updateUserBar() {
  const group = document.getElementById("userBarGroup");
  const nameEl = document.getElementById("userDisplayName");
  const avatar = document.getElementById("userAvatar");
  const badge = document.getElementById("userRoleBadge");
  const btnOut = document.getElementById("btnSignOut");
  const btnIn = document.getElementById("btnSignIn");
  if (!group || !_authUser) return;
  group.style.display = "flex";
  const isAnon = _authUser.provider === "guest";
  if (_authUser.picture) {
    avatar.src = _authUser.picture;
    avatar.style.display = "inline";
  } else {
    avatar.style.display = "none";
  }
  nameEl.textContent = _authUser.name || t("role_guest");
  badge.textContent = _authUser.isAdmin
    ? "\ud83d\udc51 " + t("role_admin")
    : t("role_guest");
  badge.className =
    "user-role-chip " + (_authUser.isAdmin ? "role-admin" : "role-guest");
  // Show sign-out for authenticated users, sign-in for anonymous guests
  if (btnOut) btnOut.style.display = isAnon ? "none" : "";
  if (btnIn) btnIn.style.display = isAnon ? "" : "none";
}

function applyUserLevel() {
  if (!_authUser) return;
  if (_authUser.isAdmin) {
    document.body.classList.remove("guest-mode");
    showSection("dashboard");
  } else {
    document.body.classList.add("guest-mode");
    const fn = document.getElementById("rsvpFirstName");
    const ln = document.getElementById("rsvpLastName");
    if (fn && !fn.value && _authUser.firstName) fn.value = _authUser.firstName;
    if (ln && !ln.value && _authUser.lastName) ln.value = _authUser.lastName;
    showSection("rsvp");
  }
}

function onAuthSuccess() {
  hideAuthOverlay();
  updateUserBar();
  applyUserLevel();
  // Request Sheets OAuth2 token for admin users signed in with Google
  if (_authUser && _authUser.isAdmin && _authUser.provider === "google") {
    requestSheetsAccess();
  }
}

function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE")) {
    console.warn(
      "Wedding Manager: Set GOOGLE_CLIENT_ID in index.html to enable Google Sign-In. See comments for setup steps.",
    );
    return;
  }
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: false,
  });
  const btnEl = document.getElementById("googleSignInBtn");
  if (btnEl) {
    window.google.accounts.id.renderButton(btnEl, {
      theme: "filled_black",
      size: "large",
      shape: "rectangular",
      width: 280,
      locale: _currentLang === "he" ? "iw" : "en",
    });
  }
  if (!_authUser) window.google.accounts.id.prompt();
}

function initAuth() {
  const saved = load("auth");
  if (saved && saved.email) {
    const parts = (saved.name || "").split(" ");
    _authUser = {
      name: saved.name || "",
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      email: saved.email,
      picture: saved.picture || "",
      isAdmin: saved.isAdmin || false,
      provider: saved.provider || "google",
    };
    hideAuthOverlay();
    updateUserBar();
    applyUserLevel();
  } else {
    // No saved auth — auto-enter as anonymous guest (RSVP only)
    loginGuest();
  }
  if (typeof window.google !== "undefined" && window.google.accounts) {
    initGoogleSignIn();
  }
  // If GIS script not yet loaded, window.onGoogleLibraryLoad (below) handles it
}

/* ── Init ── */
