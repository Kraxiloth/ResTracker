// =============================================================================
// CARD LOOKUP - LOCAL DATA
// =============================================================================

let allCards = [];
let searchTimeout = null;

// Load all cards from local JSON
async function loadCards() {
    try {
        const response = await fetch('data/cards.json');
        allCards = await response.json();
        console.log(`Loaded ${allCards.length} cards`);
    } catch (error) {
        console.error('Failed to load cards:', error);
    }
}

// Initialize card data
loadCards();

function searchCards() {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        const query = document.getElementById('card-search').value.toLowerCase().trim();
        const resultsContainer = document.getElementById('card-results');
        
        if (!query) {
            resultsContainer.innerHTML = '<div class="browser-loading">Enter a card name to search</div>';
            return;
        }
        
        if (allCards.length === 0) {
            resultsContainer.innerHTML = '<div class="browser-loading">Loading cards...</div>';
            return;
        }
        
        const matches = allCards.filter(card => 
            card.name.toLowerCase().includes(query)
        ).slice(0, 20); // Limit to 20 results
        
        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="browser-loading">No cards found</div>';
            return;
        }
        
        resultsContainer.innerHTML = matches.map(card => `
            <div class="avatar-list-item" data-card-name="${card.name.replace(/"/g, '&quot;')}" onclick="showCardDetailByElement(this)">
                ${card.name}
            </div>
        `).join('');
    }, 300); // Debounce search
}

function showCardDetailByElement(element) {
    const cardName = element.getAttribute('data-card-name');
    showCardDetail(cardName);
}

function handleCardSearchClick(event) {
    event.stopPropagation();
    // If detail view is showing, go back to list
    if (document.getElementById('card-detail').style.display !== 'none') {
        backToCardList();
    }
}

function showCardDetail(cardName) {
    const card = allCards.find(c => c.name === cardName);
    if (!card) return;
    
    // Hide results, show detail
    document.getElementById('card-results').style.display = 'none';
    document.getElementById('card-detail').style.display = 'flex';
    
    // Get the most recent set's metadata (usually the best data)
    const recentSet = card.sets && card.sets.length > 0 ? card.sets[card.sets.length - 1] : null;
    const metadata = recentSet ? recentSet.metadata : card.guardian;
    
    // Hide card image entirely
    document.getElementById('card-detail-image').style.display = 'none';
    
    // Set card text
    const textContainer = document.getElementById('card-detail-text');
    let cardText = `<h4>${card.name}</h4>`;
    
    if (metadata) {
        if (metadata.type) cardText += `<p><strong>Type:</strong> ${metadata.type}`;
        if (card.subTypes) cardText += ` — ${card.subTypes}`;
        cardText += `</p>`;
        
        if (metadata.cost !== null && metadata.cost !== undefined) {
            cardText += `<p><strong>Cost:</strong> ${metadata.cost}`;
            if (metadata.thresholds) {
                const thresholds = [];
                if (metadata.thresholds.air > 0) thresholds.push(`${metadata.thresholds.air} Air`);
                if (metadata.thresholds.fire > 0) thresholds.push(`${metadata.thresholds.fire} Fire`);
                if (metadata.thresholds.earth > 0) thresholds.push(`${metadata.thresholds.earth} Earth`);
                if (metadata.thresholds.water > 0) thresholds.push(`${metadata.thresholds.water} Water`);
                if (thresholds.length > 0) cardText += ` (${thresholds.join(', ')})`;
            }
            cardText += `</p>`;
        }
        
        if (metadata.attack !== null && metadata.attack !== undefined) {
            cardText += `<p><strong>Power/Defense:</strong> ${metadata.attack}/${metadata.defence}</p>`;
        }
        
        if (metadata.rulesText) {
            cardText += `<p>${metadata.rulesText.replace(/\n/g, '<br>')}</p>`;
        }
        
        if (recentSet && recentSet.variants && recentSet.variants[0].flavorText) {
            cardText += `<p><em>${recentSet.variants[0].flavorText}</em></p>`;
        }
    }
    
    textContainer.innerHTML = cardText;
    
    // FAQ section - link to curiosa.io since FAQ data isn't in the API
    const faqContainer = document.getElementById('card-detail-faq');
    const cardSlug = card.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    faqContainer.innerHTML = `
        <p style="text-align: center; margin-top: var(--space-lg);">
            <a href="https://curiosa.io/cards/${cardSlug}" target="_blank" rel="noopener" 
               style="color: var(--text-primary); text-decoration: underline;">
                View FAQ on Curiosa.io →
            </a>
        </p>
    `;
}

function backToCardList() {
    document.getElementById('card-results').style.display = 'flex';
    document.getElementById('card-detail').style.display = 'none';
}