/**
 * app.js — ResTracker PWA
 * Application bootstrapper. Runs on DOMContentLoaded.
 *
 * Responsibilities:
 *   - Apply the active theme from config (or saved user preference)
 *   - Register the service worker
 *   - Initialise bottom navigation and view switching
 *
 * This file intentionally contains no game logic.
 * Feature modules will be added separately and initialised here.
 */


// ============================================================
//  THEME
//  Applies a theme by setting a class on <html>.
//  Persists the user's choice to localStorage.
//
//  Priority order:
//    1. User's saved preference (localStorage)
//    2. activeTheme set in config.js
//    3. "dark" as a hard fallback
// ============================================================

/**
 * Applies a theme class to <html> and saves the preference.
 * @param {string} themeKey — must match a key in APP_CONFIG.themes
 */
function applyTheme(themeKey) {
  const config   = window.APP_CONFIG;
  const validKey = config.themes[themeKey] ? themeKey : config.activeTheme;

  // Remove any existing theme class
  const html = document.documentElement;
  const existing = [...html.classList].filter(c => c.startsWith("theme-"));
  existing.forEach(c => html.classList.remove(c));

  // Dark is the :root default in CSS — no class needed
  if (validKey !== "dark") {
    html.classList.add(`theme-${validKey}`);
  }

  // Persist choice
  localStorage.setItem("restracker-theme", validKey);

  // Update the PWA theme-color meta tag to match the accent
  const accent = config.themes[validKey].properties["--accent"];
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme && accent) metaTheme.setAttribute("content", accent);
}

/**
 * Loads the saved theme preference or falls back to config default.
 */
function loadTheme() {
  const saved    = localStorage.getItem("restracker-theme");
  const config   = window.APP_CONFIG;
  const fallback = config.activeTheme || "dark";
  applyTheme(saved || fallback);
}


// ============================================================
//  WAKE LOCK
//  Prevents the screen from sleeping while the app is in use.
//
//  Behaviour:
//    - Acquired on app load
//    - Released after wakeLockTimeout ms of inactivity
//    - Re-acquired on any user interaction after release
//    - Re-acquired when the page becomes visible again
//      (e.g. user switches tabs or unlocks their phone)
// ============================================================
let wakeLock        = null;
let inactivityTimer = null;

const WAKE_LOCK_TIMEOUT = window.APP_CONFIG.app.wakeLockTimeout;

/**
 * Acquires a screen wake lock if the API is supported.
 */
async function acquireWakeLock() {
  if (!("wakeLock" in navigator)) return;
  if (document.visibilityState !== "visible") return;

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("[ResTracker] Wake lock acquired.");

    // If the wake lock is released externally (e.g. battery saver),
    // update our reference so we know it's gone
    wakeLock.addEventListener("release", () => {
      console.log("[ResTracker] Wake lock released externally.");
      wakeLock = null;
    });
  } catch (err) {
    console.warn("[ResTracker] Wake lock request failed:", err);
  }
}

/**
 * Releases the wake lock if one is currently held.
 */
async function releaseWakeLock() {
  if (!wakeLock) return;

  try {
    await wakeLock.release();
    wakeLock = null;
    console.log("[ResTracker] Wake lock released due to inactivity.");
  } catch (err) {
    console.warn("[ResTracker] Wake lock release failed:", err);
  }
}

/**
 * Resets the inactivity timer.
 * Called on every user interaction event.
 * If the wake lock was released due to inactivity, re-acquires it.
 */
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);

  // Re-acquire if interaction resumes after inactivity release
  if (!wakeLock) acquireWakeLock();

  inactivityTimer = setTimeout(() => {
    releaseWakeLock();
  }, WAKE_LOCK_TIMEOUT);
}

/**
 * Attaches activity listeners and re-acquires wake lock
 * when the page becomes visible again.
 */
function initWakeLock() {
  // Events that count as user activity
  const activityEvents = ["pointerdown", "keydown", "touchstart"];
  activityEvents.forEach((evt) => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
  });

  // Re-acquire when the user returns to the app
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      acquireWakeLock();
      resetInactivityTimer();
    }
  });

  // Acquire immediately and start the inactivity timer
  acquireWakeLock();
  resetInactivityTimer();
}


// ============================================================
//  SERVICE WORKER
//  Registered after load to avoid blocking initial render.
// ============================================================
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((reg) => {
        console.log("[ResTracker] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[ResTracker] Service worker registration failed:", err);
      });
  });
}


// ============================================================
//  NAVIGATION
//  Manages the bottom nav and view switching.
//
//  Each .nav-item must have a data-view attribute matching
//  the id of its corresponding .view element.
//  e.g. <button class="nav-item" data-view="view-game">
//       <section id="view-game" class="view">
// ============================================================

/**
 * Activates a view and its corresponding nav item.
 * @param {string} viewId — the id of the view to show
 */
function navigateTo(viewId) {
  // Deactivate all views
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("view--active");
  });

  // Deactivate all nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("nav-item--active");
    item.setAttribute("aria-selected", "false");
  });

  // Activate the target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("view--active");
  } else {
    console.warn(`[ResTracker] View not found: #${viewId}`);
  }

  // Activate the corresponding nav item
  const targetNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (targetNav) {
    targetNav.classList.add("nav-item--active");
    targetNav.setAttribute("aria-selected", "true");
  }

  // Persist last active view so it survives a page refresh
  localStorage.setItem("restracker-last-view", viewId);
}

/**
 * Attaches click listeners to all bottom nav items.
 */
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewId = item.dataset.view;
      if (viewId) navigateTo(viewId);
    });
  });

  // Restore last active view, or default to the first nav item
  const lastView  = localStorage.getItem("restracker-last-view");
  const firstView = document.querySelector(".nav-item")?.dataset.view;
  navigateTo(lastView || firstView || "view-game");
}


// ============================================================
//  INIT
//  Entry point — runs when the DOM is ready.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  initNavigation();
  initWakeLock();
  registerServiceWorker();

  if (typeof initTimer    === "function") initTimer();
  if (typeof initGame     === "function") initGame();
  if (typeof initLog      === "function") initLog();
  if (typeof initStats    === "function") initStats();
  if (typeof initSettings === "function") initSettings();

  console.log(`[ResTracker] v${window.APP_CONFIG.app.version} initialised.`);
});


// ============================================================
//  PUBLIC API
//  Expose key functions for use by feature modules and
//  the settings screen (e.g. theme switcher).
// ============================================================
window.ResTracker = window.ResTracker || {};
Object.assign(window.ResTracker, {
  applyTheme,
  navigateTo,
  acquireWakeLock,
  releaseWakeLock,
});