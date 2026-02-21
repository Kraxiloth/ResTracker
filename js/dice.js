// =============================================================================
// DICE ROLLER - THREE.JS INTEGRATION
// =============================================================================

let diceRolling = false;
let diceRenderer = null;
const RESULT_DISPLAY = 1500;

function openDice() {
    document.getElementById('dice-overlay').classList.add('active');
    document.getElementById('dice-selection').style.display = 'flex';
    document.getElementById('dice-display').style.display = 'none';
}

function closeDice() {
    document.getElementById('dice-overlay').classList.remove('active');
    
    // Reset rolling state immediately so user can roll again
    diceRolling = false;
    
    if (diceRenderer) {
        diceRenderer.animating = false; // Stop animation loop
        diceRenderer.destroy();
        diceRenderer = null;
    }
}

function rollD6() {
    if (diceRolling) return;
    
    diceRolling = true;
    const result = Math.floor(Math.random() * 6) + 1;
    
    // Hide selection, show 3D canvas
    document.getElementById('dice-selection').style.display = 'none';
    const display = document.getElementById('dice-display');
    display.style.display = 'flex';
    
    const canvas = document.getElementById('dice-canvas');
    const resultNumber = document.getElementById('dice-result-number');
    
    // Hide number overlay for D6 (has textures)
    resultNumber.style.display = 'none';
    
    // Initialize renderer
    if (!diceRenderer) {
        diceRenderer = new DiceRenderer(canvas);
    }
    
    diceRenderer.clear();
    diceRenderer.createD6();
    diceRenderer.rollDice(result, true);
    
    // Shorter duration for D6 (2 seconds + 1 second display = 3 total)
    setTimeout(() => {
        diceRolling = false;
        closeDice();
    }, 3000);
}

function rollD20() {
    if (diceRolling) return;
    
    diceRolling = true;
    const result = Math.floor(Math.random() * 20) + 1;
    
    // Hide selection, show 3D canvas
    document.getElementById('dice-selection').style.display = 'none';
    const display = document.getElementById('dice-display');
    display.style.display = 'flex';
    
    const canvas = document.getElementById('dice-canvas');
    const resultNumber = document.getElementById('dice-result-number');
    
    // Initialize renderer
    if (!diceRenderer) {
        diceRenderer = new DiceRenderer(canvas);
    }
    
    diceRenderer.clear();
    diceRenderer.createD20();
    diceRenderer.rollDice(result, false);
    
    // Hide number during animation
    resultNumber.style.display = 'none';
    
    // Show result number after animation completes (2 seconds)
    setTimeout(() => {
        resultNumber.style.display = 'block';
        resultNumber.style.opacity = '1';
        resultNumber.textContent = result;
        resultNumber.classList.add('show');
        
        // Auto-close after displaying result (1.5 seconds)
        setTimeout(() => {
            resultNumber.classList.remove('show');
            resultNumber.style.opacity = '';
            setTimeout(() => {
                diceRolling = false;
                closeDice();
            }, 300);
        }, 1500);
    }, 2000); // Wait for animation to finish
}