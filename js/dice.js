// =============================================================================
// DICE ROLLER
// =============================================================================

const diceConfig = { d6: 0, d12: 0, d20: 0 };

function openDice() {
    document.getElementById('dice-overlay').classList.add('active');
}

function closeDice() {
    document.getElementById('dice-overlay').classList.remove('active');
}

function adjustDiceCount(type, amount) {
    diceConfig[type] = Math.max(0, diceConfig[type] + amount);
    document.getElementById(`count-${type}`).textContent = diceConfig[type];
}

function rollDice() {
    const faces = { d6: 6, d12: 12, d20: 20 };
    let grandTotal = 0;
    let hasAnyDice = false;
    let resultsHTML = '';

    for (const type of ['d6', 'd12', 'd20']) {
        const count = diceConfig[type];
        if (count === 0) continue;
        hasAnyDice = true;

        const rolls = [];
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * faces[type]) + 1);
        }
        const total = rolls.reduce((sum, val) => sum + val, 0);
        grandTotal += total;

        resultsHTML += `
            <div class="dice-result-row">
                <span class="dice-result-type">${type.toUpperCase()}</span>
                <span class="dice-result-values">${rolls.join(', ')}</span>
                <span class="dice-result-total">Total: ${total}</span>
            </div>
        `;
    }

    if (!hasAnyDice) {
        alert('Select at least one die to roll!');
        return;
    }

    document.getElementById('dice-results-content').innerHTML = resultsHTML;
    document.getElementById('dice-grand-total').textContent = `Grand Total: ${grandTotal}`;
    document.getElementById('dice-results').style.display = 'flex';
    document.getElementById('dice-results').style.flexDirection = 'column';
}
