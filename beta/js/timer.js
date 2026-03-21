/**
 * js/timer.js — ResTracker PWA
 * Chess-style per-player timer.
 *
 * Supports two modes:
 *   stopwatch  — counts up from 0:00 per player
 *   countdown  — counts down from timerLimit per player
 *
 * Timer state is persisted to localStorage so it survives
 * tab switches, screen locks, and app restores.
 *
 * The timer display sits under the app header and is only
 * visible during an active game.
 *
 * Public API (on window.ResTracker):
 *   startYourTimer()    — start your timer, stop opponent's
 *   startOpponentTimer()— start opponent's timer, stop yours
 *   stopAllTimers()     — stop both timers (end/reset game)
 */


// ============================================================
//  CONSTANTS
// ============================================================
const TIMER_STORAGE_KEY = "restracker-timer-state";
const TIMER_TICK_MS     = 1000;  // Update interval in ms


// ============================================================
//  STATE
// ============================================================
let timerState    = null;
let tickInterval  = null;
let audioCtx      = null;  // Web Audio API context for alert sound


/**
 * Returns fresh default timer state from config.
 * Falls back to safe defaults if config is not yet available.
 */
function defaultTimerState() {
  const cfg = window.APP_CONFIG?.timer ?? { mode: "stopwatch", timerLimit: 30 * 60 };
  return {
    mode:          cfg.mode,
    limit:         cfg.timerLimit,
    active:        null,          // "you" | "opponent" | null
    yourElapsed:   0,             // Seconds elapsed on your timer
    oppElapsed:    0,             // Seconds elapsed on opponent's timer
    lastTickAt:    null,          // Timestamp of last tick (for calculating elapsed)
    expired:       null,          // "you" | "opponent" | null — who ran out
  };
}

function loadTimerState() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) {
      timerState = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn("[ResTracker] Failed to parse timer state:", e);
  }
  timerState = defaultTimerState();
}

function persistTimerState() {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
  } catch (e) {
    console.warn("[ResTracker] Failed to persist timer state:", e);
  }
}

function clearTimerState() {
  timerState = defaultTimerState();
  persistTimerState();
}


// ============================================================
//  TIMER CONTROL
// ============================================================

/**
 * Starts your timer and stops the opponent's.
 * Called when New Turn is pressed.
 */
function startYourTimer() {
  accrue();
  timerState.active    = "you";
  timerState.lastTickAt = Date.now();
  timerState.expired   = null;
  persistTimerState();
  startTick();
  renderTimer();
}

/**
 * Starts the opponent's timer and stops yours.
 * Called when End Turn is pressed.
 */
function startOpponentTimer() {
  accrue();
  timerState.active    = "opponent";
  timerState.lastTickAt = Date.now();
  timerState.expired   = null;
  persistTimerState();
  startTick();
  renderTimer();
}

/**
 * Stops both timers.
 * Called when End Game or Reset Game is pressed.
 */
function stopAllTimers() {
  accrue();
  timerState.active    = null;
  timerState.lastTickAt = null;
  stopTick();
  persistTimerState();
  renderTimer();
}

/**
 * Accrues elapsed time into the active player's counter
 * based on the time since lastTickAt.
 */
function accrue() {
  if (!timerState.active || !timerState.lastTickAt) return;
  const now     = Date.now();
  const elapsed = (now - timerState.lastTickAt) / 1000; // Keep as float
  if (timerState.active === "you") {
    timerState.yourElapsed += elapsed;
  } else {
    timerState.oppElapsed += elapsed;
  }
  timerState.lastTickAt = now;
}


// ============================================================
//  TICK
// ============================================================
function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    accrue();
    persistTimerState();
    renderTimer();
    checkExpiry();
  }, TIMER_TICK_MS);
}

function stopTick() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

/**
 * Checks if either player's countdown has expired.
 */
function checkExpiry() {
  if (timerState.mode !== "countdown") return;
  const limit = timerState.limit;

  let expired = null;
  if (timerState.yourElapsed >= limit && timerState.active === "you") {
    expired = "you";
  } else if (timerState.oppElapsed >= limit && timerState.active === "opponent") {
    expired = "opponent";
  }

  if (expired && timerState.expired !== expired) {
    timerState.expired = expired;
    stopAllTimers();
    triggerAlert(expired);
  }
}


// ============================================================
//  ALERT
// ============================================================
function triggerAlert(player) {
  const cfg = window.APP_CONFIG.timer;
  const name = player === "you"
    ? window.APP_CONFIG.players.yourName
    : window.APP_CONFIG.players.opponentName;

  if (cfg.alertFlash) startFlash(player);
  if (cfg.alertSound) playAlertSound();

  console.log(`[ResTracker] Timer expired for ${name}`);
}

/**
 * Flashes the expired player's timer display.
 */
function startFlash(player) {
  const id  = player === "you" ? "timer-you" : "timer-opp";
  const el  = document.getElementById(id);
  if (!el) return;

  let count = 0;
  const flash = setInterval(() => {
    el.classList.toggle("timer__value--expired");
    if (++count >= 12) {
      clearInterval(flash);
      el.classList.add("timer__value--expired");
    }
  }, 300);
}

/**
 * Plays a short beep using the Web Audio API.
 */
function playAlertSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type      = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1.2);
  } catch (e) {
    console.warn("[ResTracker] Could not play alert sound:", e);
  }
}


// ============================================================
//  RENDER
// ============================================================

/**
 * Renders the timer bar under the app header.
 * Only visible during an active game (controlled via CSS class).
 */
function renderTimer() {
  if (!timerState) return;
  const bar = document.getElementById("timer-bar");
  if (!bar) return;

  const cfg      = window.APP_CONFIG ?? {};
  // Read names from saved settings if available, fall back to config defaults
  let yourName = cfg.players?.yourName     ?? "You";
  let oppName  = cfg.players?.opponentName ?? "Opponent";
  try {
    const savedSettings = localStorage.getItem("restracker-settings");
    if (savedSettings) {
      const s = JSON.parse(savedSettings);
      if (s.yourName)     yourName = s.yourName;
      if (s.opponentName) oppName  = s.opponentName;
    }
  } catch (e) {}
  const mode     = timerState.mode   ?? "stopwatch";
  const limit    = timerState.limit  ?? 1800;

  const yourDisplay = mode === "countdown"
    ? formatTime(Math.max(0, limit - timerState.yourElapsed))
    : formatTime(timerState.yourElapsed);

  const oppDisplay = mode === "countdown"
    ? formatTime(Math.max(0, limit - timerState.oppElapsed))
    : formatTime(timerState.oppElapsed);

  const yourActive = timerState.active === "you";
  const oppActive  = timerState.active === "opponent";

  document.getElementById("timer-you-name").textContent = yourName;
  document.getElementById("timer-opp-name").textContent = oppName;

  const yourVal = document.getElementById("timer-you");
  const oppVal  = document.getElementById("timer-opp");

  if (yourVal) {
    yourVal.textContent = yourDisplay;
    yourVal.className   = "timer__value font-mono"
      + (yourActive ? " timer__value--active" : "")
      + (timerState.expired === "you" ? " timer__value--expired" : "");
  }

  if (oppVal) {
    oppVal.textContent = oppDisplay;
    oppVal.className   = "timer__value font-mono"
      + (oppActive ? " timer__value--active" : "")
      + (timerState.expired === "opponent" ? " timer__value--expired" : "");
  }
}

/**
 * Shows or hides the timer bar based on game phase.
 * @param {boolean} visible
 */
function setTimerVisible(visible) {
  const bar = document.getElementById("timer-bar");
  if (bar) bar.classList.toggle("hidden", !visible);
}

/**
 * Formats seconds into M:SS or H:MM:SS.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const total = Math.floor(seconds); // Floor here so display is always whole seconds
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}


// ============================================================
//  SELF-INIT
//  Timer bar is injected immediately on DOMContentLoaded so
//  it is available before game.js tries to show/hide it.
// ============================================================
function injectTimerBar() {
  if (document.getElementById("timer-bar")) return; // Already injected
  const header = document.getElementById("app-header");
  if (!header) return;
  const bar = document.createElement("div");
  bar.id        = "timer-bar";
  bar.className = "timer-bar hidden";
  bar.innerHTML = `
    <div class="timer__player">
      <span class="timer__name" id="timer-you-name">You</span>
      <span class="timer__value font-mono" id="timer-you">0:00</span>
    </div>
    <div class="timer__divider"></div>
    <div class="timer__player">
      <span class="timer__name" id="timer-opp-name">Opponent</span>
      <span class="timer__value font-mono" id="timer-opp">0:00</span>
    </div>
  `;
  header.insertAdjacentElement("afterend", bar);
}

function initTimer() {
  loadTimerState();
  // Timer bar is in index.html — no injection needed

  // Resume tick if a timer was active when the page was closed
  if (timerState?.active) {
    startTick();
  }

  renderTimer();
  console.log("[ResTracker] Timer module initialised.");
}


// ============================================================
//  PUBLIC API
// ============================================================
if (typeof window !== "undefined") {
  window.ResTracker = window.ResTracker || {};
  window.ResTracker.startYourTimer     = startYourTimer;
  window.ResTracker.startOpponentTimer = startOpponentTimer;
  window.ResTracker.stopAllTimers      = stopAllTimers;
  window.ResTracker.setTimerVisible    = setTimerVisible;
  window.ResTracker.clearTimerState    = clearTimerState;
  window.ResTracker.renderTimer        = renderTimer;
}