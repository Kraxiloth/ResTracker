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
    phase:      PHASE.IDLE,
    life:       d.startingLife,
    manaCurrent: d.startingMana,
    manaMax:    d.startingManaMax,
    thresholds: { ...d.startingThresholds },
    turnNumber: 0,
  };
}

/**
 * Loads state from localStorage, falling back to defaults.
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      return;
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
//  Emits events to the log module if available.
//  Safe to call even if the log module isn't loaded yet.
// ============================================================
function logEvent(type, detail = {}) {
  if (window.ResTracker?.addLogEntry) {
    window.ResTracker.addLogEntry({ type, detail, timestamp: Date.now() });
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
  state.phase     = firstTurn === "you" ? PHASE.YOUR_TURN : PHASE.THEIR_TURN;
  state.turnNumber = 1;
  persistState();
  logEvent("game_start", { firstTurn });
  render();
}

/**
 * Ends the current turn.
 * Switches phase between YOUR_TURN and THEIR_TURN.
 */
function endTurn() {
  if (state.phase !== PHASE.YOUR_TURN && state.phase !== PHASE.THEIR_TURN) return;
  const wasYours = state.phase === PHASE.YOUR_TURN;
  state.phase = wasYours ? PHASE.THEIR_TURN : PHASE.YOUR_TURN;
  logEvent("turn_end", { turn: state.turnNumber, player: wasYours ? "you" : "opponent" });
  persistState();
  render();
}

/**
 * Starts a new turn.
 * Sets current mana to max mana and increments turn counter.
 */
function newTurn() {
  if (state.phase !== PHASE.YOUR_TURN && state.phase !== PHASE.THEIR_TURN) return;
  state.turnNumber++;
  state.manaCurrent = state.manaMax;
  logEvent("turn_start", { turn: state.turnNumber });
  persistState();
  render();
}

/**
 * Ends the game and records the winner.
 * @param {string} winner — "you" or "opponent"
 */
function endGame(winner) {
  state.phase = PHASE.ENDED;
  persistState();
  logEvent("game_end", { winner });
  render();
}

/**
 * Resets all state back to defaults.
 */
function resetGame() {
  state = defaultState();
  persistState();
  logEvent("game_reset", {});
  render();
}

/**
 * Changes a numeric state value by a delta, clamped to min 0.
 * @param {string} key   — state key to change
 * @param {number} delta — amount to change by (+1 or -1)
 */
function changeValue(key, delta) {
  if (state.phase === PHASE.IDLE || state.phase === PHASE.ENDED) return;
  const current = state[key] ?? 0;
  state[key] = Math.max(0, current + delta);
  persistState();
  renderValues();
}

/**
 * Changes a threshold value by a delta, clamped to min 0.
 * @param {string} element — air | earth | fire | water
 * @param {number} delta
 */
function changeThreshold(element, delta) {
  if (state.phase === PHASE.IDLE || state.phase === PHASE.ENDED) return;
  state.thresholds[element] = Math.max(0, (state.thresholds[element] ?? 0) + delta);
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
    <div class="game-section game-section--row" id="section-turns">
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
    <div class="game-section game-section--row game-section--last" id="section-game-btns">
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
  setText("val-life",       pad(state.life));
  setText("val-mana-cur",   pad(state.manaCurrent));
  setText("val-mana-max",   pad(state.manaMax));
  THRESHOLDS.forEach(el => {
    setText(`val-thr-${el}`, pad(state.thresholds[el]));
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

  // Turn buttons
  setDisabled("btn-new-turn", !active);
  setDisabled("btn-end-turn", !active);
  setAccent("btn-new-turn",  active && !yours);
  setAccent("btn-end-turn",  active && yours);

  // Game buttons
  setDisabled("btn-end-game",   idle || ended);
  setDanger("btn-end-game",     !idle && !ended);
}


// ============================================================
//  EVENT LISTENERS
// ============================================================
function attachListeners() {

  // Life
  on("btn-life-dec", "click", () => changeValue("life", -1));
  on("btn-life-inc", "click", () => changeValue("life",  1));

  // Mana
  on("btn-mana-cur-dec", "click", () => changeValue("manaCurrent", -1));
  on("btn-mana-cur-inc", "click", () => changeValue("manaCurrent",  1));
  on("btn-mana-max-dec", "click", () => changeValue("manaMax", -1));
  on("btn-mana-max-inc", "click", () => changeValue("manaMax",  1));

  // Thresholds — delegated from the threshold section
  const thrSection = document.getElementById("section-thresholds");
  if (thrSection) {
    thrSection.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-threshold]");
      if (!btn) return;
      changeThreshold(btn.dataset.threshold, parseInt(btn.dataset.delta, 10));
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
function initGame() {
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
//  SELF-INIT
//  game.js initialises itself on DOMContentLoaded so load
//  order relative to app.js does not matter.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initGame();
});

// Also expose on public API for external access if needed
if (typeof window !== "undefined") {
  window.ResTracker = window.ResTracker || {};
  window.ResTracker.initGame = initGame;
}