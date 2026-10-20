'use strict';

// --- State Management ---
let state = {
  directRunning: false,
  isExpired: false,
  remainingMs: 86400000,
  licenseTimer: null,
};

// --- DOM References ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupQuickChips();
  setupDirectTrafficControls();
  setupLicenseWatcher();
  setupEventSource();
  setupAdminContact();
});

// --- Theme Toggle ---
function setupThemeToggle() {
  const btn = $('#btnThemeToggle');
  const icon = $('#themeToggleIcon');
  if (!btn) return;

  const saved = localStorage.getItem('traffic_pro_theme') || 'light';
  if (saved === 'dark') {
    document.body.classList.remove('theme-light');
    if (icon) icon.textContent = '🌙';
  } else {
    document.body.classList.add('theme-light');
    if (icon) icon.textContent = '☀️';
  }

  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('theme-light');
    localStorage.setItem('traffic_pro_theme', isLight ? 'light' : 'dark');
    if (icon) icon.textContent = isLight ? '☀️' : '🌙';
  });
}

// --- Quick Selection Chips ---
function setupQuickChips() {
  // Goal chips
  const sessionsInput = $('#dtSessions');
  $$('.chip-goal').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.chip-goal').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const goal = chip.getAttribute('data-goal');
      if (sessionsInput) sessionsInput.value = goal;
      const statTotal = $('#statTotalTraffic');
      if (statTotal) statTotal.textContent = parseInt(goal, 10).toLocaleString();
    });
  });

  if (sessionsInput) {
    sessionsInput.addEventListener('input', () => {
      const val = parseInt(sessionsInput.value, 10) || 5000;
      const statTotal = $('#statTotalTraffic');
      if (statTotal) statTotal.textContent = val.toLocaleString();
    });
  }

  // Threads chips
  const threadsInput = $('#dtThreads');
  const threadsBadge = $('#threadsBadge');
  $$('.chip[data-threads]').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.chip[data-threads]').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute('data-threads');
      if (threadsInput) threadsInput.value = val;
      if (threadsBadge) threadsBadge.textContent = `${val}x`;
    });
  });

  if (threadsInput) {
    threadsInput.addEventListener('input', () => {
      const val = threadsInput.value || 1;
      if (threadsBadge) threadsBadge.textContent = `${val}x`;
      $$('.chip[data-threads]').forEach((c) => {
        if (c.getAttribute('data-threads') === String(val)) c.classList.add('active');
        else c.classList.remove('active');
      });
    });
  }

  // Duration chips
  const durInput = $('#dtVisitTimeMs');
  const stayTimeBadge = $('#stayTimeBadge');
  $$('.chip-duration').forEach((chip) => {
    chip.addEventListener('click', () => {
      $$('.chip-duration').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const sec = chip.getAttribute('data-duration');
      if (durInput) durInput.value = sec;
      if (stayTimeBadge) stayTimeBadge.textContent = `${sec}s`;
    });
  });

  if (durInput) {
    durInput.addEventListener('input', () => {
      const sec = durInput.value || 25;
      if (stayTimeBadge) stayTimeBadge.textContent = `${sec}s`;
      $$('.chip-duration').forEach((c) => {
        if (c.getAttribute('data-duration') === String(sec)) c.classList.add('active');
        else c.classList.remove('active');
      });
    });
  }
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'success') toast.style.background = '#059669';
  else if (type === 'error') toast.style.background = '#dc2626';
  else toast.style.background = '#0f172a';

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// --- 24-Hour License Watcher & Countdown ---
async function fetchLicenseStatus() {
  try {
    const res = await fetch('/api/license');
    if (!res.ok) return;
    const data = await res.json();
    state.isExpired = data.isExpired;
    state.remainingMs = data.remainingMs;

    if (data.cloud && data.cloud.isCloudKilled) {
      triggerRemoteKill(data.cloud.config);
      return;
    }

    if (state.isExpired) {
      triggerTrialExpired();
    }
  } catch (_) {}
}

function triggerRemoteKill(cfg) {
  state.isExpired = true;
  const overlay = $('#expiryOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    const title = $('.expiry-title');
    if (title) title.textContent = '🔒 Software Remotely Suspended';
    const text = $('.expiry-text');
    if (text) text.innerHTML = `This software has been remotely paused by the Administrator.<br><br>To reactivate your license, please contact <strong>Henry Miller</strong> on Telegram.`;
  }
  const btn = $('#btnStartDirect');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }
  const pill = $('#trialCountdownPill');
  if (pill) {
    pill.className = 'trial-countdown-badge urgent';
    $('#txtTrialCountdown').textContent = 'Admin Locked';
  }
}

function triggerTrialExpired() {
  state.isExpired = true;
  const overlay = $('#expiryOverlay');
  if (overlay) overlay.style.display = 'flex';
  const btn = $('#btnStartDirect');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  }
  const pill = $('#trialCountdownPill');
  if (pill) {
    pill.className = 'trial-countdown-badge urgent';
    $('#txtTrialCountdown').textContent = 'Demo Expired (0h 0m)';
  }
}

function setupLicenseWatcher() {
  fetchLicenseStatus();

  // Local second-by-second countdown ticker
  setInterval(() => {
    if (state.isExpired) return;

    if (state.remainingMs > 1000) {
      state.remainingMs -= 1000;
    } else {
      state.remainingMs = 0;
      triggerTrialExpired();
      return;
    }

    const hours = Math.floor(state.remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((state.remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((state.remainingMs % (1000 * 60)) / 1000);

    const txt = `${hours}h ${minutes}m ${seconds}s`;
    const label = $('#txtTrialCountdown');
    if (label) label.textContent = `Demo: ${txt} left`;

    const pill = $('#trialCountdownPill');
    if (pill) {
      if (hours === 0 && minutes < 60) {
        pill.classList.add('urgent');
      } else {
        pill.classList.remove('urgent');
      }
    }
  }, 1000);

  // Re-sync with server every 15s
  setInterval(fetchLicenseStatus, 15000);
}

// --- Direct Traffic Controls ---
function setupDirectTrafficControls() {
  const btn = $('#btnStartDirect');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (state.isExpired) {
      triggerTrialExpired();
      showToast('Evaluation trial has expired. Please buy the full license.', 'error');
      return;
    }

    if (state.directRunning) {
      // Stop traffic
      try {
        const res = await fetch('/api/direct/stop', { method: 'POST' });
        const json = await res.json();
        if (json.ok) {
          showToast('Direct Traffic stopped.', 'info');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
      return;
    }

    // Start traffic
    const targetUrl = $('#dtTargetUrl').value.trim();
    if (!targetUrl) {
      showToast('Please enter your destination target URL.', 'error');
      return;
    }

    const payload = {
      targetUrl,
      sessions: parseInt($('#dtSessions').value, 10) || 5000,
      threads: parseInt($('#dtThreads').value, 10) || 5,
      useProxies: true, // Always route through enterprise residential proxies
      visitTimeMs: (parseInt($('#dtVisitTimeMs').value, 10) || 25) * 1000,
      headless: $('#dtHeadless').checked,
      autoRotateResolutions: true,
      humanScroll: true,
    };

    try {
      const res = await fetch('/api/direct/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (json.isExpired) {
          triggerTrialExpired();
        }
        showToast(json.error || 'Failed to start traffic engine.', 'error');
        return;
      }

      showToast('🚀 Traffic engine launched! Sending visits...', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// --- Contact Admin Button ---
function setupAdminContact() {
  const btn = $('#btnContactAdmin');
  if (btn) {
    btn.addEventListener('click', (e) => {
      // Direct open telegram profile
      try {
        window.open('https://t.me/Henrymiller08', '_blank');
      } catch (_) {
        window.location.href = 'https://t.me/Henrymiller08';
      }
    });
  }
}

// --- Realtime SSE Stream & Fallback ---
function setupEventSource() {
  const es = new EventSource('/api/events');

  es.addEventListener('init', (e) => {
    try {
      const data = JSON.parse(e.data);
      updateDashboard(data.overall, data.campaigns);
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.reverse().forEach(appendLog);
      }
    } catch (_) {}
  });

  es.addEventListener('stats', (e) => {
    try {
      const data = JSON.parse(e.data);
      updateDashboard(data.overall, data.campaigns);
    } catch (_) {}
  });

  es.addEventListener('log', (e) => {
    try {
      const logEntry = JSON.parse(e.data);
      appendLog(logEntry);
    } catch (_) {}
  });

  es.addEventListener('license_expired', () => {
    triggerTrialExpired();
  });

  es.addEventListener('cloud_update', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.isCloudKilled) {
        triggerRemoteKill(data.config);
      }
    } catch (_) {}
  });

  // Regular status polling fallback every 1.5s
  setInterval(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          updateDashboard(json.overall, json.campaigns);
          if (json.license && json.license.isExpired) {
            triggerTrialExpired();
          }
        }
      }
    } catch (_) {}
  }, 1500);
}

// --- Live Console Logs ---
function appendLog(log) {
  const container = $('#consoleLogs');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `log-line ${log.type || 'info'}`;
  div.textContent = `[${log.time || new Date().toLocaleTimeString()}] ${log.message}`;
  container.appendChild(div);

  const box = $('#consoleBox');
  if (box) box.scrollTop = box.scrollHeight;

  const count = container.children.length;
  const counter = $('#logCounter');
  if (counter) counter.textContent = `${count} logs`;
}

$('#btnClearLogs').addEventListener('click', () => {
  $('#consoleLogs').innerHTML = '<div class="log-line info">[System] Console cleared.</div>';
  $('#logCounter').textContent = '1 log';
});

// --- Dashboard KPI Sync ---
function updateDashboard(overall, campaigns) {
  if (overall) {
    if ($('#statTotalTraffic')) $('#statTotalTraffic').textContent = (overall.totalTraffic || 5000).toLocaleString();
    if ($('#statCompleted')) $('#statCompleted').textContent = (overall.completedTraffic || 0).toLocaleString();
    if ($('#statOpenBrowsers')) $('#statOpenBrowsers').textContent = (overall.activeBrowsers || 0).toLocaleString();
  }

  if (campaigns) {
    const directCmp = campaigns.find((c) => c.name === 'Direct Traffic (Quick Run)');
    const btn = $('#btnStartDirect');
    const txt = $('#txtStartDirect');

    if (directCmp && directCmp.status === 'running') {
      state.directRunning = true;
      if (btn) btn.className = 'btn btn-danger btn-lg shadow-glow';
      if (txt) txt.textContent = '⏹ Stop Direct Traffic';
    } else {
      state.directRunning = false;
      if (btn) btn.className = 'btn btn-primary btn-lg shadow-glow';
      if (txt) txt.textContent = '▶ Start Direct Traffic';
    }
  }
}
