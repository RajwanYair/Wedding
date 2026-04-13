'use strict';

/* ── Authentication (email-allowlist — no OAuth required) ── */

/** Returns true when the email has full admin rights (hardcoded or approved via Settings) */
function isApprovedAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email) || _approvedEmails.includes(email);
}

function loadAuthConfig() {
  const stored = load('auth_config');
  if (!stored) return;
  _approvedEmails = Array.isArray(stored.approvedEmails) ? stored.approvedEmails.slice() : [];
}

function saveAuthConfig() {
  save('auth_config', { approvedEmails: _approvedEmails });
}

/* ─── Email-based sign-in (no OAuth) ───────────────────────────────── */

/**
 * Sign in via email allowlist check — no password, no OAuth.
 * The user enters their email; if it matches ADMIN_EMAILS or _approvedEmails
 * they receive full manager access immediately.
 */
function submitEmailLogin() {
  const inp = document.getElementById('adminLoginEmail');
  if (!inp) return;
  const email = sanitizeInput(inp.value, 254).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast(t('toast_email_invalid'), 'error'); return;
  }
  if (!isApprovedAdmin(email)) {
    showToast(t('auth_email_not_approved'), 'warning'); return;
  }
  const displayName = email.split('@')[0];
  _authUser = {
    name:      displayName,
    firstName: displayName,
    lastName:  '',
    email:     email,
    picture:   '',
    isAdmin:   true,
    provider:  'email',
  };
  save('auth', { name: displayName, email: email, picture: '', isAdmin: true, provider: 'email' });
  inp.value = '';
  onAuthSuccess();
}

/** Continue anonymously: shows RSVP only */
function loginGuest() {
  _authUser = { name: '', firstName: '', lastName: '', email: '', picture: '', isAdmin: false, provider: 'guest' };
  onAuthSuccess();
}

/** Sign out — return to guest mode */
function signOut() {
  _authUser = null;
  save('auth', null);
  document.body.classList.remove('guest-mode');
  document.getElementById('userBarGroup').style.display = 'none';
  loginGuest();
}

function showAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('auth-hidden');
  /* Auto-focus the email input */
  const inp = document.getElementById('adminLoginEmail');
  if (inp) setTimeout(function() { inp.focus(); }, 50);
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
}

function initAuth() {
  /* Load approved emails BEFORE evaluating isAdmin */
  loadAuthConfig();

  const saved = load('auth');
  if (saved && saved.email) {
    const parts = (saved.name || '').split(' ');
    /* Re-evaluate isAdmin against current approved list (may have changed since last login) */
    const isAdmin = isApprovedAdmin(saved.email);
    _authUser = {
      name:      saved.name    || '',
      firstName: parts[0]      || '',
      lastName:  parts.slice(1).join(' ') || '',
      email:     saved.email,
      picture:   '',
      isAdmin:   isAdmin,
      provider:  saved.provider || 'email',
    };
    /* Persist corrected isAdmin so the next load is also correct */
    save('auth', { name: _authUser.name, email: _authUser.email, picture: '', isAdmin: isAdmin, provider: _authUser.provider });
    hideAuthOverlay();
    updateUserBar();
    applyUserLevel();
  } else {
    loginGuest();
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
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

/** Render the User Access Management card content (called when settings section opens) */
function renderUserManager() {
  const listEl = document.getElementById('approvedEmailsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  /* Hardcoded root admins — shown read-only */
  ADMIN_EMAILS.forEach(function(email) {
    const row = _buildEmailRow(email, true);
    listEl.appendChild(row);
  });

  /* Dynamic approved emails */
  if (_approvedEmails.length === 0) {
    const none = document.createElement('p');
    none.style.cssText = 'font-size:0.8rem; color:var(--text-muted); margin:0.3rem 0;';
    none.textContent = t('user_mgr_none');
    listEl.appendChild(none);
  } else {
    _approvedEmails.forEach(function(email) {
      const row = _buildEmailRow(email, false);
      listEl.appendChild(row);
    });
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
