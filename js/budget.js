'use strict';

/* ── Budget & Gift Tracker ── */

/**
 * Parse a gift string as a numeric amount (NIS).
 * If the value is purely numeric (with optional ₪/NIS prefix/suffix and commas) it is
 * parsed as a number; otherwise it is treated as a non-monetary description (returns 0).
 */
function parseGiftAmount(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[₪,\s]/g, '').replace(/^NIS/i, '').replace(/NIS$/i, '');
  const n = parseFloat(cleaned);
  return isFinite(n) && n >= 0 ? n : 0;
}

/** True when a gift string represents a received (non-empty) gift */
function giftReceived(g) {
  return !!g.gift && g.gift.trim() !== '';
}

/** Render the full Budget & Gift section */
function renderBudget() {
  const totalBudget = _weddingInfo.giftBudget || 0;
  const recipients = _guests.filter(function (g) {
    return g.status !== "declined";
  });
  const withGift = _guests.filter(giftReceived);
  const totalAmount = withGift.reduce(function (s, g) {
    return s + parseGiftAmount(g.gift);
  }, 0);
  const pending = recipients.filter(function (g) {
    return !giftReceived(g);
  });
  const pct =
    totalBudget > 0
      ? Math.min(100, Math.round((totalAmount / totalBudget) * 100))
      : 0;

  /* ── summary bar ── */
  const fillColor =
    totalAmount >= totalBudget && totalBudget > 0
      ? "var(--positive)"
      : "var(--accent)";
  const budgetInput = document.getElementById("budgetTargetInput");
  if (budgetInput && !budgetInput.matches(":focus"))
    budgetInput.value = totalBudget || "";

  const statGifts = document.getElementById("budgetStatGifts");
  const statTotal = document.getElementById("budgetStatTotal");
  const statPend = document.getElementById("budgetStatPending");
  const statBudget = document.getElementById("budgetStatBudget");
  const statPct = document.getElementById("budgetStatPct");
  const bar = document.getElementById("budgetProgressBar");
  const barWrap = document.getElementById("budgetProgressWrap");

  if (statGifts) statGifts.textContent = withGift.length;
  if (statTotal)
    statTotal.textContent =
      totalAmount > 0 ? "₪" + totalAmount.toLocaleString() : "—";
  if (statPend) statPend.textContent = pending.length;
  if (statBudget)
    statBudget.textContent =
      totalBudget > 0 ? "₪" + totalBudget.toLocaleString() : "—";
  if (statPct) statPct.textContent = totalBudget > 0 ? pct + "%" : "—";
  if (bar) {
    bar.style.width = pct + "%";
    bar.style.background = fillColor;
  }
  if (barWrap) barWrap.style.display = totalBudget > 0 ? "block" : "none";

  /* ── gift table rows ── */
  renderBudgetTable(); /* ── expense tracker ── */
  renderExpenses();
}

function renderBudgetTable() {
  const tbody    = document.getElementById('budgetTableBody');
  const empty    = document.getElementById('budgetEmpty');
  if (!tbody) return;

  const rows = _guests
    .filter(function(g) { return g.status !== 'declined'; })
    .sort(function(a, b) {
      /* received first, then alphabetical */
      const ar = giftReceived(a) ? 0 : 1;
      const br = giftReceived(b) ? 0 : 1;
      if (ar !== br) return ar - br;
      return guestFullName(a).localeCompare(guestFullName(b));
    });

  tbody.innerHTML = '';
  if (rows.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const frag = document.createDocumentFragment();
  rows.forEach(function(g) {
    const received = giftReceived(g);
    const amount   = parseGiftAmount(g.gift);
    const sideIcon = g.side === 'groom' ? '🤵' : g.side === 'bride' ? '👰' : '🤝';
    const statusDot = received ? '✅' : '⏳';

    const tr = document.createElement('tr');
    tr.className = received ? 'gift-row-received' : 'gift-row-pending';

    /* Name cell */
    const tdName = document.createElement('td');
    tdName.innerHTML = sideIcon + ' ' + escapeHtml(guestFullName(g));
    if (g.count && g.count > 1) {
      const sup = document.createElement('sup');
      sup.textContent = ' ×' + g.count;
      sup.style.cssText = 'font-size:0.7em; color:var(--text-muted);';
      tdName.appendChild(sup);
    }

    /* Status cell */
    const tdStatus = document.createElement('td');
    tdStatus.style.textAlign = 'center';
    tdStatus.textContent = statusDot;

    /* Gift cell */
    const tdGift = document.createElement('td');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'gift-input';
    inp.value = g.gift || '';
    inp.setAttribute('data-i18n-placeholder', 'budget_gift_placeholder');
    inp.placeholder = t('budget_gift_placeholder');
    inp.setAttribute('aria-label', t('budget_gift_placeholder'));
    inp.dataset.guestId = g.id;
    inp.oninput = function() { throttledSaveGift(g.id, inp.value); };
    tdGift.appendChild(inp);

    /* Amount cell */
    const tdAmt = document.createElement('td');
    tdAmt.style.textAlign = 'end';
    tdAmt.textContent = amount > 0 ? '₪' + amount.toLocaleString() : '';
    tdAmt.style.color = amount > 0 ? 'var(--positive)' : 'var(--text-muted)';

    tr.appendChild(tdName);
    tr.appendChild(tdStatus);
    tr.appendChild(tdGift);
    tr.appendChild(tdAmt);
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

/* Throttle gift saves to 600ms to avoid thrashing localStorage on each keystroke */
let _giftSaveTimer = null;
function throttledSaveGift(guestId, value) {
  if (_giftSaveTimer) clearTimeout(_giftSaveTimer);
  _giftSaveTimer = setTimeout(function() {
    const g = _guests.find(function(x) { return x.id === guestId; });
    if (g) {
      g.gift = value;
      g.updatedAt = new Date().toISOString();
      saveAll();
      renderBudget();
      renderStats();
    }
  }, 600);
}

/** Save the total expected budget (called from the input onchange) */
function saveBudgetTarget() {
  const inp = document.getElementById('budgetTargetInput');
  if (!inp) return;
  const val = parseFloat(inp.value.replace(/[₪,\s]/g, '')) || 0;
  _weddingInfo.giftBudget = val;
  saveAll();
  renderBudget();
  showToast(t('toast_budget_saved'), 'success');
}
