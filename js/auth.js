// @ts-check
"use strict";

/* ── Authentication (email-allowlist — no OAuth required) ── */

/** Returns true when the email has full admin rights (hardcoded or approved via Settings) */
function isApprovedAdmin(email) {
  if (!email) return false;
  return (
    window.ADMIN_EMAILS.includes(email) ||
    window._approvedEmails.includes(email)
  );
}

function loadAuthConfig() {
  const stored = window.load("auth_config");
  if (!stored) return;
  window._approvedEmails = Array.isArray(stored.approvedEmails)
    ? stored.approvedEmails.slice()
    : [];
}

function saveAuthConfig() {
  window.save("auth_config", { approvedEmails: window._approvedEmails });
}

/* ─── Email-based sign-in (no OAuth) ───────────────────────────────── */

/** Admin sessions expire after 8 hours of inactivity */
const _SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Sessions are silently rotated every 2 hours to refresh the stored timestamp */
const _SESSION_ROTATION_MS = 2 * 60 * 60 * 1000;

/** Max failed login attempts before a 5-minute lockout */
const _MAX_LOGIN_ATTEMPTS = 5;
const _LOGIN_LOCKOUT_MS = 5 * 60 * 1000;

/** Rotate the session token (refresh expiresAt) if it is due */
function _maybeRotateSession() {
  const user = window._authUser;
  if (!user || !user.isAdmin || !user.email) return;
  const now = Date.now();
  /* Rotate when less than (TTL - ROTATION_MS) remain — i.e. every ~2 h */
  const age = (user.expiresAt || 0) - now;
  if (age > 0 && age < _SESSION_TTL_MS - _SESSION_ROTATION_MS) {
    user.expiresAt = now + _SESSION_TTL_MS;
    window.save("auth", {
      name: user.name,
      email: user.email,
      picture: user.picture || "",
      isAdmin: true,
      provider: user.provider,
      expiresAt: user.expiresAt,
    });
  }
}

function _loginAttemptOk() {
  const raw = localStorage.getItem(`${window.STORAGE_PREFIX}loginFail`) || "{}";
  let rec;
  try {
    rec = JSON.parse(raw);
  } catch (_e) {
    rec = {};
  }
  const now = Date.now();
  /* Reset counter if lockout window has passed */
  if (now - (rec.since || 0) >= _LOGIN_LOCKOUT_MS) return true;
  return (rec.count || 0) < _MAX_LOGIN_ATTEMPTS;
}

function _recordLoginFailure() {
  const raw = localStorage.getItem(`${window.STORAGE_PREFIX}loginFail`) || "{}";
  let rec;
  try {
    rec = JSON.parse(raw);
  } catch (_e) {
    rec = {};
  }
  const now = Date.now();
  if (now - (rec.since || 0) >= _LOGIN_LOCKOUT_MS) {
    rec = { count: 1, since: now };
  } else {
    rec.count = (rec.count || 0) + 1;
  }
  localStorage.setItem(
    `${window.STORAGE_PREFIX}loginFail`,
    JSON.stringify(rec),
  );
}

function _clearLoginFailures() {
  localStorage.removeItem(`${window.STORAGE_PREFIX}loginFail`);
}

/**
 * Sign in via email allowlist check — no password, no OAuth.
 * The user enters their email; if it matches window.ADMIN_EMAILS or window._approvedEmails
 * they receive full manager access immediately.
 */
function submitEmailLogin() {
  if (!_loginAttemptOk()) {
    window.showToast(window.t("auth_login_locked"), "error");
    return;
  }
  const inp = document.getElementById("adminLoginEmail");
  if (!inp) return;
  const email = window.sanitizeInput(inp.value, 254).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.showToast(window.t("toast_email_invalid"), "error");
    return;
  }
  if (!isApprovedAdmin(email)) {
    _recordLoginFailure();
    window.showToast(window.t("auth_email_not_approved"), "warning");
    return;
  }
  _clearLoginFailures();
  const displayName = email.split("@")[0];
  window._authUser = {
    name: displayName,
    firstName: displayName,
    lastName: "",
    email,
    picture: "",
    isAdmin: true,
    provider: "email",
    expiresAt: Date.now() + _SESSION_TTL_MS,
  };
  window.save("auth", {
    name: displayName,
    email,
    picture: "",
    isAdmin: true,
    provider: "email",
    expiresAt: window._authUser.expiresAt,
  });
  inp.value = "";
  onAuthSuccess();
}

/* ─── OAuth (Google · Facebook · Apple) ─────────────────────────────
   Each provider calls _oauthLogin(email, name, picture, provider).
   The email is checked against the allowlist — no parallel auth path.
   ─────────────────────────────────────────────────────────────────── */

function _oauthLogin(email, name, picture, provider) {
  if (!email) {
    window.showToast(window.t("auth_oauth_no_email"), "error");
    return;
  }
  const lc = email.toLowerCase();
  if (!isApprovedAdmin(lc)) {
    window.showToast(window.t("auth_email_not_approved"), "warning");
    return;
  }
  _clearLoginFailures();
  const parts = (name || lc.split("@")[0]).split(" ");
  window._authUser = {
    name: name || parts[0],
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
    email: lc,
    picture: picture || "",
    isAdmin: true,
    provider,
    expiresAt: Date.now() + _SESSION_TTL_MS,
  };
  window.save("auth", {
    name: window._authUser.name,
    email: lc,
    picture: window._authUser.picture,
    isAdmin: true,
    provider,
    expiresAt: window._authUser.expiresAt,
  });
  window.logAudit("login", `${lc} (${provider})`);
  onAuthSuccess();
}

/* ── Google Sign-In (GIS SDK) ── */

/** Called by the GIS library after load (set on window) */
function handleGoogleCredential(response) {
  if (!response || !response.credential) {
    window.showToast(window.t("auth_oauth_no_email"), "error");
    return;
  }
  /* Decode the JWT payload — no verification needed (server side not applicable here) */
  const parts = response.credential.split(".");
  if (parts.length < 2) {
    window.showToast(window.t("auth_oauth_no_email"), "error");
    return;
  }
  let payload;
  try {
    payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch (_e) {
    window.showToast(window.t("auth_oauth_no_email"), "error");
    return;
  }
  _oauthLogin(
    payload.email,
    payload.name || "",
    payload.picture || "",
    "google",
  );
}

function initGoogleSignIn() {
  if (!window.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID.startsWith("YOUR_"))
    return;
  /* google.accounts.id available after GIS SDK loads */
  if (typeof google === "undefined" || !google.accounts) return;
  google.accounts.id.initialize({
    client_id: window.GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  const btn = document.getElementById("googleSignInBtn");
  if (btn) {
    google.accounts.id.renderButton(btn, {
      theme: "outline",
      size: "large",
      width: 280,
      locale: window._currentLang === "he" ? "he" : "en",
    });
  }
}

/* ── Facebook Sign-In (FB JS SDK) ── */

function loadFBSDK() {
  if (!window.FB_APP_ID || document.getElementById("fb-jssdk")) return;
  window.fbAsyncInit = function () {
    /* global FB */
    FB.init({
      appId: window.FB_APP_ID,
      cookie: true,
      xfbml: false,
      version: "v20.0",
    });
  };
  const s = document.createElement("script");
  s.id = "fb-jssdk";
  s.src = "https://connect.facebook.net/en_US/sdk.js";
  s.defer = true;
  document.head.appendChild(s);
}

function loginFacebook() {
  if (!window.FB_APP_ID) {
    window.showToast(window.t("auth_oauth_not_configured"), "warning");
    return;
  }
  if (typeof FB === "undefined") {
    window.showToast(window.t("auth_oauth_not_configured"), "warning");
    return;
  }
  FB.login(
    function (resp) {
      if (resp.authResponse) {
        FB.api("/me", { fields: "name,email,picture" }, function (user) {
          _oauthLogin(
            user.email,
            user.name,
            user.picture && user.picture.data ? user.picture.data.url : "",
            "facebook",
          );
        });
      }
    },
    { scope: "public_profile,email" },
  );
}

/* ── Apple Sign-In ── */

function loadAppleSDK() {
  if (!window.APPLE_SERVICE_ID || document.getElementById("apple-signin-sdk"))
    return;
  const s = document.createElement("script");
  s.id = "apple-signin-sdk";
  s.src =
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
  s.defer = true;
  document.head.appendChild(s);
}

function loginApple() {
  if (!window.APPLE_SERVICE_ID) {
    window.showToast(window.t("auth_oauth_not_configured"), "warning");
    return;
  }
  if (typeof AppleID === "undefined") {
    window.showToast(window.t("auth_oauth_not_configured"), "warning");
    return;
  }
  AppleID.auth.init({
    clientId: window.APPLE_SERVICE_ID,
    scope: "name email",
    redirectURI: location.origin + location.pathname,
    usePopup: true,
  });
  AppleID.auth
    .signIn()
    .then(function (data) {
      const id = data.authorization && data.authorization.id_token;
      if (!id) {
        window.showToast(window.t("auth_oauth_no_email"), "error");
        return;
      }
      let payload;
      try {
        payload = JSON.parse(
          atob(id.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        );
      } catch (_e) {
        window.showToast(window.t("auth_oauth_no_email"), "error");
        return;
      }
      const nameObj = data.user && data.user.name;
      const name = nameObj
        ? `${nameObj.firstName || ""} ${nameObj.lastName || ""}`.trim()
        : "";
      _oauthLogin(payload.email, name, "", "apple");
    })
    .catch(function (_err) {
      /* User closed popup — silently ignore */
    });
}

/** Continue anonymously: shows RSVP only */
function loginGuest() {
  window._authUser = {
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    picture: "",
    isAdmin: false,
    provider: "guest",
  };
  onAuthSuccess();
}

/** Sign out — return to guest mode */
function signOut() {
  const wasEmail = window._authUser ? window._authUser.email || "" : "";
  window._authUser = null;
  window.save("auth", null);
  if (wasEmail) window.logAudit("logout", wasEmail);
  document.body.classList.remove("guest-mode");
  document.getElementById("userBarGroup").style.display = "none";
  loginGuest();
}

function showAuthOverlay() {
  const overlay = document.getElementById("authOverlay");
  if (overlay) overlay.classList.remove("auth-hidden");
  /* Auto-focus the email input */
  const inp = document.getElementById("adminLoginEmail");
  if (inp)
    setTimeout(function () {
      inp.focus();
    }, 50);
}

function hideAuthOverlay() {
  const overlay = document.getElementById("authOverlay");
  if (overlay) overlay.classList.add("auth-hidden");
}

function updateUserBar() {
  const group = document.getElementById("userBarGroup");
  const nameEl = document.getElementById("userDisplayName");
  const avatar = document.getElementById("userAvatar");
  const badge = document.getElementById("userRoleBadge");
  const btnOut = document.getElementById("btnSignOut");
  const btnIn = document.getElementById("btnSignIn");
  if (!group || !window._authUser) return;
  group.style.display = "flex";
  const isAnon = window._authUser.provider === "guest";
  if (window._authUser.picture) {
    avatar.src = window._authUser.picture;
    avatar.style.display = "inline";
  } else {
    avatar.style.display = "none";
  }
  nameEl.textContent = window._authUser.name || window.t("role_guest");
  badge.textContent = window._authUser.isAdmin
    ? `\ud83d\udc51 ${window.t("role_admin")}`
    : window.t("role_guest");
  badge.className = `user-role-chip ${
    window._authUser.isAdmin ? "role-admin" : "role-guest"
  }`;
  if (btnOut) btnOut.style.display = isAnon ? "none" : "";
  if (btnIn) btnIn.style.display = isAnon ? "" : "none";
}

function applyUserLevel() {
  if (!window._authUser) return;
  if (window._authUser.isAdmin) {
    document.body.classList.remove("guest-mode");
    window.showSection("dashboard");
  } else {
    document.body.classList.add("guest-mode");
    const fn = document.getElementById("rsvpFirstName");
    const ln = document.getElementById("rsvpLastName");
    if (fn && !fn.value && window._authUser.firstName)
      fn.value = window._authUser.firstName;
    if (ln && !ln.value && window._authUser.lastName)
      ln.value = window._authUser.lastName;
    window.showSection("landing");
  }
}

function onAuthSuccess() {
  hideAuthOverlay();
  updateUserBar();
  applyUserLevel();
}

function initAuth() {
  /* Load approved emails BEFORE evaluating isAdmin */
  loadAuthConfig();

  const saved = window.load("auth");
  if (saved && saved.email) {
    /* Enforce session TTL: if the session has expired, log out silently */
    if (saved.expiresAt && Date.now() > saved.expiresAt) {
      window.save("auth", null);
      loginGuest();
      return;
    }
    const parts = (saved.name || "").split(" ");
    /* Re-evaluate isAdmin against current approved list (may have changed since last login) */
    const isAdmin = isApprovedAdmin(saved.email);
    window._authUser = {
      name: saved.name || "",
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      email: saved.email,
      picture: "",
      isAdmin,
      provider: saved.provider || "email",
      expiresAt: saved.expiresAt || Date.now() + _SESSION_TTL_MS,
    };
    /* Persist corrected isAdmin so the next load is also correct */
    window.save("auth", {
      name: window._authUser.name,
      email: window._authUser.email,
      picture: "",
      isAdmin,
      provider: window._authUser.provider,
      expiresAt: window._authUser.expiresAt,
    });
    hideAuthOverlay();
    updateUserBar();
    applyUserLevel();
    /* Start rotation interval (checks every 15 min, rotates if due) */
    setInterval(_maybeRotateSession, 15 * 60 * 1000);
  } else {
    loginGuest();
  }
}

/* ─────────────────────────────────────────────────────────────────────
   User Access Management (called from Settings section)
   ───────────────────────────────────────────────────────────────────── */

/** Add an email to the approved admin list */
function addApprovedEmail() {
  const inp = document.getElementById("newApproveEmail");
  if (!inp) return;
  const email = inp.value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    window.showToast(window.t("toast_email_invalid"), "error");
    return;
  }
  if (
    window._approvedEmails.includes(email) ||
    window.ADMIN_EMAILS.includes(email)
  ) {
    window.showToast(window.t("toast_email_exists"), "warning");
    return;
  }
  window._approvedEmails.push(email);
  saveAuthConfig();
  inp.value = "";
  renderUserManager();
  window.showToast(window.t("toast_email_approved"), "success");
}

/** Remove an email from the approved admin list */
function removeApprovedEmail(email) {
  window._approvedEmails = window._approvedEmails.filter(function (e) {
    return e !== email;
  });
  saveAuthConfig();
  renderUserManager();
  window.showToast(window.t("toast_email_removed"), "info");
}

/** Render the User Access Management card content (called when settings section opens) */
function renderUserManager() {
  const listEl = document.getElementById("approvedEmailsList");
  if (!listEl) return;
  listEl.replaceChildren();

  /* Hardcoded root admins — shown read-only */
  window.ADMIN_EMAILS.forEach(function (email) {
    const row = _buildEmailRow(email, true);
    listEl.appendChild(row);
  });

  /* Dynamic approved emails */
  if (window._approvedEmails.length === 0) {
    const none = document.createElement("p");
    none.style.cssText =
      "font-size:0.8rem; color:var(--text-muted); margin:0.3rem 0;";
    none.textContent = window.t("user_mgr_none");
    listEl.appendChild(none);
  } else {
    window._approvedEmails.forEach(function (email) {
      const row = _buildEmailRow(email, false);
      listEl.appendChild(row);
    });
  }
}

function _buildEmailRow(email, readonly) {
  const row = document.createElement("div");
  row.style.cssText =
    "display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0; border-bottom:1px solid var(--glass-border); font-size:0.83rem;";
  const icon = document.createElement("span");
  icon.textContent = readonly ? "👑" : "✅";
  const lbl = document.createElement("span");
  lbl.style.cssText = "flex:1; color:var(--text-primary);";
  lbl.textContent = email;
  row.appendChild(icon);
  row.appendChild(lbl);
  if (!readonly) {
    const btn = document.createElement("button");
    btn.className = "btn btn-danger btn-small";
    btn.style.cssText = "padding:0.15rem 0.5rem; font-size:0.75rem;";
    btn.textContent = "✕";
    btn.setAttribute("aria-label", `${window.t("user_mgr_remove")} ${email}`);
    btn.onclick = function () {
      removeApprovedEmail(email);
    };
    row.appendChild(btn);
  }
  return row;
}
