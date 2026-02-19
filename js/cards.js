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
            <div class="avatar-list-item" onclick='showCardDetail(${JSON.stringify(card.name)})'>
                ${card.name}
            </div>
        `).join('');
    }, 300); // Debounce search
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
    
    // Get card image from most recent variant
    let imageUrl = 'bet-sorcerer-b-s.webp'; // Fallback to default avatar
    if (recentSet && recentSet.variants && recentSet.variants.length > 0) {
        const variant = recentSet.variants[0];
        imageUrl = `https://d27a44hjr9gen3.cloudfront.net/${variant.slug}.png`;
    }
    
    // Set card image
    const cardImage = document.getElementById('card-detail-image');
    cardImage.src = imageUrl;
    cardImage.alt = card.name;
    
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
    
    // FAQ section - check if curiosa.io has FAQ data
    const faqContainer = document.getElementById('card-detail-faq');
    if (card.faqs && card.faqs.length > 0) {
        faqContainer.innerHTML = '<h4>FAQ</h4>' + card.faqs.map(faq => `
            <div class="card-faq-item">
                <div class="card-faq-question">${faq.question}</div>
                <div class="card-faq-answer">${faq.answer}</div>
            </div>
        `).join('');
    } else {
        faqContainer.innerHTML = '<p><em>No FAQ entries for this card yet.</em></p>';
    }
}

function backToCardList() {
    document.getElementById('card-results').style.display = 'flex';
    document.getElementById('card-detail').style.display = 'none';
}