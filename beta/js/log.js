/**
 * js/log.js — ResTracker PWA
 * Game event log module.
 *
 * Reads log events written by game.js from localStorage and
 * renders them as collapsible turn groups in #view-log.
 * Refreshes every time the Log tab is activated.
 *
 * No communication with game.js required — fully decoupled.
 */


// ============================================================
//  CONSTANTS
// ============================================================
const LOG_STORAGE_KEY = "restracker-log-events";

const LOG_THRESHOLD_COLOURS = {
  air:   "rgb(170, 180, 215)",
  earth: "rgb(169, 158, 125)",
  fire:  "rgb(242, 92, 36)",
  water: "rgb(101, 191, 220)",
};

// Tracks which turn groups are expanded
const expandedGroups = new Set();


// ============================================================
//  DATA
//  Reads raw events from localStorage and groups them by turn.
// ============================================================

/**
 * Reads all log events from localStorage.
 * @returns {Array}
 */
function readEvents() {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[ResTracker] Failed to read log events:", e);
    return [];
  }
}

/**
 * Groups a flat array of events into turn groups.
 * A new group starts on every game_start or turn_start event.
 * Groups are returned most-recent first.
 * @param {Array} events
 * @returns {Array} groups — [{ label, events }]
 */
function groupEvents(events) {
  const groups = [];
  let current  = null;

  events.forEach(event => {
    const isBoundary = ["game_start", "turn_start", "opponent_turn_start"].includes(event.type);
    if (isBoundary) {
      if (current) groups.push(current);
      let label;
      if (event.type === "game_start")           label = "Game Start";
      else if (event.type === "turn_start")      label = `Turn ${event.detail?.turn ?? ""} — You`;
      else                                       label = `Turn ${event.detail?.turn ?? ""} — Opponent`;
      current = { label, events: [event] };
    } else {
      if (!current) current = { label: "Game", events: [] };
      current.events.push(event);
    }
  });

  if (current) groups.push(current);

  // Most recent first
  return groups.reverse();
}


// ============================================================
//  SUMMARY
// ============================================================

/**
 * Produces a compact summary string for a collapsed group.
 * e.g. "Life −2 · Air +1 · Mana Max +3"
 */
function summarise(events) {
  const parts = [];

  const lifeChange    = sumDeltas(events, "life_change");
  const manaCurChange = sumDeltas(events, "mana_cur_change");
  const manaMaxChange = sumDeltas(events, "mana_max_change");

  if (lifeChange    !== 0) parts.push(`Life ${signed(lifeChange)}`);
  if (manaCurChange !== 0) parts.push(`Mana Cur ${signed(manaCurChange)}`);
  if (manaMaxChange !== 0) parts.push(`Mana Max ${signed(manaMaxChange)}`);

  ["air", "earth", "fire", "water"].forEach(el => {
    const change = sumDeltas(events, "threshold_change", el);
    if (change !== 0) parts.push(`${cap(el)} ${signed(change)}`);
  });

  const endEvent = events.find(e => e.type === "game_end");
  if (endEvent) {
    parts.push(endEvent.detail?.winner === "you" ? "You won" : "Opponent won");
  }

  return parts.length > 0 ? parts.join(" · ") : "No changes";
}

function sumDeltas(events, type, element = null) {
  return events
    .filter(e => e.type === type && (element === null || e.detail?.element === element))
    .reduce((sum, e) => sum + (e.detail?.delta ?? 0), 0);
}

function signed(n) { return n > 0 ? `+${n}` : String(n); }
function cap(str)  { return str.charAt(0).toUpperCase() + str.slice(1); }


// ============================================================
//  RENDER
// ============================================================

function renderLog() {
  const view = document.getElementById("view-log");
  if (!view) return;

  const events = readEvents();

  if (events.length === 0) {
    view.innerHTML = `
      <div class="log-empty">
        <p class="log-empty__text">No game in progress.<br>Start a new game to begin logging.</p>
      </div>`;
    return;
  }

  const groups = groupEvents(events);

  // Auto-expand only the most recent group on first render
  if (expandedGroups.size === 0 && groups.length > 0) {
    expandedGroups.add(0);
  }

  view.innerHTML = groups.map((group, index) => {
    const expanded = expandedGroups.has(index);
    return `
      <div class="log-group">
        <button class="log-group__header" data-index="${index}">
          <div class="log-group__header-left">
            <span class="log-group__label">${group.label}</span>
            ${!expanded
              ? `<span class="log-group__summary">${summarise(group.events)}</span>`
              : ""}
          </div>
          <span class="log-group__chevron">${expanded ? "▲" : "▼"}</span>
        </button>
        ${expanded ? `
          <div class="log-group__events">
            ${group.events.length === 0
              ? `<p class="log-event log-event--empty">No events yet</p>`
              : [...group.events].reverse().map(renderEvent).join("")}
          </div>` : ""}
      </div>`;
  }).join("");

  // Attach toggle listeners
  view.querySelectorAll(".log-group__header").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index, 10);
      if (expandedGroups.has(index)) {
        expandedGroups.delete(index);
      } else {
        expandedGroups.add(index);
      }
      renderLog();
    });
  });
}

function renderEvent(event) {
  const { type, detail, timestamp } = event;
  const time = logFormatTime(timestamp);

  switch (type) {
    case "game_start":
      return row(time, `Game started — ${detail.firstTurn === "you" ? "You" : "Opponent"} went first`);
    case "game_end":
      return row(time, `Game ended — ${detail.winner === "you" ? "You won" : "Opponent won"}`, detail.winner === "you" ? "success" : "danger");
    case "game_reset":
      return row(time, "Game reset");
    case "turn_start":
      return row(time, `Turn ${detail.turn} started — Your turn`);
    case "opponent_turn_start":
      return row(time, `Turn ${detail.turn} — Opponent's turn started`);
    case "turn_end":
      return row(time, `Turn ${detail.turn} ended — ${detail.player === "you" ? "Your" : "Opponent's"} turn`);
    case "life_change":
      return row(time, `Life ${signed(detail.delta)} (${detail.from} → ${detail.to})`, detail.delta > 0 ? "success" : "danger");
    case "mana_cur_change":
      return row(time, `Mana Current ${signed(detail.delta)} (${detail.from} → ${detail.to})`, "accent");
    case "mana_max_change":
      return row(time, `Mana Max ${signed(detail.delta)} (${detail.from} → ${detail.to})`, "accent");
    case "threshold_change": {
      const colour = LOG_THRESHOLD_COLOURS[detail.element] ?? "inherit";
      return row(time,
        `<span style="color:${colour}">${cap(detail.element)}</span> ${signed(detail.delta)} (${detail.from} → ${detail.to})`,
        null, true);
    }
    default:
      return row(time, type);
  }
}

function row(time, text, modifier = null, raw = false) {
  const cls     = modifier ? `log-event--${modifier}` : "";
  const content = raw ? text : esc(text);
  return `
    <div class="log-event ${cls}">
      <span class="log-event__time">${time}</span>
      <span class="log-event__text">${content}</span>
    </div>`;
}

function logFormatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ============================================================
//  SELF-INIT
//  Render the log on load, and again every time the Log tab
//  is activated via the nav.
// ============================================================
function initLog() {
  renderLog();

  // Re-render whenever the Log nav item is tapped
  document.querySelectorAll(".nav-item[data-view='view-log']").forEach(btn => {
    btn.addEventListener("click", () => {
      expandedGroups.clear();
      renderLog();
    });
  });

  console.log("[ResTracker] Log module initialised.");
}