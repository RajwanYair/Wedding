'use strict';

/* ── Utility Functions ── */
/* ── Unique ID ── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Guest Full Name Helper ── */
function guestFullName(g) {
  return (g.firstName || '') + (g.lastName ? ' ' + g.lastName : '');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Trim and length-clamp a user-supplied string.
 * @param {string|*} str   Raw input value
 * @param {number}   max   Maximum allowed character count (default 500)
 * @returns {string}       Trimmed, clamped string
 */
function sanitizeInput(str, max) {
  if (str === null || str === undefined) return '';
  return String(str).trim().slice(0, max || 500);
}

/**
 * Return true if the supplied value is a valid HTTPS URL or an empty string.
 * Empty / absent values are considered valid (field is optional).
 */
function isValidHttpsUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch (_e) { return false; }
}

function cleanPhone(phone) {
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('0'))   p = '972' + p.slice(1);
  if (!p.startsWith('972') && !p.startsWith('+')) p = '972' + p;
  return p.replace(/^\+/, '');
}

function formatDateHebrew(dateStr) {
  try {
    const d      = new Date(dateStr + 'T00:00:00');
    const locale = _currentLang === 'he' ? 'he-IL' : 'en-US';
    return d.toLocaleDateString(locale, { weekday:'long', year:'numeric', month:'long', day:'numeric',
      timeZone: 'Asia/Jerusalem' });
  } catch (_e) { return dateStr; }
}

/* ── Particles ── */
function initParticles() {
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left              = Math.random() * 100 + '%';
    p.style.animationDelay   = (Math.random() * 8) + 's';
    p.style.animationDuration= (6 + Math.random() * 6) + 's';
    const sz = (2 + Math.random() * 4) + 'px';
    p.style.width = sz; p.style.height = sz;
    el.particles.appendChild(p);
  }
}

