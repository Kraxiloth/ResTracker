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
let wakeLockTimeoutId = null;
const WAKE_LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock active');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake lock released');
                wakeLock = null; // Reset so it can be re-requested
            });
            
            // Start inactivity timeout
            resetWakeLockTimeout();
        }
    } catch (err) {
        console.error('Wake lock failed:', err);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
        console.log('Wake lock manually released');
    }
    if (wakeLockTimeoutId) {
        clearTimeout(wakeLockTimeoutId);
        wakeLockTimeoutId = null;
    }
}

function resetWakeLockTimeout() {
    // Clear existing timeout
    if (wakeLockTimeoutId) {
        clearTimeout(wakeLockTimeoutId);
    }
    
    // Set new timeout to release wake lock after 10 minutes of inactivity
    wakeLockTimeoutId = setTimeout(() => {
        console.log('Wake lock released due to 10 minutes of inactivity');
        releaseWakeLock();
    }, WAKE_LOCK_TIMEOUT);
}

// Request wake lock when app loads
requestWakeLock();

// Re-request wake lock when page becomes visible
document.addEventListener('visibilitychange', () => {
    console.log('Visibility changed:', document.visibilityState, 'Wake lock is:', wakeLock);
    if (document.visibilityState === 'visible') {
        if (wakeLock === null) {
            console.log('Re-requesting wake lock...');
            requestWakeLock();
        } else {
            console.log('Wake lock still exists, not re-requesting');
        }
    }
});

// Reset timeout on any user activity
document.addEventListener('click', resetWakeLockTimeout);
document.addEventListener('touchstart', resetWakeLockTimeout);
document.addEventListener('keydown', resetWakeLockTimeout);

// Auto-blur buttons on click to prevent sticky focus state on mobile
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        e.target.blur();
    }
});