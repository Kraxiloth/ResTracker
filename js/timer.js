// =============================================================================
// TIMER
// =============================================================================
let timerRunning = false;

function startTimer() {
    const now = Date.now();
    
    if (timerScope === 'global') {
        if (!globalTimerStart) {
            globalTimerStart = now;
            saveGameState();
        }
    } else {
        players.forEach(player => {
            if (!player.timerStart) {
                player.timerStart = now;
            }
        });
        saveGameState();
    }
    
    if (!globalTimerInterval) {
        globalTimerInterval = setInterval(updateTimerDisplays, 1000);
    }
}

function stopTimer() {
    if (globalTimerInterval) {
        clearInterval(globalTimerInterval);
        globalTimerInterval = null;
    }
}

function toggleTimer(playerIndex) {
    if (timerRunning) {
        stopTimer();
        document.querySelectorAll('.timer-control').forEach(btn => {
            btn.textContent = '▶';
        });
    } else {
        startTimer();
        document.querySelectorAll('.timer-control').forEach(btn => {
            btn.textContent = '⏸';
        });
    }
    timerRunning = !timerRunning;
}

function updateTimerDisplays() {
    const now = Date.now();
    
    players.forEach((player, index) => {
        const timerEl = document.getElementById(`timer${index + 1}`);
        if (!timerEl) return;
        
        let startTime;
        if (timerScope === 'global') {
            startTime = globalTimerStart;
        } else {
            startTime = player.timerStart;
        }
        
        if (!startTime) {
            timerEl.textContent = '0:00';
            return;
        }
        
        const elapsed = Math.floor((now - startTime) / 1000); // seconds
        
        if (timerMode === 'elapsed') {
            timerEl.textContent = formatTime(elapsed);
        } else {
            // Countdown mode
            const totalSeconds = timerDuration * 60;
            const remaining = Math.max(0, totalSeconds - elapsed);
            timerEl.textContent = formatTime(remaining);
            
            if (remaining === 0) {
                timerEl.classList.add('timer-expired');
            } else {
                timerEl.classList.remove('timer-expired');
            }
        }
    });
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }
}

function handleTimerModeChange() {
    timerMode = document.getElementById('timer-mode').value;
    saveGameState();
    updateTimerDisplays();
}

function handleTimerScopeChange() {
    const oldScope = timerScope;
    timerScope = document.getElementById('timer-scope').value;
    
    const now = Date.now();
    
    if (timerScope === 'global' && oldScope === 'per-player') {
        // Switching to global: use earliest player start time
        let earliest = null;
        players.forEach(player => {
            if (player.timerStart && (!earliest || player.timerStart < earliest)) {
                earliest = player.timerStart;
            }
        });
        globalTimerStart = earliest || now;
    } else if (timerScope === 'per-player' && oldScope === 'global') {
        // Switching to per-player: give all players the global start time
        players.forEach(player => {
            player.timerStart = globalTimerStart || now;
        });
    }
    
    saveGameState();
    updateTimerDisplays();
}

function handleTimerDurationChange() {
    timerDuration = parseInt(document.getElementById('timer-duration').value);
    saveGameState();
    updateTimerDisplays();
}
