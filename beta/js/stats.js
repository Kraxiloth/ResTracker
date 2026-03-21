/**
 * js/stats.js — ResTracker PWA
 * Game statistics module.
 *
 * Reads log events from localStorage and derives stats
 * for the current game. Renders into #view-stats.
 * Refreshes every time the Stats tab is activated.
 *
 * Stats derived:
 *   - Turns played
 *   - Duration (placeholder — timer not yet implemented)
 *   - Life gained / lost
 *   - Mana gained / spent
 *   - Turns at Death's Door (life === 1)
 *   - Threshold total
 *   - Life across turns (line graph)
 *   - Threshold gained per element (progress bars)
 */


// ============================================================
//  CONSTANTS
// ============================================================
const STATS_EVENTS_KEY = "restracker-log-events";

const STATS_THRESHOLD_COLOURS = {
  air:   "rgb(170, 180, 215)",
  earth: "rgb(169, 158, 125)",
  fire:  "rgb(242, 92, 36)",
  water: "rgb(101, 191, 220)",
};

const STATS_THRESHOLD_ELEMENTS = ["air", "earth", "fire", "water"];


// ============================================================
//  DATA
// ============================================================
function statsReadEvents() {
  try {
    const raw = localStorage.getItem(STATS_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[ResTracker] Stats failed to read events:", e);
    return [];
  }
}

/**
 * Derives all stats from the flat event array.
 * @param {Array} events
 * @returns {object} stats
 */
function deriveStats(events) {
  let lifeGained      = 0;
  let lifeLost        = 0;
  let manaGained      = 0;
  let manaSpent       = 0;
  let deathsDoor      = 0;
  let turns           = 0;
  let currentLife     = 20;  // Track life to detect Death's Door moments
  const lifeByTurn    = [];  // Life value at the start of each of your turns
  const thresholdGained = { air: 0, earth: 0, fire: 0, water: 0 };

  // Get starting life from config if available
  const startingLife = window.APP_CONFIG?.gameDefaults?.startingLife ?? 20;
  currentLife = startingLife;

  // Always start the graph at the configured starting life
  lifeByTurn.push(startingLife);

  events.forEach(event => {
    const { type, detail } = event;

    switch (type) {
      case "turn_start":
        turns++;
        lifeByTurn.push(currentLife);
        break;

      case "life_change":
        currentLife = detail.to;
        if (detail.delta > 0) {
          lifeGained += detail.delta;
        } else {
          lifeLost += Math.abs(detail.delta);
          if (detail.to === 1) deathsDoor++;
        }
        break;

      case "mana_cur_change":
        if (detail.delta > 0) {
          manaGained += detail.delta;
        } else {
          manaSpent += Math.abs(detail.delta);
        }
        break;

      case "threshold_change":
        if (detail.delta > 0 && STATS_THRESHOLD_ELEMENTS.includes(detail.element)) {
          thresholdGained[detail.element] += detail.delta;
        }
        break;
    }
  });

  // Push final life value if we have turn data
  if (lifeByTurn.length > 0) {
    lifeByTurn.push(currentLife);
  }

  const thresholdTotal = STATS_THRESHOLD_ELEMENTS
    .reduce((sum, el) => sum + thresholdGained[el], 0);

  return {
    turns,
    lifeGained,
    lifeLost,
    manaGained,
    manaSpent,
    deathsDoor,
    thresholdTotal,
    thresholdGained,
    lifeByTurn,
    startingLife,
  };
}


// ============================================================
//  RENDER
// ============================================================
/**
 * Returns the total game duration from timer state.
 * Combines your elapsed time and opponent's elapsed time.
 */
function getDuration() {
  try {
    const raw = localStorage.getItem("restracker-timer-state");
    if (!raw) return "0:00";
    const t       = JSON.parse(raw);
    const total   = Math.floor((t.yourElapsed ?? 0) + (t.oppElapsed ?? 0));
    const m       = Math.floor(total / 60);
    const s       = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  } catch (e) {
    return "0:00";
  }
}

function renderStats() {
  const view = document.getElementById("view-stats");
  if (!view) return;

  const events = statsReadEvents();

  if (events.length === 0) {
    view.innerHTML = `
      <div class="stats-empty">
        <p class="stats-empty__text">No game in progress.<br>Start a new game to see statistics.</p>
      </div>`;
    return;
  }

  const s = deriveStats(events);

  view.innerHTML = `
    <!-- ── Overview label ── -->
    <div class="stats-section-label">Overview</div>

    <!-- ── Overview grid ── -->
    <div class="stats-grid">

      <div class="stats-card">
        <span class="stats-card__label">Turns</span>
        <span class="stats-card__value">${s.turns}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Duration</span>
        <span class="stats-card__value stats-card__value--muted">${getDuration()}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Life Gained</span>
        <span class="stats-card__value stats-card__value--success">${s.lifeGained}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Life Lost</span>
        <span class="stats-card__value stats-card__value--danger">${s.lifeLost}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Mana Gained</span>
        <span class="stats-card__value stats-card__value--accent">${s.manaGained}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Mana Spent</span>
        <span class="stats-card__value">${s.manaSpent}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Death's Door</span>
        <span class="stats-card__value ${s.deathsDoor > 0 ? "stats-card__value--danger" : ""}">${s.deathsDoor}</span>
      </div>

      <div class="stats-card">
        <span class="stats-card__label">Threshold Total</span>
        <span class="stats-card__value">${s.thresholdTotal}</span>
      </div>

    </div>

    <!-- ── Life across turns ── -->
    <div class="stats-section-label">Life Across Turns</div>
    <div class="stats-chart-wrap">
      ${renderLifeGraph(s.lifeByTurn, s.startingLife)}
    </div>

    <!-- ── Threshold gained ── -->
    <div class="stats-section-label">Threshold Gained</div>
    <div class="stats-thresholds">
      ${STATS_THRESHOLD_ELEMENTS.map(el => renderThresholdBar(el, s.thresholdGained[el], s.thresholdTotal)).join("")}
    </div>
  `;
}


// ============================================================
//  LIFE GRAPH
//  Heartbeat-style SVG graph.
//  The line moves between turn values. Each segment is coloured
//  green if life increased from the previous turn, red if it
//  decreased, and neutral if unchanged.
// ============================================================
function renderLifeGraph(lifeByTurn, startingLife) {
  if (lifeByTurn.length < 2) {
    return `<p class="stats-chart-empty">Not enough turns to display a graph.</p>`;
  }

  const W      = 400;
  const H      = 130;
  const padX   = 10;
  const padY   = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const maxLife = Math.max(startingLife, ...lifeByTurn) + 1;
  const minLife = Math.max(0, Math.min(...lifeByTurn) - 1);
  const range   = maxLife - minLife || 1;

  const toX = (i) => padX + (i / (lifeByTurn.length - 1)) * innerW;
  const toY = (v) => padY + (1 - (v - minLife) / range) * innerH;

  // Baseline — starting life horizontal reference line
  const baselineY = toY(startingLife);

  // Build coloured segments between each pair of points
  const segments = [];
  for (let i = 0; i < lifeByTurn.length - 1; i++) {
    const x1 = toX(i);
    const y1 = toY(lifeByTurn[i]);
    const x2 = toX(i + 1);
    const y2 = toY(lifeByTurn[i + 1]);
    const delta = lifeByTurn[i + 1] - lifeByTurn[i];
    const colour = delta > 0
      ? "var(--success)"
      : delta < 0
        ? "var(--danger)"
        : "var(--text-secondary)";

    // Filled area between segment and baseline
    const areaD = `M ${x1},${y1} L ${x2},${y2} L ${x2},${baselineY} L ${x1},${baselineY} Z`;

    segments.push({ x1, y1, x2, y2, colour, areaD, delta });
  }

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="stats-chart">

      <!-- Baseline — starting life reference -->
      <line
        x1="${padX}" y1="${baselineY}"
        x2="${W - padX}" y2="${baselineY}"
        stroke="var(--border)" stroke-width="1" stroke-dasharray="4 3"
      />

      <!-- Coloured fill areas -->
      ${segments.map(s => `
        <path d="${s.areaD}" fill="${s.colour}" opacity="0.15"/>
      `).join("")}

      <!-- Coloured line segments -->
      ${segments.map(s => `
        <line
          x1="${s.x1}" y1="${s.y1}"
          x2="${s.x2}" y2="${s.y2}"
          stroke="${s.colour}"
          stroke-width="2"
          stroke-linecap="round"
        />
      `).join("")}

      <!-- Data points -->
      ${lifeByTurn.map((v, i) => {
        const delta = i === 0 ? 0 : lifeByTurn[i] - lifeByTurn[i - 1];
        const colour = delta > 0
          ? "var(--success)"
          : delta < 0
            ? "var(--danger)"
            : "var(--text-secondary)";
        return `
          <circle
            cx="${toX(i)}" cy="${toY(v)}" r="3.5"
            fill="var(--bg-surface)"
            stroke="${i === 0 ? "var(--text-secondary)" : colour}"
            stroke-width="1.5"
          />
          <text
            x="${toX(i)}" y="${toY(v) - 7}"
            text-anchor="middle"
            font-size="8"
            fill="${i === 0 ? "var(--text-secondary)" : colour}"
            font-family="JetBrains Mono, monospace"
          >${v}</text>`;
      }).join("")}

    </svg>`;
}


// ============================================================
//  THRESHOLD BARS
// ============================================================
function renderThresholdBar(element, value, total) {
  const colour  = STATS_THRESHOLD_COLOURS[element];
  const pct     = total > 0 ? Math.round((value / total) * 100) : 0;
  const label   = element.charAt(0).toUpperCase() + element.slice(1);

  return `
    <div class="stats-thr-row">
      <span class="stats-thr-row__label" style="color:${colour}">${label}</span>
      <div class="stats-thr-row__bar-wrap">
        <div class="stats-thr-row__bar" style="width:${pct}%; background:${colour};"></div>
      </div>
      <span class="stats-thr-row__value" style="color:${colour}">${value}</span>
    </div>`;
}


// ============================================================
//  SELF-INIT
// ============================================================
function initStats() {
  renderStats();

  // Re-render whenever the Stats nav item is tapped
  document.querySelectorAll(".nav-item[data-view='view-stats']").forEach(btn => {
    btn.addEventListener("click", renderStats);
  });

  console.log("[ResTracker] Stats module initialised.");
}