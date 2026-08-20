// =============================================================================
// CODEX - KEYWORD SEARCH
// =============================================================================

let codexData = [];

// Load codex data
async function loadCodex() {
    try {
        const response = await fetch('data/rules.json');
        codexData = await response.json();
    } catch (error) {
        console.error('Failed to load codex data:', error);
    }
}

// Initialize codex
loadCodex();

function searchCodex() {
    const query = document.getElementById('codex-search').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('codex-results');
    
    if (!query) {
        resultsContainer.innerHTML = '<div class="browser-loading">Enter a keyword to search</div>';
        return;
    }
    
    const matches = codexData.filter(entry => {
        const keywordMatch = entry.keyword.toLowerCase().includes(query);
        const tagMatch = entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query));
        return keywordMatch || tagMatch;
    });
    
    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="browser-loading">No results found</div>';
        return;
    }
    
    resultsContainer.innerHTML = matches.map((entry, index) => `
        <div class="codex-entry" id="codex-entry-${index}">
            <div class="codex-keyword" onclick="toggleCodexEntry(${index})">
                ${entry.keyword}
            </div>
            <div class="codex-definition">
                ${entry.full_text || entry.definition}
                <div style="height: 20px;"></div>
            </div>
        </div>
    `).join('');
}

function toggleCodexEntry(index) {
    const entry = document.getElementById(`codex-entry-${index}`);
    entry.classList.toggle('expanded');
}

function getCodexUrl(keyword) {
    // Convert keyword to URL-friendly slug
    const slug = keyword.toLowerCase().replace(/\s+/g, '_');
    return `https://curiosa.io/codex?search=${encodeURIComponent(keyword)}`;
}