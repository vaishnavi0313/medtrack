/* ─── MedTrack — script.js (Flask / Jinja2 Edition) ───────────── */

/* ── Active nav link ──────────────────────────────────────────── */
function setActiveNav() {
  const path = location.pathname;
  document.querySelectorAll('.navbar-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    // Exact match for root, prefix match for others
    const isActive = (href === '/' && path === '/') || (href !== '/' && path.startsWith(href));
    a.classList.toggle('active', isActive);
  });
}

/* ── Set today as min date for all date inputs ────────────────── */
function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(el => {
    // Only future-lock appointment booking, not search
    if (el.id === 'date' && document.getElementById('bookAppointmentForm')) {
      el.setAttribute('min', today);
    }
  });
}

/* ── XSS escape ───────────────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Animate count numbers ────────────────────────────────────── */
function animateCount(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

/* ─────────────────────────────────────────────────────────────── */
/* DASHBOARD STATS (loaded via API for live counts)               */
/* ─────────────────────────────────────────────────────────────── */
async function loadDashboardStats() {
  const pEl  = document.getElementById('statPatients');
  const aEl  = document.getElementById('statAppointments');
  const tEl  = document.getElementById('statToday');
  const cEl  = document.getElementById('statCompleted');
  const peEl = document.getElementById('statPending');
  const scEl = document.getElementById('statScheduled');

  if (!pEl && !aEl && !tEl && !cEl) return;

  try {
    const [pRes, aRes] = await Promise.all([
      fetch('/api/patients'),
      fetch('/api/appointments')
    ]);

    const patients     = await pRes.json();
    const appointments = await aRes.json();

    const pArr = Array.isArray(patients)     ? patients     : [];
    const aArr = Array.isArray(appointments) ? appointments : [];

    if (pEl) animateCount(pEl, pArr.length);
    if (aEl) animateCount(aEl, aArr.length);

    const today       = new Date().toISOString().split('T')[0];
    const todayAppts  = aArr.filter(a => a.date && a.date.startsWith(today));
    const completed   = aArr.filter(a => a.status === 'Completed');
    const scheduled   = aArr.filter(a => a.status === 'Scheduled');
    const pending     = aArr.filter(a => !a.diagnosis);

    if (tEl)  animateCount(tEl,  todayAppts.length);
    if (cEl)  animateCount(cEl,  completed.length);
    if (peEl) animateCount(peEl, pending.length);
    if (scEl) animateCount(scEl, scheduled.length);

  } catch (_) {
    [pEl, aEl, tEl, cEl, peEl, scEl].forEach(el => {
      if (el) el.textContent = '—';
    });
  }
}

/* ─────────────────────────────────────────────────────────────── */
/* AUTO-DISMISS flash alerts after 5 seconds                       */
/* ─────────────────────────────────────────────────────────────── */
function autoDismissAlerts() {
  document.querySelectorAll('.alert').forEach(alert => {
    // Only auto-dismiss alerts in the flash container, not info boxes
    if (alert.classList.contains('alert-success') || alert.classList.contains('alert-error')) {
      setTimeout(() => {
        alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        alert.style.opacity    = '0';
        alert.style.transform  = 'translateY(-8px)';
        setTimeout(() => alert.remove(), 500);
      }, 5000);
    }
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* FORM SUBMIT FEEDBACK — show spinner on submit buttons           */
/* ─────────────────────────────────────────────────────────────── */
function initFormFeedback() {
  document.querySelectorAll('form[method="POST"]').forEach(form => {
    form.addEventListener('submit', () => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Processing…`;
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* TABLE ROW ANIMATIONS — stagger rows on page load                */
/* ─────────────────────────────────────────────────────────────── */
function animateTableRows() {
  document.querySelectorAll('tbody tr').forEach((row, i) => {
    row.style.opacity  = '0';
    row.style.transform = 'translateY(10px)';
    row.style.transition = `opacity 0.3s ${i * 0.04}s ease, transform 0.3s ${i * 0.04}s ease`;
    setTimeout(() => {
      row.style.opacity  = '1';
      row.style.transform = 'translateY(0)';
    }, 50);
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* TEXTAREA auto-resize                                             */
/* ─────────────────────────────────────────────────────────────── */
function initTextareaResize() {
  document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* SEARCH DATE: remember last searched date via URL param          */
/* ─────────────────────────────────────────────────────────────── */
function prefillSearchDate() {
  const dateInput = document.getElementById('date');
  if (!dateInput) return;
  const params = new URLSearchParams(location.search);
  const d = params.get('date');
  if (d && !dateInput.value) dateInput.value = d;
}

/* ── Boot ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  setMinDates();
  autoDismissAlerts();
  initFormFeedback();
  animateTableRows();
  initTextareaResize();
  prefillSearchDate();
  loadDashboardStats();
});
