/**
 * config.js — ResTracker PWA
 * Central configuration file. All variable data lives here.
 * Edit this file to change app-wide behaviour, appearance, and features.
 *
 * Companion app for Sorcery: Contested Realm by Erik's Curiosa.
 */

const APP_CONFIG = {

  // ============================================================
  //  APP IDENTITY
  //  Core metadata used in the manifest, header, and SEO tags.
  // ============================================================
  app: {
    name:        "ResTracker",
    shortName:   "ResTracker",           // Used on home screen icons
    description: "A companion app for Sorcery: Contested Realm",
    version:     "0.1.0",
    lang:        "en",
    wakeLockTimeout: 10 * 60 * 1000,     // Inactivity duration before wake lock is released (ms). Default: 10 minutes.
  },


  // ============================================================
  //  FEATURE FLAGS
  //  Set a flag to false to hide / disable that feature entirely.
  //  Useful for staging features before they are ready.
  // ============================================================
  features: {
    lifeCounter:       true,   // Life point tracking
    manaCounter:       true,   // Current and maximum mana tracking
    thresholdCounter:  true,   // Air / Earth / Fire / Water threshold tracking
    tournamentTools:   true,   // Tournament and event utilities
  },


  // ============================================================
  //  GAME RULES & DEFAULTS
  //  Starting values used when a new game or player is created.
  //  Change these if official rules update default values.
  // ============================================================
  gameDefaults: {
    startingLife:       20,    // Default starting life total
    startingMana:        0,    // Default current mana at game start
    startingManaMax:    10,    // Default mana ceiling at game start
    startingThresholds: {
      air:   0,
      earth: 0,
      fire:  0,
      water: 0,
    },
    minPlayers: 2,             // Minimum number of players in a game session
    maxPlayers: 4,             // Maximum number of players in a game session
  },


  // ============================================================
  //  THEMES
  //  The active theme is set via activeTheme below.
  //  Each theme defines a full set of CSS custom property values.
  //
  //  Property guide:
  //    --bg-primary      Main background colour
  //    --bg-surface      Card / panel background
  //    --bg-elevated     Slightly raised surface (modals, dropdowns)
  //    --text-primary    Primary body text
  //    --text-secondary  Subdued / label text
  //    --text-on-accent  Text placed directly on the accent colour
  //    --accent          Brand / interactive highlight colour
  //    --accent-muted    Softer variant of the accent (hover states etc.)
  //    --border          Default border colour
  //    --shadow          Box-shadow colour (use rgba for transparency)
  //    --danger          Destructive action colour (e.g. reduce life)
  //    --success         Positive action colour (e.g. gain life)
  // ============================================================
  activeTheme: "dark",         // Must match a key in themes below

  themes: {

    // ----------------------------------------------------------
    //  Dark (default) — deep arcane feel
    // ----------------------------------------------------------
    dark: {
      label: "Dark",
      properties: {
        "--bg-primary":     "#0e0e12",
        "--bg-surface":     "#1a1a22",
        "--bg-elevated":    "#24242f",
        "--text-primary":   "#f0eeea",
        "--text-secondary": "#8a8898",
        "--text-on-accent": "#0e0e12",
        "--accent":         "#c9a84c",   // Warm gold
        "--accent-muted":   "#a07830",
        "--border":         "#2e2e3a",
        "--shadow":         "rgba(0, 0, 0, 0.6)",
        "--danger":         "#e05555",
        "--success":        "#4caf82",
      },
    },

    // ----------------------------------------------------------
    //  Light — clean, card-art forward
    // ----------------------------------------------------------
    light: {
      label: "Light",
      properties: {
        "--bg-primary":     "#f5f4f0",
        "--bg-surface":     "#ffffff",
        "--bg-elevated":    "#ebebeb",
        "--text-primary":   "#1a1a22",
        "--text-secondary": "#6b6b78",
        "--text-on-accent": "#ffffff",
        "--accent":         "#a06820",
        "--accent-muted":   "#c9a84c",
        "--border":         "#d4d0c8",
        "--shadow":         "rgba(0, 0, 0, 0.12)",
        "--danger":         "#d43f3f",
        "--success":        "#2e8f5e",
      },
    },

    // ----------------------------------------------------------
    //  Air — RGB 170, 180, 215 — cool silver-blue
    // ----------------------------------------------------------
    air: {
      label: "Air",
      properties: {
        "--bg-primary":     "#12141e",
        "--bg-surface":     "#1c1f2e",
        "--bg-elevated":    "#252840",
        "--text-primary":   "#e8ecf8",
        "--text-secondary": "#8e96b8",
        "--text-on-accent": "#12141e",
        "--accent":         "rgb(170, 180, 215)",
        "--accent-muted":   "rgba(170, 180, 215, 0.65)",
        "--border":         "#2a2d42",
        "--shadow":         "rgba(0, 0, 0, 0.55)",
        "--danger":         "#e05575",
        "--success":        "#5ac8a8",
      },
    },

    // ----------------------------------------------------------
    //  Earth — RGB 169, 158, 125 — warm sand and stone
    // ----------------------------------------------------------
    earth: {
      label: "Earth",
      properties: {
        "--bg-primary":     "#141210",
        "--bg-surface":     "#1e1b16",
        "--bg-elevated":    "#2a2520",
        "--text-primary":   "#ede8df",
        "--text-secondary": "#9a9080",
        "--text-on-accent": "#141210",
        "--accent":         "rgb(169, 158, 125)",
        "--accent-muted":   "rgba(169, 158, 125, 0.65)",
        "--border":         "#332e26",
        "--shadow":         "rgba(0, 0, 0, 0.55)",
        "--danger":         "#d45040",
        "--success":        "#7aaa60",
      },
    },

    // ----------------------------------------------------------
    //  Fire — RGB 242, 92, 36 — bold ember and char
    // ----------------------------------------------------------
    fire: {
      label: "Fire",
      properties: {
        "--bg-primary":     "#130a06",
        "--bg-surface":     "#1e1008",
        "--bg-elevated":    "#2c1810",
        "--text-primary":   "#faeee8",
        "--text-secondary": "#b07060",
        "--text-on-accent": "#130a06",
        "--accent":         "rgb(242, 92, 36)",
        "--accent-muted":   "rgba(242, 92, 36, 0.65)",
        "--border":         "#3a2018",
        "--shadow":         "rgba(0, 0, 0, 0.6)",
        "--danger":         "#ff4444",
        "--success":        "#88cc55",
      },
    },

    // ----------------------------------------------------------
    //  Water — RGB 101, 191, 220 — clear deep ocean
    // ----------------------------------------------------------
    water: {
      label: "Water",
      properties: {
        "--bg-primary":     "#07101a",
        "--bg-surface":     "#0e1c28",
        "--bg-elevated":    "#162838",
        "--text-primary":   "#e0f4fa",
        "--text-secondary": "#6090a8",
        "--text-on-accent": "#07101a",
        "--accent":         "rgb(101, 191, 220)",
        "--accent-muted":   "rgba(101, 191, 220, 0.65)",
        "--border":         "#1a2e3e",
        "--shadow":         "rgba(0, 0, 0, 0.6)",
        "--danger":         "#e05060",
        "--success":        "#40c090",
      },
    },

  }, // end themes


  // ============================================================
  //  TYPOGRAPHY
  //  Font families loaded by the app.
  //  fontDisplay controls CSS font-display behaviour.
  // ============================================================
  typography: {
    fontPrimary:   "'Inter', system-ui, sans-serif",      // UI text
    fontHeading:   "'Cinzel', Georgia, serif",            // Headings / titles
    fontMono:      "'JetBrains Mono', monospace",         // Numbers / counters
    fontSizeBase:  "16px",                                // Root font size (1rem)
    fontDisplay:   "swap",                                // CSS font-display value
  },


  // ============================================================
  //  LAYOUT
  //  Shared spacing and sizing tokens used across the UI.
  // ============================================================
  layout: {
    borderRadius:  "10px",     // Default rounded corner radius
    borderRadiusLg:"18px",     // Larger radius for cards and modals
    maxWidth:      "480px",    // Max content width (mobile-first)
    headerHeight:  "56px",     // Top navigation bar height
    footerHeight:  "60px",     // Bottom navigation bar height
    spacingUnit:   "8px",      // Base spacing unit (multiples used throughout)
    transitionSpeed: "200ms",  // Default CSS transition duration
  },


  // ============================================================
  //  PWA / MANIFEST
  //  Values mirrored into manifest.json and meta tags.
  //  themeColor should match the accent of the activeTheme above.
  // ============================================================
  pwa: {
    themeColor:      "#c9a84c",   // Browser chrome colour (matches dark accent)
    backgroundColor: "#0e0e12",  // Splash screen background
    display:         "standalone",
    orientation:     "portrait",
    startUrl:        "/",
    iconsPath:       "/assets/icons/",
  },

};


// ============================================================
//  EXPORT
//  Supports both ES Module imports and plain <script> tags.
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = APP_CONFIG;                      // CommonJS (Node / bundlers)
} else if (typeof define === "function" && define.amd) {
  define([], () => APP_CONFIG);                     // AMD
}
// Always attach to window so plain <script> tags can access it
if (typeof window !== "undefined") {
  window.APP_CONFIG = APP_CONFIG;
}