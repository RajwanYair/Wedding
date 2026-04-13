'use strict';

/* ── Authentication ── */

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
 * Facebook Sign-In via Facebook JavaScript SDK (JS SDK v22+).
 * Setup:
 *   1. https://developers.facebook.com → My Apps → Create App → Consumer
 *   2. Add "Facebook Login for Business" product
 *   3. Settings → Basic: set App Domains to rajwanyair.github.io
 *   4. Facebook Login → Settings: add  https://rajwanyair.github.io/Wedding  as Valid OAuth Redirect URI
 *   5. Set FB_APP_ID in config.js; the SDK is loaded asynchronously in index.html
 */
function loginFacebook() {
  if (typeof FB === 'undefined') {
    showToast(t('auth_fb_not_configured'), 'warning');
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
          isAdmin:   ADMIN_EMAILS.includes(me.email || ''),
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
  if (typeof AppleID === 'undefined') {
    showToast(t('auth_apple_not_configured'), 'warning');
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
      isAdmin:   ADMIN_EMAILS.includes(email),
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
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) {
    console.warn('Wedding Manager: Set GOOGLE_CLIENT_ID in js/config.js to enable Google Sign-In.');
    return;
  }
  window.google.accounts.id.initialize({
    client_id:             GOOGLE_CLIENT_ID,
    callback:              handleGoogleCredential,
    auto_select:           false,
    cancel_on_tap_outside: false,
  });
  const btnEl = document.getElementById('googleSignInBtn');
  if (btnEl) {
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
  const saved = load('auth');
  if (saved && saved.email) {
    const parts = (saved.name || '').split(' ');
    _authUser = {
      name:      saved.name      || '',
      firstName: parts[0]        || '',
      lastName:  parts.slice(1).join(' ') || '',
      email:     saved.email,
      picture:   saved.picture   || '',
      isAdmin:   saved.isAdmin   || false,
      provider:  saved.provider  || 'google',
    };
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
