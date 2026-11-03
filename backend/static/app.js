// ==============================================================
// MENING INSPEKTORIM - STANDALONE WEB APPLICATION (app.js)
// 100% Independent Web Platform (No Telegram dependencies)
// ==============================================================

// Global State
let appState = {
  authenticatedOfficer: null, // null = citizen mode, object = staff mode
  hasLocationSet: false,
  selectedMahalla: null,
  assignedOfficer: null,
  allLocations: [],
  officerReports: [],
  officerFilter: 'all',
};

// Wizard State (Step-by-step replacement)
let wizardState = {
  step: 1, // 1: Viloyat, 2: Tuman, 3: Mahalla
  selectedRegion: null,
  selectedDistrict: null,
};

// Settings State (Persisted in localStorage)
const DEFAULT_SETTINGS = {
  theme: 'light',
  font: 'inter',
  size: 'medium',
  accent: 'blue',
};

let userSettings = { ...DEFAULT_SETTINGS };
try {
  const savedSettings = localStorage.getItem('web_citizen_settings');
  if (savedSettings) {
    userSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
  }
} catch (e) {}

// Check saved officer session
try {
  const savedOfficer = localStorage.getItem('web_officer_session');
  if (savedOfficer) {
    appState.authenticatedOfficer = JSON.parse(savedOfficer);
  }
} catch (e) {}

// Check saved citizen location
try {
  const savedMahalla = localStorage.getItem('web_selected_mahalla');
  if (savedMahalla) {
    appState.selectedMahalla = JSON.parse(savedMahalla);
    appState.hasLocationSet = true;
  }
} catch (e) {}

// Media Recording State
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let timerInterval = null;
let timerSeconds = 0;
let selectedVideoFile = null;

// DOM Elements
const screenLocation = document.getElementById('screen-location');
const screenCitizen = document.getElementById('screen-citizen');
const screenOfficer = document.getElementById('screen-officer');
const roleBadge = document.getElementById('role-badge');
const btnOpenStaffLogin = document.getElementById('btn-open-staff-login');
const btnStaffLogout = document.getElementById('btn-staff-logout');
const headerMahallaChip = document.getElementById('header-mahalla-chip');
const headerMahallaName = document.getElementById('header-mahalla-name');

// Screen Router
function showScreen(screenId) {
  screenLocation.classList.add('hidden');
  screenCitizen.classList.add('hidden');
  screenOfficer.classList.add('hidden');

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
  }
}

// ==============================================================
// 1. Settings & CSS Variables Management
// ==============================================================
function applyCurrentSettings() {
  const root = document.documentElement;

  // 1. Theme
  if (userSettings.theme === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('theme-icon').textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    document.getElementById('theme-icon').textContent = '🌙';
  }

  // 2. Font Size
  const sizeMap = { small: '14px', medium: '16px', large: '18px' };
  root.style.setProperty('--base-font-size', sizeMap[userSettings.size] || '16px');

  // 3. Font Family
  const fontMap = {
    inter: "'Inter', sans-serif",
    sans: "system-ui, -apple-system, sans-serif",
    serif: "Georgia, serif",
  };
  root.style.setProperty('--font-family', fontMap[userSettings.font] || "'Inter', sans-serif");

  // 4. Accent Color
  const accentMap = {
    blue: '#0284c7',
    emerald: '#059669',
    slate: '#475569',
  };
  root.style.setProperty('--accent-color', accentMap[userSettings.accent] || '#0284c7');

  // Update Settings Modal Buttons
  ['light', 'dark'].forEach((t) => {
    const btn = document.getElementById(`theme-btn-${t}`);
    if (btn) {
      if (userSettings.theme === t) {
        btn.className = 'p-2.5 border rounded-xl font-bold text-center border-sky-600 bg-sky-50 text-sky-800';
      } else {
        btn.className = 'p-2.5 border rounded-xl font-semibold text-center border-slate-200 hover:bg-slate-50';
      }
    }
  });

  ['inter', 'sans', 'serif'].forEach((f) => {
    const btn = document.getElementById(`font-btn-${f}`);
    if (btn) {
      if (userSettings.font === f) {
        btn.className = 'p-2 border rounded-xl text-center font-bold border-sky-600 bg-sky-50 text-sky-800';
      } else {
        btn.className = 'p-2 border rounded-xl text-center border-slate-200 hover:bg-slate-50';
      }
    }
  });

  ['small', 'medium', 'large'].forEach((s) => {
    const btn = document.getElementById(`size-btn-${s}`);
    if (btn) {
      if (userSettings.size === s) {
        btn.className = 'p-2 border rounded-xl border-sky-600 bg-sky-50 text-sky-800 font-bold';
      } else {
        btn.className = 'p-2 border rounded-xl border-slate-200 hover:bg-slate-50';
      }
    }
  });

  ['blue', 'emerald', 'slate'].forEach((a) => {
    const btn = document.getElementById(`acc-btn-${a}`);
    if (btn) {
      if (userSettings.accent === a) {
        btn.className = 'p-2 border rounded-xl flex items-center justify-center gap-1.5 border-slate-800 bg-slate-100 font-bold';
      } else {
        btn.className = 'p-2 border rounded-xl flex items-center justify-center gap-1.5 border-slate-200 hover:bg-slate-50';
      }
    }
  });

  try {
    localStorage.setItem('web_citizen_settings', JSON.stringify(userSettings));
  } catch (e) {}
}

function toggleQuickTheme() {
  userSettings.theme = userSettings.theme === 'dark' ? 'light' : 'dark';
  applyCurrentSettings();
}

function openSettingsModal() {
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function applyThemeSetting(t) {
  userSettings.theme = t;
  applyCurrentSettings();
}

function applyFontSetting(f) {
  userSettings.font = f;
  applyCurrentSettings();
}

function applySizeSetting(s) {
  userSettings.size = s;
  applyCurrentSettings();
}

function applyAccentSetting(a) {
  userSettings.accent = a;
  applyCurrentSettings();
}

// ==============================================================
// 2. Dual Entry & Navigation Control
// ==============================================================
function initApp() {
  applyCurrentSettings();

  // If officer session is active
  if (appState.authenticatedOfficer) {
    roleBadge.textContent = 'Xizmat Kabineti';
    roleBadge.className = 'text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200';
    btnOpenStaffLogin.classList.add('hidden');
    btnStaffLogout.classList.remove('hidden');
    headerMahallaChip.classList.add('hidden');

    document.getElementById('officer-name').textContent = appState.authenticatedOfficer.full_name;
    document.getElementById('officer-mahalla').textContent = `${appState.authenticatedOfficer.mahalla_name || 'Yunusobod tumani'}`;

    showScreen('screen-officer');
    loadOfficerReports();
  } else {
    // Citizen Mode
    roleBadge.textContent = 'Fuqarolar Portali';
    roleBadge.className = 'text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100';
    btnOpenStaffLogin.classList.remove('hidden');
    btnStaffLogout.classList.add('hidden');
    headerMahallaChip.classList.remove('hidden');

    if (!appState.hasLocationSet) {
      startLocationWizard();
    } else {
      updateCitizenPortalCard();
      showScreen('screen-citizen');
    }
  }
}

// Staff Login Modal Handlers
function openStaffLoginModal() {
  document.getElementById('login-error-msg').classList.add('hidden');
  document.getElementById('staff-login-modal').classList.remove('hidden');
}

function closeStaffLoginModal() {
  document.getElementById('staff-login-modal').classList.add('hidden');
}

async function handleStaffLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errorMsg = document.getElementById('login-error-msg');

  try {
    const res = await fetch('/api/officer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok && data.status === 'ok') {
      appState.authenticatedOfficer = data.officer;
      localStorage.setItem('web_officer_session', JSON.stringify(data.officer));
      closeStaffLoginModal();
      initApp();
    } else {
      errorMsg.textContent = data.detail || "Login yoki parol noto'g'ri";
      errorMsg.classList.remove('hidden');
    }
  } catch (err) {
    // Local fallback for offline/preview
    if ((username === 'karimov' || username === 'alimov') && password === 'pass123') {
      const fallbackOfficer = {
        id: 'insp-1',
        full_name: 'Mayor Karimov Rustam Baxtiyorovich',
        rank: 'Mayor',
        phone: '+998901234567',
        badge_number: 'IIB-UZ-7842',
        mahalla_name: "Bog'ishamol mahallasi",
      };
      appState.authenticatedOfficer = fallbackOfficer;
      localStorage.setItem('web_officer_session', JSON.stringify(fallbackOfficer));
      closeStaffLoginModal();
      initApp();
    } else {
      errorMsg.textContent = "Login yoki parol noto'g'ri";
      errorMsg.classList.remove('hidden');
    }
  }
}

function logoutStaff() {
  appState.authenticatedOfficer = null;
  localStorage.removeItem('web_officer_session');
  initApp();
}

// ==============================================================
// 3. Multi-Step Location Wizard (Step Replacement)
// ==============================================================
async function loadLocationsData() {
  if (appState.allLocations.length > 0) return appState.allLocations;
  try {
    const res = await fetch('/api/locations');
    const data = await res.json();
    appState.allLocations = data.regions || [];
    return appState.allLocations;
  } catch (err) {
    // Fallback static dataset if backend is loading
    return [
      {
        id: 'reg-tashkent',
        name: 'Toshkent shahri',
        districts: [
          {
            id: 'dist-yunusobod',
            name: 'Yunusobod tumani',
            mahallas: [
              {
                id: 'mah-1',
                name: "Bog'ishamol mahallasi",
                address: "Bog'ishamol ko'chasi 45-uy",
                police_station: "12-sonli IIO Tayanch punkti",
                officer: {
                  full_name: "Mayor Karimov Rustam Baxtiyorovich",
                  rank: "Mayor",
                  phone: "+998901234567",
                  badge_number: "IIB-UZ-7842",
                  reception_days: "Dush, Chor, Shanba (09:00-18:00)",
                },
              },
              {
                id: 'mah-2',
                name: 'Shahriston mahallasi',
                address: 'Amir Temur shoh ko‘chasi 112',
                police_station: '12-sonli IIO Tayanch punkti',
                officer: {
                  full_name: 'Katta leytenant Alimov Jasur Otabekovich',
                  rank: 'Katta leytenant',
                  phone: '+998909876543',
                  badge_number: 'IIB-UZ-9014',
                  reception_days: 'Sesh, Pay, Shanba (09:00-18:00)',
                },
              },
            ],
          },
          {
            id: 'dist-mirzo-ulugbek',
            name: "Mirzo Ulug'bek tumani",
            mahallas: [
              {
                id: 'mah-3',
                name: 'Oqqo‘rg‘on mahallasi',
                address: 'Oqqo‘rg‘on ko‘chasi 24-uy',
                police_station: '4-sonli IIO Tayanch punkti',
                officer: {
                  full_name: 'Mayor Karimov Rustam Baxtiyorovich',
                  rank: 'Mayor',
                  phone: '+998901234567',
                  badge_number: 'IIB-UZ-7842',
                  reception_days: 'Dush, Chor, Shanba (09:00-18:00)',
                },
              },
            ],
          },
        ],
      },
    ];
  }
}

async function startLocationWizard() {
  wizardState.step = 1;
  wizardState.selectedRegion = null;
  wizardState.selectedDistrict = null;
  showScreen('screen-location');
  await renderWizard();
}

function wizardGoBack() {
  if (wizardState.step === 3) wizardState.step = 2;
  else if (wizardState.step === 2) wizardState.step = 1;
  renderWizard();
}

async function renderWizard() {
  const regions = await loadLocationsData();
  const container = document.getElementById('wizard-step-container');
  const title = document.getElementById('wizard-title');
  const subtitle = document.getElementById('wizard-subtitle');
  const backBtn = document.getElementById('wizard-back-btn');
  const bottomBack = document.getElementById('wizard-bottom-back');
  const chip = document.getElementById('wizard-step-chip');

  chip.textContent = `${wizardState.step} / 3`;

  if (wizardState.step === 1) {
    backBtn.classList.add('hidden');
    bottomBack.classList.add('hidden');
    title.textContent = '1-qadam: Viloyatni tanlang';
    subtitle.textContent = "Yashash hududingiz bo'yicha birinchi bosqich";

    container.innerHTML = regions
      .map(
        (reg) => `
        <button type="button" onclick="selectWizardRegion('${reg.id}')"
          class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-sky-500 bg-white hover:bg-sky-50/50 flex items-center justify-between text-left transition-all">
          <div class="flex items-center gap-3">
            <span class="text-xl">🏛️</span>
            <div>
              <div class="font-bold text-xs text-slate-900">${reg.name}</div>
              <div class="text-[10px] text-slate-500">${reg.districts.length} ta tuman</div>
            </div>
          </div>
          <span class="text-slate-400 text-xs">➔</span>
        </button>
      `
      )
      .join('');
  } else if (wizardState.step === 2) {
    backBtn.classList.remove('hidden');
    bottomBack.classList.remove('hidden');
    title.textContent = `2-qadam: ${wizardState.selectedRegion.name} tumanlari`;
    subtitle.textContent = "Tumaningizni ro'yxatdan tanlang";

    container.innerHTML = wizardState.selectedRegion.districts
      .map(
        (dist) => `
        <button type="button" onclick="selectWizardDistrict('${dist.id}')"
          class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-sky-500 bg-white hover:bg-sky-50/50 flex items-center justify-between text-left transition-all">
          <div class="flex items-center gap-3">
            <span class="text-xl">📍</span>
            <div>
              <div class="font-bold text-xs text-slate-900">${dist.name}</div>
              <div class="text-[10px] text-slate-500">${dist.mahallas.length} ta mahalla</div>
            </div>
          </div>
          <span class="text-slate-400 text-xs">➔</span>
        </button>
      `
      )
      .join('');
  } else if (wizardState.step === 3) {
    backBtn.classList.remove('hidden');
    bottomBack.classList.remove('hidden');
    title.textContent = `3-qadam: ${wizardState.selectedDistrict.name} mahallalari`;
    subtitle.textContent = 'Mahallangiz tanlangach avtomatik saqlanadi';

    container.innerHTML = wizardState.selectedDistrict.mahallas
      .map(
        (mah) => `
        <button type="button" onclick="selectAndSaveMahalla('${mah.id}')"
          class="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 flex items-center justify-between text-left transition-all">
          <div>
            <div class="font-bold text-xs text-slate-900">${mah.name}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">${mah.address}</div>
            <div class="text-[10px] text-sky-700 font-semibold mt-1">🛡️ ${mah.police_station}</div>
          </div>
          <span class="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-bold">Tanlash ➔</span>
        </button>
      `
      )
      .join('');
  }
}

function selectWizardRegion(regId) {
  const reg = appState.allLocations.find((r) => r.id === regId);
  if (reg) {
    wizardState.selectedRegion = reg;
    wizardState.step = 2;
    renderWizard();
  }
}

function selectWizardDistrict(distId) {
  if (wizardState.selectedRegion) {
    const dist = wizardState.selectedRegion.districts.find((d) => d.id === distId);
    if (dist) {
      wizardState.selectedDistrict = dist;
      wizardState.step = 3;
      renderWizard();
    }
  }
}

function selectAndSaveMahalla(mahallaId) {
  const mah = wizardState.selectedDistrict.mahallas.find((m) => m.id === mahallaId);
  if (mah) {
    appState.selectedMahalla = mah;
    appState.assignedOfficer = mah.officer;
    appState.hasLocationSet = true;

    localStorage.setItem('web_selected_mahalla', JSON.stringify(mah));
    updateCitizenPortalCard();
    showScreen('screen-citizen');
  }
}

// ==============================================================
// 4. Citizen Main Screen (Minimalist: Profile Card + 3 Actions)
// ==============================================================
function updateCitizenPortalCard() {
  const mah = appState.selectedMahalla;
  const off = mah?.officer || appState.assignedOfficer || {
    full_name: 'Mayor Karimov Rustam Baxtiyorovich',
    rank: 'Mayor',
    phone: '+998901234567',
    badge_number: 'IIB-UZ-7842',
    reception_days: 'Dush, Chor, Shanba (09:00-18:00)',
  };

  if (mah) {
    headerMahallaName.textContent = mah.name;
    document.getElementById('card-mahalla-name').textContent = `📍 ${mah.name}`;
  }

  document.getElementById('card-officer-name').textContent = off.full_name;
  document.getElementById('card-officer-rank').textContent = `${off.rank} — Profilaktika inspektori`;
  document.getElementById('card-badge').textContent = off.badge_number;
  document.getElementById('card-reception').textContent = off.reception_days;
  document.getElementById('btn-call-officer').href = `tel:${off.phone}`;
  document.getElementById('action-phone-sub').textContent = `Xizmat telefoni: ${off.phone}`;
}

function showSuccessBanner() {
  const b = document.getElementById('action-success-banner');
  b.classList.remove('hidden');
  setTimeout(() => b.classList.add('hidden'), 3500);
}

// --- Voice Recording Flow (MediaRecorder API) ---
function openVoiceRecorder() {
  document.getElementById('citizen-main-actions').classList.add('hidden');
  document.getElementById('voice-recorder-view').classList.remove('hidden');
  document.getElementById('video-recorder-view').classList.add('hidden');
}

function closeVoiceRecorder() {
  discardVoiceRecording();
  document.getElementById('voice-recorder-view').classList.add('hidden');
  document.getElementById('citizen-main-actions').classList.remove('hidden');
}

async function startMicRecording() {
  audioChunks = [];
  audioBlob = null;
  timerSeconds = 0;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const player = document.getElementById('voice-player');
      player.src = audioUrl;
      document.getElementById('voice-playback-box').classList.remove('hidden');
      document.getElementById('voice-status-text').textContent = 'Ovoz yozildi. Yuborishga tayyor.';
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    document.getElementById('btn-mic-start').classList.add('hidden');
    document.getElementById('btn-mic-stop').classList.remove('hidden');
    document.getElementById('voice-status-text').textContent = "Ovoz yozilmoqda... To'xtatish uchun bosing.";

    timerInterval = setInterval(() => {
      timerSeconds++;
      const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
      const s = String(timerSeconds % 60).padStart(2, '0');
      document.getElementById('voice-timer').textContent = `${m}:${s}`;
    }, 1000);
  } catch (err) {
    console.warn('Hardware microphone not accessible, starting simulated recording:', err);
    document.getElementById('btn-mic-start').classList.add('hidden');
    document.getElementById('btn-mic-stop').classList.remove('hidden');
    timerInterval = setInterval(() => {
      timerSeconds++;
      const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
      const s = String(timerSeconds % 60).padStart(2, '0');
      document.getElementById('voice-timer').textContent = `${m}:${s}`;
    }, 1000);
  }
}

function stopMicRecording() {
  clearInterval(timerInterval);
  document.getElementById('btn-mic-start').classList.remove('hidden');
  document.getElementById('btn-mic-stop').classList.add('hidden');

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    audioBlob = new Blob(['simulated-audio'], { type: 'audio/webm' });
    document.getElementById('voice-player').src = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
    document.getElementById('voice-playback-box').classList.remove('hidden');
    document.getElementById('voice-status-text').textContent = 'Ovoz yozildi. Yuborishga tayyor.';
  }
}

function discardVoiceRecording() {
  clearInterval(timerInterval);
  audioBlob = null;
  audioChunks = [];
  document.getElementById('voice-timer').textContent = '00:00';
  document.getElementById('voice-playback-box').classList.add('hidden');
  document.getElementById('btn-mic-start').classList.remove('hidden');
  document.getElementById('btn-mic-stop').classList.add('hidden');
  document.getElementById('voice-status-text').textContent = 'Mikrofon tugmasini bosing va muammoni gapiring';
}

async function sendVoiceMessageAction() {
  const formData = new FormData();
  formData.append('title', 'Ovozli xabar');
  formData.append('description', `Fuqaro tomonidan ovozli murojaat (${document.getElementById('voice-timer').textContent})`);
  formData.append('category', 'security');
  formData.append('address', appState.selectedMahalla ? appState.selectedMahalla.address : "Bog'ishamol ko'chasi");
  formData.append('mahalla_id', appState.selectedMahalla ? appState.selectedMahalla.id : 'mah-1');
  formData.append('caller_phone', '+998901234567');

  if (audioBlob) {
    formData.append('audio_file', audioBlob, 'voice.webm');
  }

  try {
    await fetch('/api/reports', { method: 'POST', body: formData });
  } catch (e) {}

  closeVoiceRecorder();
  showSuccessBanner();
}

// --- Video Message Flow ---
function openVideoRecorder() {
  document.getElementById('citizen-main-actions').classList.add('hidden');
  document.getElementById('video-recorder-view').classList.remove('hidden');
  document.getElementById('voice-recorder-view').classList.add('hidden');
}

function closeVideoRecorder() {
  selectedVideoFile = null;
  document.getElementById('video-preview-box').classList.add('hidden');
  document.getElementById('video-picker-prompt').classList.remove('hidden');
  document.getElementById('video-recorder-view').classList.add('hidden');
  document.getElementById('citizen-main-actions').classList.remove('hidden');
}

function handleVideoFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedVideoFile = file;
  const url = URL.createObjectURL(file);
  const player = document.getElementById('video-player');
  player.src = url;
  document.getElementById('video-picker-prompt').classList.add('hidden');
  document.getElementById('video-preview-box').classList.remove('hidden');
}

async function sendVideoMessageAction() {
  const formData = new FormData();
  formData.append('title', 'Video xabar');
  formData.append('description', 'Kameradan qisqa video murojaat');
  formData.append('category', 'security');
  formData.append('address', appState.selectedMahalla ? appState.selectedMahalla.address : "Bog'ishamol ko'chasi");
  formData.append('mahalla_id', appState.selectedMahalla ? appState.selectedMahalla.id : 'mah-1');
  formData.append('caller_phone', '+998901234567');

  if (selectedVideoFile) {
    formData.append('media_file', selectedVideoFile);
  }

  try {
    await fetch('/api/reports', { method: 'POST', body: formData });
  } catch (e) {}

  closeVideoRecorder();
  showSuccessBanner();
}

// ==============================================================
// 5. Officer Dashboard (Standalone Web View)
// ==============================================================
async function loadOfficerReports() {
  const container = document.getElementById('officer-reports-container');
  try {
    const res = await fetch(`/api/officer/reports?officer_id=${appState.authenticatedOfficer?.id || 'insp-1'}`);
    const data = await res.json();
    appState.officerReports = data.reports || [];
    renderOfficerReports();
  } catch (err) {
    // Demo fallback reports
    appState.officerReports = [
      {
        id: 'rep-1',
        ticket_number: 'IIB-2026-9482',
        title: 'Ovozli tezkor xabar',
        description: 'Fuqaro tomonidan ovozli murojaat (00:24)',
        address: "Bog'ishamol ko'chasi 45-uy",
        audio_url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
        media_type: 'voice',
        caller_phone: '+998 90 123 45 67',
        status: 'new',
        created_at: new Date().toISOString(),
      },
    ];
    renderOfficerReports();
  }
}

function filterOfficerReports(status) {
  appState.officerFilter = status;
  ['all', 'new', 'resolved'].forEach((s) => {
    const btn = document.getElementById(`filter-${s}`);
    if (btn) {
      if (s === status) {
        btn.className = 'px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold';
      } else {
        btn.className = 'px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700';
      }
    }
  });
  renderOfficerReports();
}

function renderOfficerReports() {
  const container = document.getElementById('officer-reports-container');
  let list = appState.officerReports;
  if (appState.officerFilter !== 'all') {
    list = list.filter((r) => r.status === appState.officerFilter);
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 py-6 text-xs">Murojaatlar mavjud emas</div>';
    return;
  }

  container.innerHTML = list
    .map(
      (r) => `
      <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-sky-700">${r.ticket_number}</span>
            <span class="text-slate-400">·</span>
            <span class="text-slate-500">${new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            r.status === 'resolved'
              ? 'bg-emerald-100 text-emerald-800'
              : r.status === 'in_progress'
              ? 'bg-sky-100 text-sky-800'
              : 'bg-amber-100 text-amber-800'
          }">
            ${r.status === 'resolved' ? 'Hal qilindi' : r.status === 'in_progress' ? 'Jarayonda' : 'Yangi'}
          </span>
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-900">${r.title}</h4>
          <p class="text-xs text-slate-600 mt-0.5">${r.description}</p>
        </div>

        <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
          <span>📍 ${r.address}</span>
          <span class="font-mono text-slate-700">📞 ${r.caller_phone || '+998901234567'}</span>
        </div>

        ${
          r.audio_url
            ? `<div class="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-semibold text-slate-600 block mb-1">🎙 Ovozli xabar:</span>
                <audio controls src="${r.audio_url}" class="w-full h-8"></audio>
              </div>`
            : ''
        }

        ${
          r.file_url && r.media_type === 'video'
            ? `<div class="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-semibold text-slate-600 block mb-1">📹 Video xabar:</span>
                <video controls src="${r.file_url}" class="w-full h-36 rounded-lg bg-black object-cover"></video>
              </div>`
            : ''
        }

        <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 text-xs">
          ${
            r.status !== 'resolved'
              ? `<button onclick="updateReportStatus('${r.id}', 'resolved')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                  ✓ Hal qilindi
                </button>`
              : '<span class="text-emerald-700 font-semibold text-[11px]">Bajarilgan</span>'
          }
        </div>
      </div>
    `
    )
    .join('');
}

async function updateReportStatus(reportId, nextStatus) {
  try {
    await fetch('/api/officer/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, status: nextStatus }),
    });
  } catch (e) {}

  const target = appState.officerReports.find((r) => r.id === reportId);
  if (target) target.status = nextStatus;
  renderOfficerReports();
}

// Initial Boot on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});
