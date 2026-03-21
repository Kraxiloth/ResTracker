/**
 * js/game.js — ResTracker PWA
 * Game screen feature module.
 *
 * Responsibilities:
 *   - Render the game screen UI into #view-game
 *   - Manage game state (life, mana, thresholds, turn, phase)
 *   - Persist state to localStorage
 *   - Emit events to the log (via window.ResTracker.log)
 *
 * State is initialised from config.js gameDefaults.
 * All DOM is built programmatically — no HTML templates needed.
 */


// ============================================================
//  CONSTANTS
// ============================================================
const STORAGE_KEY = "restracker-game-state";

const PHASE = {
  IDLE:       "idle",        // No game in progress
  YOUR_TURN:  "your_turn",   // Your turn active
  THEIR_TURN: "their_turn",  // Opponent's turn active
  ENDED:      "ended",       // Game ended, awaiting reset
};

const THRESHOLDS = ["air", "earth", "fire", "water"];

const THRESHOLD_COLOURS = {
  air:   "rgb(170, 180, 215)",
  earth: "rgb(169, 158, 125)",
  fire:  "rgb(242, 92, 36)",
  water: "rgb(101, 191, 220)",
};


// ============================================================
//  STATE
//  Single source of truth for the current game.
//  Always read from and write to this object,
//  then call persistState() to save to localStorage.
// ============================================================
let state = null;

/**
 * Returns a fresh default state from config.
 */
function defaultState() {
  const d = window.APP_CONFIG.gameDefaults;
  return {
    gameDefaultsVersion: d.version,   // Used to detect stale localStorage state
    phase:               PHASE.IDLE,
    life:                d.startingLife,
    lifeMax:             d.startingLifeMax,
    manaCurrent:         d.startingMana,
    manaMax:             d.startingManaMax,
    thresholds:          { ...d.startingThresholds },
    turnNumber:          0,
  };
}

/**
 * Loads state from localStorage, falling back to defaults.
 * If the saved state's gameDefaultsVersion doesn't match config,
 * the stale state is discarded and fresh defaults are used.
 */
function loadState() {
  const configVersion = window.APP_CONFIG.gameDefaults.version;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.gameDefaultsVersion === configVersion) {
        state = saved;
        return;
      }
      console.log("[ResTracker] Game defaults version changed — discarding stale state.");
    }
  } catch (e) {
    console.warn("[ResTracker] Failed to parse game state:", e);
  }
  state = defaultState();
}

/**
 * Persists current state to localStorage.
 */
function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[ResTracker] Failed to persist game state:", e);
  }
}


// ============================================================
//  LOGGING
//  Writes events directly to localStorage under LOG_EVENTS_KEY.
//  log.js reads from localStorage independently — fully decoupled.
// ============================================================
const LOG_EVENTS_KEY = "restracker-log-events";

function logEvent(type, detail = {}) {
  try {
    const raw    = localStorage.getItem(LOG_EVENTS_KEY);
    const events = raw ? JSON.parse(raw) : [];
    events.push({ type, detail, timestamp: Date.now() });
    localStorage.setItem(LOG_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("[ResTracker] Failed to write log event:", e);
  }
}

function clearLogEvents() {
  try {
    localStorage.removeItem(LOG_EVENTS_KEY);
  } catch (e) {
    console.warn("[ResTracker] Failed to clear log events:", e);
  }
}


// ============================================================
//  GAME ACTIONS
//  Each action mutates state, persists it, and re-renders.
// ============================================================

/**
 * Starts a new game.
 * @param {string} firstTurn — "you" or "opponent"
 */
function startGame(firstTurn) {
  state = defaultState();
  state.phase      = firstTurn === "you" ? PHASE.YOUR_TURN : PHASE.THEIR_TURN;
  state.turnNumber = 1;
  clearLogEvents();
  window.ResTracker?.clearTimerState?.();
  persistState();
  logEvent("game_start", { firstTurn });
  if (firstTurn === "you") {
    window.ResTracker?.startYourTimer?.();
  } else {
    window.ResTracker?.startOpponentTimer?.();
  }
  window.ResTracker?.setTimerVisible?.(true);
  render();
}

/**
 * Ends the current turn.
 * Switches phase between YOUR_TURN and THEIR_TURN.
 * Logs the end of the current half-turn and starts a new
 * log group for the opponent's half-turn immediately.
 */
function endTurn() {
  if (state.phase !== PHASE.YOUR_TURN) return;
  state.phase = PHASE.THEIR_TURN;

  logEvent("turn_end", { turn: state.turnNumber, player: "you" });
  logEvent("opponent_turn_start", { turn: state.turnNumber });
  window.ResTracker?.startOpponentTimer?.();

  persistState();
  render();
}

/**
 * Starts a new turn (your turn).
 * Only callable when it is the opponent's turn.
 * Sets current mana to max mana, increments turn counter,
 * and opens a new log group for your turn.
 */
function newTurn() {
  if (state.phase !== PHASE.THEIR_TURN) return;
  state.phase = PHASE.YOUR_TURN;
  state.turnNumber++;
  state.manaCurrent = state.manaMax;
  logEvent("turn_start", { turn: state.turnNumber });
  window.ResTracker?.startYourTimer?.();
  persistState();
  render();
}

/**
 * Ends the game and records the winner.
 * @param {string} winner — "you" or "opponent"
 */
function endGame(winner) {
  state.phase = PHASE.ENDED;
  window.ResTracker?.stopAllTimers?.();
  window.ResTracker?.setTimerVisible?.(false);
  persistState();
  logEvent("game_end", { winner });
  render();
}

/**
 * Resets all state back to defaults.
 */
function resetGame() {
  state = defaultState();
  window.ResTracker?.stopAllTimers?.();
  window.ResTracker?.clearTimerState?.();
  window.ResTracker?.setTimerVisible?.(false);
  persistState();
  logEvent("game_reset", {});
  render();
}

/**
 * Universal value adjustment function.
 * All counter +/- buttons route through here.
 *
 * @param {object} opts
 * @param {function} opts.getValue   — () => current numeric value
 * @param {function} opts.setValue   — (n) => writes the new value to state
 * @param {number}   opts.delta      — +1 or -1
 * @param {number}   [opts.min=0]    — minimum allowed value
 * @param {number}   [opts.max=Infinity] — maximum allowed value
 * @param {string}   [opts.logType]  — event type string for the log
 * @param {object}   [opts.logDetail={}] — extra fields merged into the log entry
 */
function adjustValue({ getValue, setValue, delta, min = 0, max = Infinity, logType = null, logDetail = {} }) {
  if (state.phase === PHASE.IDLE || state.phase === PHASE.ENDED) return;

  const from     = getValue();
  const clamped  = Math.min(max, Math.max(min, from + delta));
  const actual   = clamped - from;

  if (actual === 0) return; // Already at boundary — nothing to do

  setValue(clamped);

  if (logType) {
    logEvent(logType, { ...logDetail, from, to: clamped, delta: actual });
  }

  persistState();
  renderValues();
}


// ============================================================
//  MODALS
// ============================================================

/**
 * Shows the Start Game modal.
 */
function showStartModal() {
  const modal = document.getElementById("modal-start-game");
  if (modal) modal.classList.remove("hidden");
}

/**
 * Hides the Start Game modal.
 */
function hideStartModal() {
  const modal = document.getElementById("modal-start-game");
  if (modal) modal.classList.add("hidden");
}

/**
 * Shows the End Game confirmation modal.
 */
function showEndGameModal() {
  const modal = document.getElementById("modal-end-game");
  if (modal) modal.classList.remove("hidden");
}

/**
 * Hides the End Game confirmation modal.
 */
function hideEndGameModal() {
  const modal = document.getElementById("modal-end-game");
  if (modal) modal.classList.add("hidden");
}

/**
 * Shows the Reset Game confirmation modal.
 */
function showResetModal() {
  const modal = document.getElementById("modal-reset-game");
  if (modal) modal.classList.remove("hidden");
}

/**
 * Hides the Reset Game confirmation modal.
 */
function hideResetModal() {
  const modal = document.getElementById("modal-reset-game");
  if (modal) modal.classList.add("hidden");
}


// ============================================================
//  RENDER
//  Builds the full game screen DOM on first load,
//  then renderValues() updates only the dynamic parts.
// ============================================================

/**
 * Full render — rebuilds the entire game screen.
 * Called on init and after any phase change.
 */
function render() {
  const view = document.getElementById("view-game");
  if (!view) return;

  view.innerHTML = `
    <!-- ── Life ── -->
    <div class="game-section" id="section-life">
      <p class="game-section__label">Life</p>
      <div class="game-counter game-counter--lg">
        <button class="game-btn game-btn--lg" id="btn-life-dec" aria-label="Decrease life">−</button>
        <span class="game-counter__value game-counter__value--lg font-mono" id="val-life"></span>
        <button class="game-btn game-btn--lg" id="btn-life-inc" aria-label="Increase life">+</button>
      </div>
    </div>

    <!-- ── Mana ── -->
    <div class="game-section" id="section-mana">
      <p class="game-section__label">Mana</p>
      <div class="game-mana">
        <div class="game-mana__cluster">
          <span class="game-mana__cluster-label">Cur</span>
          <div class="game-mana__cluster-btns">
            <button class="game-btn game-btn--xs" id="btn-mana-cur-dec" aria-label="Decrease current mana">−</button>
            <button class="game-btn game-btn--xs" id="btn-mana-cur-inc" aria-label="Increase current mana">+</button>
          </div>
        </div>
        <div class="game-mana__fraction">
          <span class="game-mana__value font-mono" id="val-mana-cur"></span>
          <span class="game-mana__sep">/</span>
          <span class="game-mana__value font-mono" id="val-mana-max"></span>
        </div>
        <div class="game-mana__cluster">
          <span class="game-mana__cluster-label">Max</span>
          <div class="game-mana__cluster-btns">
            <button class="game-btn game-btn--xs" id="btn-mana-max-dec" aria-label="Decrease max mana">−</button>
            <button class="game-btn game-btn--xs" id="btn-mana-max-inc" aria-label="Increase max mana">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Turn buttons ── -->
    <div class="game-section game-section--row game-section--actions" id="section-turns">
      <button class="game-action-btn" id="btn-new-turn">New Turn</button>
      <button class="game-action-btn game-action-btn--primary" id="btn-end-turn">End Turn</button>
    </div>

    <!-- ── Thresholds ── -->
    <div class="game-section" id="section-thresholds">
      <p class="game-section__label">Thresholds</p>
      <div class="game-thresholds">
        ${THRESHOLDS.map(el => `
          <div class="game-threshold-cell">
            <img class="game-threshold-cell__icon" src="res/${el}.png" alt="${capitalise(el)}">
            <button class="game-btn game-btn--xs" data-threshold="${el}" data-delta="-1" aria-label="Decrease ${el}">−</button>
            <span class="game-threshold-cell__value" id="val-thr-${el}" style="color:${THRESHOLD_COLOURS[el]}"></span>
            <button class="game-btn game-btn--xs" data-threshold="${el}" data-delta="1" aria-label="Increase ${el}">+</button>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- ── End Game / Reset Game ── -->
    <div class="game-section game-section--row game-section--actions game-section--last" id="section-game-btns">
      <button class="game-action-btn game-action-btn--danger" id="btn-end-game">End Game</button>
      <button class="game-action-btn" id="btn-reset-game">Reset Game</button>
    </div>

    <!-- ── Start Game Modal ── -->
    <div class="game-modal hidden" id="modal-start-game" role="dialog" aria-modal="true" aria-labelledby="modal-start-title">
      <div class="game-modal__box">
        <p class="game-modal__title" id="modal-start-title">New Game</p>
        <p class="game-modal__subtitle">Who takes the first turn?</p>
        <div class="game-modal__row">
          <button class="game-modal__btn game-modal__btn--accent" id="btn-start-you">You</button>
          <button class="game-modal__btn" id="btn-start-opponent">Opponent</button>
        </div>
        <button class="game-modal__cancel" id="btn-start-cancel">Cancel</button>
      </div>
    </div>

    <!-- ── End Game Modal ── -->
    <div class="game-modal hidden" id="modal-end-game" role="dialog" aria-modal="true" aria-labelledby="modal-end-title">
      <div class="game-modal__box">
        <p class="game-modal__title" id="modal-end-title">End Game</p>
        <p class="game-modal__subtitle">Who won?</p>
        <div class="game-modal__row">
          <button class="game-modal__btn game-modal__btn--success" id="btn-winner-you">You</button>
          <button class="game-modal__btn game-modal__btn--danger" id="btn-winner-opponent">Opponent</button>
        </div>
        <button class="game-modal__cancel" id="btn-end-cancel">Cancel</button>
      </div>
    </div>

    <!-- ── Reset Game Modal ── -->
    <div class="game-modal hidden" id="modal-reset-game" role="dialog" aria-modal="true" aria-labelledby="modal-reset-title">
      <div class="game-modal__box">
        <p class="game-modal__title" id="modal-reset-title">Reset Game</p>
        <p class="game-modal__subtitle">Reset all counters to defaults?</p>
        <div class="game-modal__row">
          <button class="game-modal__btn game-modal__btn--danger" id="btn-reset-confirm">Reset</button>
          <button class="game-modal__btn" id="btn-reset-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  renderValues();
  renderPhase();
}

/**
 * Partial render — updates only value displays.
 * Called after counter changes to avoid full DOM rebuild.
 */
function renderValues() {
  renderPaddedValue("val-life",     state.life);
  renderPaddedValue("val-mana-cur", state.manaCurrent);
  renderPaddedValue("val-mana-max", state.manaMax);
  THRESHOLDS.forEach(element => {
    renderPaddedValue(`val-thr-${element}`, state.thresholds[element]);
  });
}

/**
 * Updates button enabled/disabled states to match current phase.
 */
function renderPhase() {
  const idle    = state.phase === PHASE.IDLE;
  const ended   = state.phase === PHASE.ENDED;
  const yours   = state.phase === PHASE.YOUR_TURN;
  const theirs  = state.phase === PHASE.THEIR_TURN;
  const active  = yours || theirs;

  // Counters — only interactive during an active game
  setDisabled("btn-life-dec",      !active);
  setDisabled("btn-life-inc",      !active);
  setDisabled("btn-mana-cur-dec",  !active);
  setDisabled("btn-mana-cur-inc",  !active);
  setDisabled("btn-mana-max-dec",  !active);
  setDisabled("btn-mana-max-inc",  !active);
  THRESHOLDS.forEach(el => {
    setDisabled(`btn-thr-dec-${el}`, !active);
    setDisabled(`btn-thr-inc-${el}`, !active);
  });

  // Dim counter sections when inactive
  setOpacity("section-life",       active ? "1" : "0.35");
  setOpacity("section-mana",       active ? "1" : "0.35");
  setOpacity("section-thresholds", active ? "1" : "0.35");

  // New Game header button — disabled while a game is in progress
  const headerBtn = document.getElementById("btn-header-new-game");
  if (headerBtn) {
    headerBtn.disabled = active;
    headerBtn.style.opacity = active ? "0.35" : "1";
    headerBtn.style.cursor  = active ? "not-allowed" : "pointer";
  }

  // Turn buttons
  // New Turn: enabled only when it's the opponent's turn (to pass back to you)
  //           or at the start of game before first move
  // End Turn: enabled only when it's your turn
  setDisabled("btn-new-turn", !active || yours);
  setDisabled("btn-end-turn", !active || !yours);
  setAccent("btn-new-turn",  active && theirs);
  setAccent("btn-end-turn",  active && yours);

  // Game buttons
  setDisabled("btn-end-game",   idle || ended);
  setDanger("btn-end-game",     !idle && !ended);
}


// ============================================================
//  EVENT LISTENERS
// ============================================================
function attachListeners() {

  // Life — clamped between 0 and startingLifeMax
  const lifeMax = window.APP_CONFIG.gameDefaults.startingLifeMax;
  on("btn-life-dec", "click", () => adjustValue({
    getValue:  () => state.life,
    setValue:  (n) => { state.life = n; },
    delta:     -1,
    min:       0,
    max:       lifeMax,
    logType:   "life_change",
  }));
  on("btn-life-inc", "click", () => adjustValue({
    getValue:  () => state.life,
    setValue:  (n) => { state.life = n; },
    delta:     +1,
    min:       0,
    max:       lifeMax,
    logType:   "life_change",
  }));

  // Mana current — uncapped above (can exceed max via special effects)
  on("btn-mana-cur-dec", "click", () => adjustValue({
    getValue:  () => state.manaCurrent,
    setValue:  (n) => { state.manaCurrent = n; },
    delta:     -1,
    min:       0,
    logType:   "mana_cur_change",
  }));
  on("btn-mana-cur-inc", "click", () => adjustValue({
    getValue:  () => state.manaCurrent,
    setValue:  (n) => { state.manaCurrent = n; },
    delta:     +1,
    min:       0,
    logType:   "mana_cur_change",
  }));

  // Mana max — clamped between 0 and 20 (max sites on the board)
  // Incrementing max also increments current (placing a site gives mana immediately)
  on("btn-mana-max-dec", "click", () => adjustValue({
    getValue:  () => state.manaMax,
    setValue:  (n) => { state.manaMax = n; },
    delta:     -1,
    min:       0,
    max:       20,
    logType:   "mana_max_change",
  }));
  on("btn-mana-max-inc", "click", () => {
    adjustValue({
      getValue:  () => state.manaMax,
      setValue:  (n) => { state.manaMax = n; },
      delta:     +1,
      min:       0,
      max:       20,
      logType:   "mana_max_change",
    });
    // Also give 1 current mana immediately — placing a site makes it usable at once
    adjustValue({
      getValue:  () => state.manaCurrent,
      setValue:  (n) => { state.manaCurrent = n; },
      delta:     +1,
      min:       0,
      logType:   "mana_cur_change",
    });
  });

  // Thresholds — delegated from the threshold section
  const thrSection = document.getElementById("section-thresholds");
  if (thrSection) {
    thrSection.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-threshold]");
      if (!btn) return;
      const element = btn.dataset.threshold;
      const delta   = parseInt(btn.dataset.delta, 10);
      adjustValue({
        getValue:  () => state.thresholds[element] ?? 0,
        setValue:  (n) => { state.thresholds[element] = n; },
        delta,
        min:       0,
        max:       20,
        logType:   "threshold_change",
        logDetail: { element },
      });
    });
  }

  // Turn buttons
  on("btn-new-turn", "click", newTurn);
  on("btn-end-turn", "click", endTurn);

  // End Game button → show modal (or show start modal if idle)
  on("btn-end-game",  "click", showEndGameModal);
  on("btn-reset-game","click", showResetModal);

  // Header new game button
  on("btn-header-new-game", "click", showStartModal);

  // Start Game modal
  on("btn-start-you",      "click", () => { hideStartModal(); startGame("you"); });
  on("btn-start-opponent", "click", () => { hideStartModal(); startGame("opponent"); });
  on("btn-start-cancel",   "click", hideStartModal);

  // End Game modal
  on("btn-winner-you",      "click", () => { hideEndGameModal(); endGame("you"); });
  on("btn-winner-opponent", "click", () => { hideEndGameModal(); endGame("opponent"); });
  on("btn-end-cancel",      "click", hideEndGameModal);

  // Reset Game modal
  on("btn-reset-confirm", "click", () => { hideResetModal(); resetGame(); });
  on("btn-reset-cancel",  "click", hideResetModal);
}


// ============================================================
//  DOM HELPERS
// ============================================================
const el  = (id) => document.getElementById(id);
const on  = (id, evt, fn) => el(id)?.addEventListener(evt, fn);

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

function setDisabled(id, disabled) {
  const node = el(id);
  if (!node) return;
  node.disabled = disabled;
  node.classList.toggle("game-btn--disabled", disabled);
  node.classList.toggle("game-action-btn--disabled", disabled);
}

function setOpacity(id, opacity) {
  const node = el(id);
  if (node) node.style.opacity = opacity;
}

function setAccent(id, active) {
  const node = el(id);
  if (!node) return;
  node.classList.toggle("game-action-btn--primary", active);
}

function setDanger(id, active) {
  const node = el(id);
  if (!node) return;
  node.classList.toggle("game-action-btn--danger", active);
}

/**
 * Zero-pads a number to always show at least 2 digits.
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(Math.max(0, n ?? 0)).padStart(2, "0");
}

/**
 * Renders a number into a fixed-width element.
 * Values 0-9 display as a single digit, right-aligned within
 * the reserved two-digit space — no leading zero, no layout shift.
 * Values 10+ display normally.
 * @param {string} id    — element id to render into
 * @param {number} value — the numeric value to display
 */
function renderPaddedValue(id, value) {
  const node = el(id);
  if (!node) return;
  const n = Math.max(0, value ?? 0);
  node.textContent = String(n);
}

/**
 * Capitalises the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// ============================================================
//  INIT
//  Called by app.js after the DOM is ready.
// ============================================================
function _initGame() {
  loadState();
  render();

  // Add a New Game button to the header
  const header = document.getElementById("app-header");
  if (header) {
    const btn = document.createElement("button");
    btn.id        = "btn-header-new-game";
    btn.className = "header-btn";
    btn.textContent = "New Game";
    btn.addEventListener("click", showStartModal);
    header.appendChild(btn);
  }

  console.log("[ResTracker] Game module initialised.");
}


// ============================================================
//  PUBLIC INIT
//  Called by app.js in dependency order.
// ============================================================
function initGame() {
  _initGame();

  // Restore timer visibility if a game was already in progress
  const active = state?.phase === PHASE.YOUR_TURN || state?.phase === PHASE.THEIR_TURN;
  window.ResTracker?.setTimerVisible?.(active);
  window.ResTracker?.renderTimer?.();
}

// Also expose on public API for external access if needed
if (typeof window !== "undefined") {
  window.ResTracker = window.ResTracker || {};
  window.ResTracker.initGame = initGame;
}