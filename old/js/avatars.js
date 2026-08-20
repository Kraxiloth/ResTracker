// =============================================================================
// AVATAR BROWSER
// =============================================================================

const IMAGE_BASE_URL = 'https://d27a44hjr9gen3.cloudfront.net/cards/';
const CACHE_KEY = 'avatarCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

let avatarList = [];
let filteredAvatars = [];
let currentAvatarPlayerIndex = null;
let selectedAvatarSlug = null;

function openModal(playerIndex) {
    currentAvatarPlayerIndex = playerIndex;
    const avatarCard = document.getElementById(`avatar${playerIndex + 1}`);
    const img = avatarCard.querySelector('img');
    const modalImage = document.getElementById('modal-image');
    if (img && img.style.display !== 'none') {
        modalImage.src = img.src;
    } else {
        modalImage.src = '';
    }
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('modal-view-card').style.display = 'flex';
    document.getElementById('modal-view-card').style.flexDirection = 'column';
    document.getElementById('modal-view-card').style.alignItems = 'center';
    document.getElementById('modal-avatar-browser').style.display = 'none';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function openAvatarBrowser() {
    document.getElementById('modal-view-card').style.display = 'none';
    document.getElementById('modal-avatar-browser').style.display = 'flex';
    document.getElementById('modal-avatar-browser').style.flexDirection = 'column';

    // Clear search field
    document.getElementById('avatar-search').value = '';    

    clearPreview();

    if (avatarList.length > 0) {
        renderAvatarList(avatarList);
    } else {
        loadAvatars();
    }
}

async function loadAvatars() {
    document.getElementById('avatar-list').innerHTML = '<div class="browser-loading">Loading avatars...</div>';

    // Check cache first
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                avatarList = data;
                renderAvatarList(avatarList);
                return;
            }
        }
    } catch (error) {
        console.log('Cache read failed, fetching fresh data');
    }

    // Fetch from local JSON file
    try {
        const response = await fetch('data/avatars.json');
        avatarList = await response.json();

        // Cache the results
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: avatarList,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.log('Cache write failed');
        }

        renderAvatarList(avatarList);
    } catch (error) {
        document.getElementById('avatar-list').innerHTML =
            '<div class="browser-loading">Failed to load avatar list.</div>';
    }
}

function renderAvatarList(avatars) {
    const searchTerm = document.getElementById('avatar-search').value.toLowerCase();
    const showAllFinishes = document.getElementById('show-all-finishes').checked;

    filteredAvatars = avatars.filter(avatar => {
        const matchesSearch = avatar.name.toLowerCase().includes(searchTerm) ||
                              avatar.set.toLowerCase().includes(searchTerm);
        const matchesFinish = showAllFinishes || avatar.finish === 'Standard';
        return matchesSearch && matchesFinish;
    });

    if (filteredAvatars.length === 0) {
        document.getElementById('avatar-list').innerHTML =
            '<div class="browser-loading">No avatars found.</div>';
        return;
    }

    document.getElementById('avatar-list').innerHTML = filteredAvatars
        .map((avatar, index) => `
            <button class="avatar-list-item" onclick="previewAvatar(${index})">
                ${avatar.name} - ${avatar.set}
                ${avatar.finish !== 'Standard' ? `<span style="color:#aaaaaa"> (${avatar.finish})</span>` : ''}
            </button>
        `)
        .join('');
}

function filterAvatars() {
    renderAvatarList(avatarList);
}

function handleSearchInput() {
    // If we're in preview mode, go back to the list first
    const preview = document.getElementById('avatar-preview');
    if (preview.style.display !== 'none') {
        clearPreview();
    }
    filterAvatars();
}

function previewAvatar(filteredIndex) {
    const avatar = filteredAvatars[filteredIndex];
    selectedAvatarSlug = avatar.slug;

    const previewImg = document.getElementById('preview-image');
    previewImg.src = `${IMAGE_BASE_URL}${avatar.slug}.png`;

    document.getElementById('avatar-list').style.display = 'none';
    document.getElementById('avatar-preview').style.display = 'flex';
}

function clearPreview() {
    selectedAvatarSlug = null;
    document.getElementById('avatar-preview').style.display = 'none';
    document.getElementById('avatar-list').style.display = 'flex';
    document.getElementById('avatar-list').style.flexDirection = 'column';
    renderAvatarList(avatarList);
}

function backToList() {
    document.getElementById('avatar-search').value = '';
    clearPreview();
}

function confirmAvatar() {
    if (selectedAvatarSlug === null || currentAvatarPlayerIndex === null) return;
    
    players[currentAvatarPlayerIndex].avatar = selectedAvatarSlug;
    
    const avatarCard = document.getElementById(`avatar${currentAvatarPlayerIndex + 1}`);
    let img = avatarCard.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        img.style.position = 'absolute';
        img.style.zIndex = '1';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = function() { this.style.display = 'none'; };
        avatarCard.appendChild(img);
    }
    img.style.display = '';
    img.src = `${IMAGE_BASE_URL}${selectedAvatarSlug}.png`;
    
    saveGameState();  // ADD THIS LINE
    
    closeModal();
}
