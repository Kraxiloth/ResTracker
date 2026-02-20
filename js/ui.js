// =============================================================================
// UI - MENU MODAL
// =============================================================================

function openMenu() {
    document.getElementById('menu-overlay').classList.add('active');
}

function closeMenu() {
    document.getElementById('menu-overlay').classList.remove('active');
}

// =============================================================================
// UI - SETTINGS MODAL
// =============================================================================

function openSettings() {
    closeMenu();
    document.getElementById('settings-overlay').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-overlay').classList.remove('active');
}

// =============================================================================
// UI - CODEX MODAL
// =============================================================================

function openCodex() {
    closeMenu();
    document.getElementById('codex-overlay').classList.add('active');
}

function closeCodex() {
    document.getElementById('codex-overlay').classList.remove('active');
}

// =============================================================================
// UI - CARD LOOKUP MODAL
// =============================================================================

function openCardLookup() {
    closeMenu();
    document.getElementById('card-lookup-overlay').classList.add('active');
}

function closeCardLookup() {
    document.getElementById('card-lookup-overlay').classList.remove('active');
}

// =============================================================================
// UI - ABOUT MODAL
// =============================================================================

function openAbout() {
    closeMenu();
    document.getElementById('about-overlay').classList.add('active');
}

function closeAbout() {
    document.getElementById('about-overlay').classList.remove('active');
}

// =============================================================================
// SCREEN WAKE LOCK
// =============================================================================

let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock active');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake lock released');
                wakeLock = null; // Reset so it can be re-requested
            });
        }
    } catch (err) {
        console.error('Wake lock failed:', err);
    }
}

// Request wake lock when app loads
requestWakeLock();

// Re-request wake lock when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLock === null) {
        requestWakeLock();
    }
});