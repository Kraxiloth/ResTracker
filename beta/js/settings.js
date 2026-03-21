/**
 * js/settings.js — ResTracker PWA
 * Settings screen module.
 *
 * Renders into #view-settings and allows the user to configure:
 *   - Player names (you / opponent)
 *   - Timer mode (stopwatch / countdown)
 *   - Timer limit (countdown duration)
 *   - Colour theme
 *   - Clear cache (wipes all localStorage)
 *
 * Settings are persisted to localStorage and applied immediately.
 */


// ============================================================
//  CONSTANTS
// ============================================================
const SETTINGS_STORAGE_KEY = "restracker-settings";


// ============================================================
//  STATE
//  Runtime settings — merged from config defaults and localStorage.
// ============================================================
let settings = null;

function defaultSettings() {
  const cfg = window.APP_CONFIG ?? {};
  return {
    yourName:     cfg.players?.yourName     ?? "You",
    opponentName: cfg.players?.opponentName ?? "Opponent",
    timerMode:    cfg.timer?.mode           ?? "stopwatch",
    timerLimit:   cfg.timer?.timerLimit     ?? 1800,
    theme:        cfg.activeTheme           ?? "dark",
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      // Merge saved settings over defaults so new keys are always present
      settings = { ...defaultSettings(), ...JSON.parse(raw) };
      return;
    }
  } catch (e) {
    console.warn("[ResTracker] Failed to parse settings:", e);
  }
  settings = defaultSettings();
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("[ResTracker] Failed to persist settings:", e);
  }
}


// ============================================================
//  APPLY
//  Push current settings into the rest of the app.
// ============================================================
function applySettings() {
  // Theme
  window.ResTracker?.applyTheme?.(settings.theme);

  // Player names in timer bar
  const yourNameEl = document.getElementById("timer-you-name");
  const oppNameEl  = document.getElementById("timer-opp-name");
  if (yourNameEl) yourNameEl.textContent = settings.yourName;
  if (oppNameEl)  oppNameEl.textContent  = settings.opponentName;

  // Update timer state mode and limit
  try {
    const raw = localStorage.getItem("restracker-timer-state");
    if (raw) {
      const timerState       = JSON.parse(raw);
      timerState.mode        = settings.timerMode;
      timerState.limit       = settings.timerLimit;
      localStorage.setItem("restracker-timer-state", JSON.stringify(timerState));
    }
  } catch (e) {
    console.warn("[ResTracker] Failed to update timer state from settings:", e);
  }

  window.ResTracker?.renderTimer?.();
}


// ============================================================
//  RENDER
// ============================================================
function renderSettings() {
  const view = document.getElementById("view-settings");
  if (!view) return;

  const cfg    = window.APP_CONFIG;
  const themes = cfg.themes;

  view.innerHTML = `

    <!-- ── Player Names ── -->
    <div class="settings-section">
      <p class="settings-section__label">Players</p>

      <div class="settings-row">
        <label class="settings-row__label" for="setting-your-name">Your Name</label>
        <input
          class="settings-row__input"
          id="setting-your-name"
          type="text"
          maxlength="20"
          value="${settingsEsc(settings.yourName)}"
          placeholder="You"
        />
      </div>

      <div class="settings-row">
        <label class="settings-row__label" for="setting-opp-name">Opponent Name</label>
        <input
          class="settings-row__input"
          id="setting-opp-name"
          type="text"
          maxlength="20"
          value="${settingsEsc(settings.opponentName)}"
          placeholder="Opponent"
        />
      </div>
    </div>

    <!-- ── Timer ── -->
    <div class="settings-section">
      <p class="settings-section__label">Timer</p>

      <div class="settings-row">
        <label class="settings-row__label" for="setting-timer-mode">Mode</label>
        <select class="settings-row__select" id="setting-timer-mode">
          <option value="stopwatch" ${settings.timerMode === "stopwatch" ? "selected" : ""}>Stopwatch</option>
          <option value="countdown" ${settings.timerMode === "countdown" ? "selected" : ""}>Countdown</option>
        </select>
      </div>

      <div class="settings-row settings-row--countdown ${settings.timerMode === "countdown" ? "" : "hidden"}" id="row-timer-limit">
        <label class="settings-row__label" for="setting-timer-limit">Limit (minutes)</label>
        <input
          class="settings-row__input settings-row__input--sm"
          id="setting-timer-limit"
          type="number"
          min="1"
          max="999"
          value="${Math.floor(settings.timerLimit / 60)}"
        />
      </div>
    </div>

    <!-- ── Theme ── -->
    <div class="settings-section">
      <p class="settings-section__label">Colour Theme</p>
      <div class="settings-themes">
        ${Object.entries(themes).map(([key, theme]) => `
          <button
            class="settings-theme-btn ${settings.theme === key ? "settings-theme-btn--active" : ""}"
            data-theme="${key}"
            style="--theme-accent: ${theme.properties["--accent"]}; --theme-bg: ${theme.properties["--bg-primary"]};"
          >
            <span class="settings-theme-btn__swatch"></span>
            <span class="settings-theme-btn__label">${theme.label}</span>
          </button>
        `).join("")}
      </div>
    </div>

    <!-- ── Cache ── -->
    <div class="settings-section settings-section--last">
      <p class="settings-section__label">Data</p>
      <button class="settings-danger-btn" id="btn-clear-cache">
        Clear All Data
      </button>
      <p class="settings-hint">Clears all saved game state, log, timer and settings. Cannot be undone.</p>
    </div>

    <!-- ── Clear Cache Confirmation Modal ── -->
    <div class="game-modal hidden" id="modal-clear-cache" role="dialog" aria-modal="true">
      <div class="game-modal__box">
        <p class="game-modal__title">Clear All Data</p>
        <p class="game-modal__subtitle">This will wipe everything. Are you sure?</p>
        <div class="game-modal__row">
          <button class="game-modal__btn game-modal__btn--danger" id="btn-clear-confirm">Clear</button>
          <button class="game-modal__btn" id="btn-clear-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  attachSettingsListeners();
}

function attachSettingsListeners() {

  // Player names — save on blur
  const yourNameInput = document.getElementById("setting-your-name");
  const oppNameInput  = document.getElementById("setting-opp-name");

  yourNameInput?.addEventListener("blur", () => {
    settings.yourName = yourNameInput.value.trim() || "You";
    yourNameInput.value = settings.yourName;
    persistSettings();
    applySettings();
  });

  oppNameInput?.addEventListener("blur", () => {
    settings.opponentName = oppNameInput.value.trim() || "Opponent";
    oppNameInput.value = settings.opponentName;
    persistSettings();
    applySettings();
  });

  // Timer mode
  document.getElementById("setting-timer-mode")?.addEventListener("change", (e) => {
    settings.timerMode = e.target.value;
    const limitRow = document.getElementById("row-timer-limit");
    if (limitRow) limitRow.classList.toggle("hidden", settings.timerMode !== "countdown");
    persistSettings();
    applySettings();
  });

  // Timer limit
  document.getElementById("setting-timer-limit")?.addEventListener("change", (e) => {
    const mins = Math.max(1, parseInt(e.target.value, 10) || 30);
    settings.timerLimit = mins * 60;
    e.target.value = mins;
    persistSettings();
    applySettings();
  });

  // Theme buttons
  document.querySelectorAll(".settings-theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.theme = btn.dataset.theme;
      persistSettings();
      applySettings();
      // Update active state without full re-render
      document.querySelectorAll(".settings-theme-btn").forEach(b => {
        b.classList.toggle("settings-theme-btn--active", b.dataset.theme === settings.theme);
      });
    });
  });

  // Clear cache
  document.getElementById("btn-clear-cache")?.addEventListener("click", () => {
    const modal = document.getElementById("modal-clear-cache");
    if (modal) modal.classList.remove("hidden");
  });

  document.getElementById("btn-clear-confirm")?.addEventListener("click", () => {
    localStorage.clear();
    settings = defaultSettings();
    applySettings();
    renderSettings();
    // Also re-render other views to reflect cleared state
    window.ResTracker?.clearTimerState?.();
    window.ResTracker?.setTimerVisible?.(false);
    console.log("[ResTracker] All data cleared.");
  });

  document.getElementById("btn-clear-cancel")?.addEventListener("click", () => {
    const modal = document.getElementById("modal-clear-cache");
    if (modal) modal.classList.add("hidden");
  });
}

function settingsEsc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}


// ============================================================
//  SELF-INIT
// ============================================================
function initSettings() {
  loadSettings();
  applySettings();
  renderSettings();

  // Re-render when Settings tab is tapped
  document.querySelectorAll(".nav-item[data-view='view-settings']").forEach(btn => {
    btn.addEventListener("click", renderSettings);
  });

  console.log("[ResTracker] Settings module initialised.");
}