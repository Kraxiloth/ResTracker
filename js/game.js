// =============================================================================
// GAME MECHANICS
// =============================================================================

function adjustLife(playerIndex, amount) {
    players[playerIndex].life = Math.max(0, Math.min(20, players[playerIndex].life + amount));
    updateDisplay(playerIndex);
}

function adjustMana(playerIndex, type, amount) {
    const player = players[playerIndex];
    if (type === 'max') {
        player.maxMana = Math.max(0, player.maxMana + amount);
        // Sync current mana with the new maximum
        player.mana = Math.min(player.mana + amount, player.maxMana);
        player.mana = Math.max(0, player.mana);
    } else {
        // Allow current mana to go above maximum (temporary bonuses)
        player.mana = Math.max(0, player.mana + amount);
    }
    updateDisplay(playerIndex);
}

function adjustThreshold(playerIndex, element, amount) {
    players[playerIndex].threshold[element] = Math.max(0, players[playerIndex].threshold[element] + amount);
    updateDisplay(playerIndex);
}

function newTurn() {
    players.forEach((player, index) => {
        player.mana = player.maxMana;
        updateDisplay(index);
    });
}

function resetGame() {
    if (confirm("Reset all players to default state? This will clear all game progress.")) {
        players = players.map(player => createPlayer(player.name));
        players.forEach((_, index) => updateDisplay(index));
        
        // Reset timers
        stopTimer();
        globalTimerStart = null;
        players.forEach(player => player.timerStart = null);
        startTimer();
        
        saveGameState();
    }
}