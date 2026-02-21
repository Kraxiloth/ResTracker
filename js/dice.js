// =============================================================================
// DICE ROLLER - ICON ROTATION
// =============================================================================

let diceRolling = false;
const ROLL_DURATION = 3000; // 3 seconds for cycling
const RESULT_DISPLAY = 1500; // 1.5 seconds

function openDice() {
    document.getElementById('dice-overlay').classList.add('active');
    // Reset to selection view
    document.getElementById('dice-selection').style.display = 'flex';
    document.getElementById('dice-display').style.display = 'none';
}

function closeDice() {
    document.getElementById('dice-overlay').classList.remove('active');
}

function rollD6() {
    if (diceRolling) return;
    
    diceRolling = true;
    const result = Math.floor(Math.random() * 6) + 1;
    
    // Hide selection, show dice display
    document.getElementById('dice-selection').style.display = 'none';
    const display = document.getElementById('dice-display');
    display.style.display = 'flex';
    
    const visual = document.getElementById('dice-visual');
    const iconImg = document.getElementById('dice-icon-img');
    const resultNumber = document.getElementById('dice-result-number');
    
    // Show die face, hide number
    iconImg.style.display = 'block';
    resultNumber.style.display = 'none';
    
    // Slower die face cycling (100ms intervals = less flashy)
    let cycleCount = 0;
    const totalCycles = ROLL_DURATION / 100;
    const cycleInterval = setInterval(() => {
        const randomFace = Math.floor(Math.random() * 6) + 1;
        iconImg.src = `res/die${randomFace}.svg`;
        cycleCount++;
        if (cycleCount >= totalCycles) {
            clearInterval(cycleInterval);
            // Show final result
            iconImg.src = `res/die${result}.svg`;
            
            // Auto-close after showing result
            setTimeout(() => {
                resultNumber.style.display = '';
                diceRolling = false;
                closeDice();
            }, RESULT_DISPLAY);
        }
    }, 100); // Cycle every 100ms (slower, smoother)
}

function rollD20() {
    if (diceRolling) return;
    
    diceRolling = true;
    const result = Math.floor(Math.random() * 20) + 1;
    
    // Hide selection, show dice display
    document.getElementById('dice-selection').style.display = 'none';
    const display = document.getElementById('dice-display');
    display.style.display = 'flex';
    
    const visual = document.getElementById('dice-visual');
    const iconImg = document.getElementById('dice-icon-img');
    const resultNumber = document.getElementById('dice-result-number');
    
    // Show D20 SVG icon (static, no rotation)
    iconImg.src = 'res/d20.svg';
    iconImg.style.display = 'block';
    resultNumber.style.display = 'block';
    resultNumber.style.fontSize = '48px'; // Further reduced for better fit
    resultNumber.style.opacity = '1';
    
    // Slower number cycling (100ms intervals = less flashy)
    let cycleCount = 0;
    const totalCycles = ROLL_DURATION / 100;
    const cycleInterval = setInterval(() => {
        resultNumber.textContent = Math.floor(Math.random() * 20) + 1;
        cycleCount++;
        if (cycleCount >= totalCycles) {
            clearInterval(cycleInterval);
            // Show final result
            resultNumber.textContent = result;
            
            // Auto-close after showing result
            setTimeout(() => {
                resultNumber.style.opacity = '';
                resultNumber.style.fontSize = '';
                resultNumber.style.display = '';
                diceRolling = false;
                closeDice();
            }, RESULT_DISPLAY);
        }
    }, 100); // Cycle every 100ms (slower, smoother)
}