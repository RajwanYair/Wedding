'use strict';

/* ── Authentication ── */

/** Returns true when the email has full admin rights (hardcoded or approved via Settings) */
function isApprovedAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email) || _approvedEmails.includes(email);
}

/* ─── Runtime config helpers (localStorage overrides static constants) ─── */
function getRuntimeClientId()    { return _runtimeAuthConfig.googleClientId  || GOOGLE_CLIENT_ID;    }
function getRuntimeFBAppId()     { return _runtimeAuthConfig.fbAppId          || FB_APP_ID;           }
function getRuntimeAppleServiceId() { return _runtimeAuthConfig.appleServiceId || APPLE_SERVICE_ID;   }

function loadAuthConfig() {
  const stored = load('auth_config');
  if (!stored) return;
  _approvedEmails = Array.isArray(stored.approvedEmails) ? stored.approvedEmails.slice() : [];
  _runtimeAuthConfig = {
    googleClientId:  stored.googleClientId  || '',
    fbAppId:         stored.fbAppId         || '',
    appleServiceId:  stored.appleServiceId  || '',
  };
}

function saveAuthConfig() {
  save('auth_config', {
    approvedEmails:  _approvedEmails,
    googleClientId:  _runtimeAuthConfig.googleClientId,
    fbAppId:         _runtimeAuthConfig.fbAppId,
    appleServiceId:  _runtimeAuthConfig.appleServiceId,
  });
}

/* ─── Dynamic SDK loading ───────────────────────────────────────────── */

/** Dynamically inject the Facebook JS SDK and initialise FB.init when appId is known */
function loadFBSDK(appId) {
  if (!appId) return;
  if (typeof FB !== 'undefined') {
    /* Already loaded — just (re-)init with the current App ID */
    FB.init({ appId: appId, cookie: true, xfbml: false, version: 'v22.0' });
    return;
  }
  window.fbAsyncInit = function() {
    FB.init({ appId: appId, cookie: true, xfbml: false, version: 'v22.0' });
  };
  if (!document.getElementById('facebook-jssdk')) {
    const js = document.createElement('script');
    js.id  = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.head.appendChild(js);
  }
}

/** Dynamically inject the Apple Sign-In JS SDK and call AppleID.auth.init */
function loadAppleSDK(serviceId) {
  if (!serviceId) return;
  const initApple = function() {
    if (typeof AppleID !== 'undefined') {
      AppleID.auth.init({
        clientId:    serviceId,
        scope:       'name email',
        redirectURI: window.location.origin + window.location.pathname,
        usePopup:    true,
      });
    }
  };
  if (typeof AppleID !== 'undefined') {
    initApple();
    return;
  }
  if (!document.getElementById('apple-jssdk')) {
    const js = document.createElement('script');
    js.id     = 'apple-jssdk';
    js.src    = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    js.onload = initApple;
    document.head.appendChild(js);
  }
}

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
  if (!payload || !payload.email) { showToast(t('auth_error'), 'error'); return; }
  _authUser = {
    name:      payload.name        || '',
    firstName: payload.given_name  || '',
    lastName:  payload.family_name || '',
    email:     payload.email,
    picture:   payload.picture     || '',
    isAdmin:   isApprovedAdmin(payload.email),
    provider:  'google',
  };
  save('auth', {
    name: _authUser.name, email: _authUser.email,
    picture: _authUser.picture, isAdmin: _authUser.isAdmin, provider: 'google',
  });
  onAuthSuccess();
}

/**
 * Facebook Sign-In via Facebook JavaScript SDK (JS SDK v22+).
 * Setup:
 *   1. https://developers.facebook.com → My Apps → Create App → Consumer
 *   2. Add "Facebook Login for Business" product
 *   3. Settings → Basic: set App Domains to rajwanyair.github.io
 *   4. Facebook Login → Settings: add  https://rajwanyair.github.io/Wedding  as Valid OAuth Redirect URI
 *   5. Set FB_APP_ID in config.js; the SDK is loaded asynchronously in index.html
 */
function loginFacebook() {
  const appId = getRuntimeFBAppId();
  if (!appId) {
    showToast(t('auth_fb_not_configured'), 'warning');
    return;
  }
  if (typeof FB === 'undefined') {
    /* SDK not yet loaded — inject it, then retry after a short delay */
    loadFBSDK(appId);
    showToast(t('auth_loading_sdk'), 'info');
    setTimeout(loginFacebook, 2500);
    return;
  }
  FB.login(function(res) {
    if (res.authResponse) {
      FB.api('/me', { fields: 'name,email,picture' }, function(me) {
        _authUser = {
          name:      me.name  || '',
          firstName: (me.name || '').split(' ')[0] || '',
          lastName:  (me.name || '').split(' ').slice(1).join(' ') || '',
          email:     me.email || '',
          picture:   me.picture && me.picture.data ? me.picture.data.url : '',
          isAdmin:   isApprovedAdmin(me.email || ''),
          provider:  'facebook',
        };
        save('auth', {
          name: _authUser.name, email: _authUser.email,
          picture: _authUser.picture, isAdmin: _authUser.isAdmin, provider: 'facebook',
        });
        onAuthSuccess();
      });
    }
  }, { scope: 'public_profile,email' });
}

/**
 * Apple Sign-In via Apple JS SDK.
 * Setup:
 *   1. Apple Developer account → Certificates, IDs & Profiles → Services IDs
 *   2. Register Service ID (e.g. com.rajwanyair.wedding), enable Sign In with Apple
 *   3. Configure: Return URLs → https://rajwanyair.github.io/Wedding
 *   4. Set APPLE_SERVICE_ID in config.js; the SDK is loaded in index.html
 */
function loginApple() {
  const serviceId = getRuntimeAppleServiceId();
  if (!serviceId) {
    showToast(t('auth_apple_not_configured'), 'warning');
    return;
  }
  if (typeof AppleID === 'undefined') {
    loadAppleSDK(serviceId);
    showToast(t('auth_loading_sdk'), 'info');
    setTimeout(loginApple, 2500);
    return;
  }
  AppleID.auth.signIn().then(function(res) {
    const idToken = res.authorization && res.authorization.id_token;
    const payload = idToken ? decodeJwt(idToken) : null;
    const email = (payload && payload.email) || '';
    const firstName = (res.user && res.user.name && res.user.name.firstName) || '';
    const lastName  = (res.user && res.user.name && res.user.name.lastName)  || '';
    _authUser = {
      name:      (firstName + ' ' + lastName).trim() || email,
      firstName: firstName,
      lastName:  lastName,
      email:     email,
      picture:   '',
      isAdmin:   isApprovedAdmin(email),
      provider:  'apple',
    };
    save('auth', {
      name: _authUser.name, email: _authUser.email,
      picture: '', isAdmin: _authUser.isAdmin, provider: 'apple',
    });
    onAuthSuccess();
  }).catch(function(err) {
    if (err && err.error !== 'popup_closed_by_user') {
      showToast(t('auth_error'), 'error');
      console.error('Apple Sign-In error:', err);
    }
  });
}

/** Continue anonymously: shows RSVP only, no pre-fill */
function loginGuest() {
  _authUser = { name: '', firstName: '', lastName: '', email: '', picture: '', isAdmin: false, provider: 'guest' };
  onAuthSuccess();
}

/** Sign out — anonymous users return to guest mode; authenticated return to login overlay */
function signOut() {
  const wasAuth = _authUser && _authUser.provider !== 'guest';
  _authUser = null;
  save('auth', null);
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
  if (wasAuth) {
    showAuthOverlay();
  } else {
    loginGuest();
  }
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
  const group  = document.getElementById('userBarGroup');
  const nameEl = document.getElementById('userDisplayName');
  const avatar = document.getElementById('userAvatar');
  const badge  = document.getElementById('userRoleBadge');
  const btnOut = document.getElementById('btnSignOut');
  const btnIn  = document.getElementById('btnSignIn');
  if (!group || !_authUser) return;
  group.style.display = 'flex';
  const isAnon = _authUser.provider === 'guest';
  if (_authUser.picture) {
    avatar.src = _authUser.picture;
    avatar.style.display = 'inline';
  } else {
    avatar.style.display = 'none';
  }
  nameEl.textContent = _authUser.name || t('role_guest');
  badge.textContent  = _authUser.isAdmin ? ('\ud83d\udc51 ' + t('role_admin')) : t('role_guest');
  badge.className    = 'user-role-chip ' + (_authUser.isAdmin ? 'role-admin' : 'role-guest');
  if (btnOut) btnOut.style.display = isAnon ? 'none' : '';
  if (btnIn)  btnIn.style.display  = isAnon ? '' : 'none';
}

function applyUserLevel() {
  if (!_authUser) return;
  if (_authUser.isAdmin) {
    document.body.classList.remove('guest-mode');
    showSection('dashboard');
  } else {
    document.body.classList.add('guest-mode');
    const fn = document.getElementById('rsvpFirstName');
    const ln = document.getElementById('rsvpLastName');
    if (fn && !fn.value && _authUser.firstName) fn.value = _authUser.firstName;
    if (ln && !ln.value && _authUser.lastName)  ln.value = _authUser.lastName;
    showSection('rsvp');
  }
}

function onAuthSuccess() {
  hideAuthOverlay();
  updateUserBar();
  applyUserLevel();
  if (_authUser && _authUser.isAdmin && _authUser.provider === 'google') {
    requestSheetsAccess();
  }
}

function initGoogleSignIn() {
  const clientId = getRuntimeClientId();
  const btnEl    = document.getElementById('googleSignInBtn');
  if (!clientId || clientId.includes('YOUR_GOOGLE')) {
    /* Show a setup hint inside the button slot so users know what to do */
    if (btnEl) {
      btnEl.innerHTML = '';
      const hint = document.createElement('p');
      hint.style.cssText = 'font-size:0.78rem; color:var(--text-muted); text-align:center; margin:0.3rem 0;';
      hint.textContent = t('auth_google_not_configured');
      btnEl.appendChild(hint);
    }
    return;
  }
  if (typeof window.google === 'undefined' || !window.google.accounts) return;
  window.google.accounts.id.initialize({
    client_id:             clientId,
    callback:              handleGoogleCredential,
    auto_select:           false,
    cancel_on_tap_outside: false,
  });
  if (btnEl) {
    btnEl.innerHTML = '';
    window.google.accounts.id.renderButton(btnEl, {
      theme:  'filled_black',
      size:   'large',
      shape:  'rectangular',
      width:  280,
      locale: _currentLang === 'he' ? 'iw' : 'en',
    });
  }
  if (!_authUser) window.google.accounts.id.prompt();
}

function initAuth() {
  /* Load persisted provider config + approved emails BEFORE evaluating isAdmin */
  loadAuthConfig();

  /* Load FB/Apple SDKs if credentials are already configured */
  const fbId    = getRuntimeFBAppId();
  const appleId = getRuntimeAppleServiceId();
  if (fbId)    loadFBSDK(fbId);
  if (appleId) loadAppleSDK(appleId);

  const saved = load('auth');
  if (saved && saved.email) {
    const parts = (saved.name || '').split(' ');
    /* Re-evaluate isAdmin against current approved list (may have changed since last login) */
    const isAdmin = isApprovedAdmin(saved.email);
    _authUser = {
      name:      saved.name      || '',
      firstName: parts[0]        || '',
      lastName:  parts.slice(1).join(' ') || '',
      email:     saved.email,
      picture:   saved.picture   || '',
      isAdmin:   isAdmin,
      provider:  saved.provider  || 'google',
    };
    /* Persist corrected isAdmin so the next load is also correct */
    save('auth', { name: _authUser.name, email: _authUser.email, picture: _authUser.picture, isAdmin: isAdmin, provider: _authUser.provider });
    hideAuthOverlay();
    updateUserBar();
    applyUserLevel();
  } else {
    loginGuest();
  }
  if (typeof window.google !== 'undefined' && window.google.accounts) {
    initGoogleSignIn();
  }
}

/* ─────────────────────────────────────────────────────────────────────
   User Access Management (called from Settings section)
   ───────────────────────────────────────────────────────────────────── */

/** Add an email to the approved admin list */
function addApprovedEmail() {
  const inp = document.getElementById('newApproveEmail');
  if (!inp) return;
  const email = inp.value.trim().toLowerCase();
  if (!email || !/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
    showToast(t('toast_email_invalid'), 'error'); return;
  }
  if (_approvedEmails.includes(email) || ADMIN_EMAILS.includes(email)) {
    showToast(t('toast_email_exists'), 'warning'); return;
  }
  _approvedEmails.push(email);
  saveAuthConfig();
  inp.value = '';
  renderUserManager();
  showToast(t('toast_email_approved'), 'success');
}

/** Remove an email from the approved admin list */
function removeApprovedEmail(email) {
  _approvedEmails = _approvedEmails.filter(function(e) { return e !== email; });
  saveAuthConfig();
  renderUserManager();
  showToast(t('toast_email_removed'), 'info');
}

/** Save provider credentials entered in the Settings UI */
function saveProviderConfig() {
  const gEl = document.getElementById('settingsGoogleClientId');
  const fEl = document.getElementById('settingsFBAppId');
  const aEl = document.getElementById('settingsAppleServiceId');
  _runtimeAuthConfig.googleClientId = (gEl ? gEl.value.trim() : '') || '';
  _runtimeAuthConfig.fbAppId        = (fEl ? fEl.value.trim() : '') || '';
  _runtimeAuthConfig.appleServiceId = (aEl ? aEl.value.trim() : '') || '';
  saveAuthConfig();
  showToast(t('toast_provider_saved'), 'success');
  setTimeout(function() { location.reload(); }, 1200);
}

/** Render the User Access Management card content */
function renderUserManager() {
  const gEl = document.getElementById('settingsGoogleClientId');
  const fEl = document.getElementById('settingsFBAppId');
  const aEl = document.getElementById('settingsAppleServiceId');
  if (gEl) gEl.value = _runtimeAuthConfig.googleClientId || '';
  if (fEl) fEl.value = _runtimeAuthConfig.fbAppId        || '';
  if (aEl) aEl.value = _runtimeAuthConfig.appleServiceId || '';
  const listEl = document.getElementById('approvedEmailsList');
  if (!listEl) return;
  listEl.innerHTML = '';
  ADMIN_EMAILS.forEach(function(email) { listEl.appendChild(_buildEmailRow(email, true)); });
  if (_approvedEmails.length === 0) {
    const none = document.createElement('p');
    none.style.cssText = 'font-size:0.8rem; color:var(--text-muted); margin:0.3rem 0;';
    none.textContent = t('user_mgr_none');
    listEl.appendChild(none);
  } else {
    _approvedEmails.forEach(function(email) { listEl.appendChild(_buildEmailRow(email, false)); });
  }
}

function _buildEmailRow(email, readonly) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0; border-bottom:1px solid var(--glass-border); font-size:0.83rem;';
  const icon = document.createElement('span');
  icon.textContent = readonly ? '👑' : '✅';
  const lbl = document.createElement('span');
  lbl.style.cssText = 'flex:1; color:var(--text-primary);';
  lbl.textContent = email;
  row.appendChild(icon);
  row.appendChild(lbl);
  if (!readonly) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-danger btn-small';
    btn.style.cssText = 'padding:0.15rem 0.5rem; font-size:0.75rem;';
    btn.textContent = '✕';
    btn.setAttribute('aria-label', t('user_mgr_remove') + ' ' + email);
    btn.onclick = function() { removeApprovedEmail(email); };
    row.appendChild(btn);
  }
  return row;
}
