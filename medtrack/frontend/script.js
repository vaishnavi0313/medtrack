/* ─── MedTrack — script.js ─────────────────────────────────── */
const API = 'http://localhost:5000';

/* ── Utility: Show Alert ──────────────────────────────────────── */
function showAlert(containerId, type, html) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  container.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      <span class="alert-icon">${icons[type] || 'ℹ️'}</span>
      <div>${html}</div>
    </div>`;
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ── Utility: Set button loading state ───────────────────────── */
function setLoading(btn, loading, originalText) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span> Processing…`
    : originalText;
}

/* ── Utility: Validate form fields ───────────────────────────── */
function validate(fields) {
  for (const [id, label] of fields) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      showAlert('msg', 'error', `<strong>${label}</strong> is required.`);
      el && el.focus();
      return false;
    }
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────── */
/* ADD PATIENT                                                      */
/* ─────────────────────────────────────────────────────────────── */
function initAddPatient() {
  const form = document.getElementById('addPatientForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;

    if (!validate([['name','Name'],['age','Age'],['disease','Disease']])) return;

    const age = parseInt(document.getElementById('age').value);
    if (isNaN(age) || age < 0 || age > 150) {
      showAlert('msg', 'error', 'Please enter a valid <strong>Age</strong> (0–150).');
      return;
    }

    setLoading(btn, true, origText);

    try {
      const res = await fetch(`${API}/add_patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    document.getElementById('name').value.trim(),
          age:     age,
          disease: document.getElementById('disease').value.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        const id = data.patient_id || data.id || '—';
        showAlert('msg', 'success',
          `Patient registered successfully! Patient ID: <span class="id-badge">${id}</span>`);
        form.reset();
      } else {
        showAlert('msg', 'error', data.error || data.message || 'Failed to add patient.');
      }
    } catch (err) {
      showAlert('msg', 'error', 'Cannot reach server. Is the backend running on <strong>localhost:5000</strong>?');
    } finally {
      setLoading(btn, false, origText);
    }
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* VIEW PATIENTS                                                    */
/* ─────────────────────────────────────────────────────────────── */
function initPatients() {
  const tbody = document.getElementById('patientsBody');
  const countEl = document.getElementById('patientCount');
  if (!tbody) return;

  // Expose globally so deletePatient() can call it after deletion
  window.loadPatients = async function () {
    tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><span class="spinner"></span> Loading patients…</td></tr>`;

    try {
      const res = await fetch(`${API}/patients`);
      const data = await res.json();
      const patients = Array.isArray(data) ? data : (data.patients || []);

      if (countEl) countEl.textContent = patients.length;

      if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <p>No patients found. <a href="add_patient.html" style="color:var(--accent)">Register the first patient →</a></p>
          </div></td></tr>`;
        return;
      }

      tbody.innerHTML = patients.map((p, i) => {
        const id = esc(p.patient_id ?? p.id ?? '—');
        return `
          <tr style="animation: fadeUp 0.3s ${i * 0.05}s ease both; opacity: 0" id="prow-${id}">
            <td>${id}</td>
            <td><strong>${esc(p.name ?? '—')}</strong></td>
            <td>${esc(String(p.age ?? '—'))}</td>
            <td><span class="badge badge-blue">${esc(p.disease ?? '—')}</span></td>
            <td>
              <button class="btn-delete" onclick="deletePatient('${id}')" title="Delete patient">
                🗑 Delete
              </button>
            </td>
          </tr>`;
      }).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Could not connect to server. Make sure the backend is running.</p>
        </div></td></tr>`;
    }
  };

  window.loadPatients();
  document.getElementById('refreshBtn')?.addEventListener('click', window.loadPatients);
}

/* ─────────────────────────────────────────────────────────────── */
/* DELETE PATIENT                                                   */
/* ─────────────────────────────────────────────────────────────── */
async function deletePatient(id) {
  if (!confirm(`Delete patient ${id}?\nThis cannot be undone.`)) return;

  // Animate row out immediately for snappy UX
  const row = document.getElementById(`prow-${id}`);
  if (row) {
    row.style.transition = 'opacity 0.25s, transform 0.25s';
    row.style.opacity    = '0';
    row.style.transform  = 'translateX(20px)';
  }

  try {
    const res = await fetch(`${API}/delete_patient/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTimeout(() => window.loadPatients && window.loadPatients(), 300);
    } else {
      const data = await res.json();
      alert('Error: ' + (data.error || 'Could not delete patient.'));
      window.loadPatients && window.loadPatients();
    }
  } catch (err) {
    alert('Cannot reach server. Is the backend running on localhost:5000?');
    window.loadPatients && window.loadPatients();
  }
}

/* ─────────────────────────────────────────────────────────────── */
/* BOOK APPOINTMENT                                                 */
/* ─────────────────────────────────────────────────────────────── */
function initBookAppointment() {
  const form = document.getElementById('bookAppointmentForm');
  if (!form) return;

  // Set min date to today
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;

    if (!validate([
      ['patient_id','Patient ID'],
      ['doctor_name','Doctor Name'],
      ['date','Date']
    ])) return;

    setLoading(btn, true, origText);

    try {
      const res = await fetch(`${API}/book_appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id:  document.getElementById('patient_id').value.trim(),
          doctor_name: document.getElementById('doctor_name').value.trim(),
          date:        document.getElementById('date').value
        })
      });

      const data = await res.json();

      if (res.ok) {
        const id = data.appointment_id || data.id || '—';
        showAlert('msg', 'success',
          `Appointment booked! Appointment ID: <span class="id-badge">${id}</span>`);
        form.reset();
      } else {
        showAlert('msg', 'error', data.error || data.message || 'Failed to book appointment.');
      }
    } catch (err) {
      showAlert('msg', 'error', 'Cannot reach server. Is the backend running on <strong>localhost:5000</strong>?');
    } finally {
      setLoading(btn, false, origText);
    }
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* VIEW APPOINTMENTS  (with Status + Actions)                       */
/* ─────────────────────────────────────────────────────────────── */
function initAppointments() {
  const tbody = document.getElementById('appointmentsBody');
  const countEl = document.getElementById('appointmentCount');
  if (!tbody) return;

  // Expose loadAppointments globally so updateStatus/deleteAppointment can call it
  window.loadAppointments = async function () {
    tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><span class="spinner"></span> Loading appointments…</td></tr>`;

    try {
      const res = await fetch(`${API}/appointments`);
      const data = await res.json();
      const appts = Array.isArray(data) ? data : (data.appointments || []);

      if (countEl) countEl.textContent = appts.length;

      if (appts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <p>No appointments scheduled. <a href="book_appointment.html" style="color:var(--accent)">Book an appointment →</a></p>
          </div></td></tr>`;
        return;
      }

      tbody.innerHTML = appts.map((a, i) => {
        const id      = esc(a.appointment_id ?? a.id ?? '—');
        const pid     = esc(String(a.patient_id ?? '—'));
        const doctor  = esc(a.doctor_name ?? a.doctor ?? '—');
        const dateStr = a.date
          ? new Date(a.date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
          : '—';
        const status  = (a.status || 'BOOKED').toUpperCase();
        const statusClass = {
          BOOKED:   'status-booked',
          WAITING:  'status-waiting',
          ATTENDED: 'status-attended'
        }[status] || 'status-booked';

        // Build status options
        const opts = ['BOOKED','WAITING','ATTENDED'].map(v =>
          `<option value="${v}"${v === status ? ' selected' : ''}>${v}</option>`
        ).join('');

        return `
          <tr style="animation: fadeUp 0.3s ${i * 0.05}s ease both; opacity: 0" id="row-${id}">
            <td>${id}</td>
            <td>${pid}</td>
            <td>🩺 <strong>${doctor}</strong></td>
            <td><span class="badge badge-green">📅 ${esc(dateStr)}</span></td>
            <td>
              <span class="status-badge ${statusClass}">${status}</span>
            </td>
            <td class="actions-cell">
              <select class="status-select" onchange="updateStatus('${id}', this.value)" title="Change status">
                ${opts}
              </select>
              <button class="btn-delete" onclick="deleteAppointment('${id}')" title="Delete appointment">
                🗑 Delete
              </button>
            </td>
          </tr>`;
      }).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Could not connect to server. Make sure the backend is running.</p>
        </div></td></tr>`;
    }
  };

  window.loadAppointments();
  document.getElementById('refreshBtn')?.addEventListener('click', window.loadAppointments);
}

/* ─────────────────────────────────────────────────────────────── */
/* UPDATE APPOINTMENT STATUS                                        */
/* ─────────────────────────────────────────────────────────────── */
async function updateStatus(id, status) {
  try {
    const res = await fetch(`${API}/update_status/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      // Visually update the badge in the row without a full reload
      const row = document.getElementById(`row-${id}`);
      if (row) {
        const badge = row.querySelector('.status-badge');
        if (badge) {
          badge.className = 'status-badge status-' + status.toLowerCase();
          badge.textContent = status;
        }
      }
    } else {
      const data = await res.json();
      alert('Error: ' + (data.error || 'Could not update status.'));
      window.loadAppointments(); // re-sync on error
    }
  } catch (err) {
    alert('Cannot reach server.');
  }
}

/* ─────────────────────────────────────────────────────────────── */
/* DELETE APPOINTMENT                                               */
/* ─────────────────────────────────────────────────────────────── */
async function deleteAppointment(id) {
  if (!confirm(`Delete appointment ${id}?\nThis action cannot be undone.`)) return;

  // Animate row out immediately for snappy UX
  const row = document.getElementById(`row-${id}`);
  if (row) {
    row.style.transition = 'opacity 0.25s, transform 0.25s';
    row.style.opacity    = '0';
    row.style.transform  = 'translateX(20px)';
  }

  try {
    const res = await fetch(`${API}/delete_appointment/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTimeout(() => window.loadAppointments(), 300);
    } else {
      const data = await res.json();
      alert('Error: ' + (data.error || 'Could not delete appointment.'));
      window.loadAppointments();
    }
  } catch (err) {
    alert('Cannot reach server.');
    window.loadAppointments();
  }
}

/* ─────────────────────────────────────────────────────────────── */
/* DASHBOARD STATS                                                  */
/* ─────────────────────────────────────────────────────────────── */
async function loadDashboardStats() {
  const pEl = document.getElementById('statPatients');
  const aEl = document.getElementById('statAppointments');
  if (!pEl && !aEl) return;

  try {
    const [pRes, aRes] = await Promise.all([
      fetch(`${API}/patients`),
      fetch(`${API}/appointments`)
    ]);
    const pData = await pRes.json();
    const aData = await aRes.json();

    const patients     = Array.isArray(pData) ? pData : (pData.patients || []);
    const appointments = Array.isArray(aData) ? aData : (aData.appointments || []);

    if (pEl) animateCount(pEl, patients.length);
    if (aEl) animateCount(aEl, appointments.length);

    // Today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date && a.date.startsWith(today));
    const tEl = document.getElementById('statToday');
    if (tEl) animateCount(tEl, todayAppts.length);

  } catch (_) {
    [pEl, aEl, document.getElementById('statToday')].forEach(el => {
      if (el) el.textContent = '—';
    });
  }
}

function animateCount(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

/* ── XSS escape ───────────────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ── Active nav link ──────────────────────────────────────────── */
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

/* ── Boot ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initAddPatient();
  initPatients();
  initBookAppointment();
  initAppointments();
  loadDashboardStats();
});
