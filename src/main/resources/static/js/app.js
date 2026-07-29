const API_BASE = '/api';

let currentUniversities = [];
let favorites = [];
let selectedUniversity = null;
let authMode = 'login'; // 'login' or 'register'
let selectedCountry = '';

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchUniversities();
    });

    document.getElementById('chatInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChat();
    });

    document.getElementById('authPassword').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAuth();
    });
    document.getElementById('authUsername').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('authPassword').focus();
    });

    document.getElementById("navUniversities").classList.add("active");
});

// --- Auth ---
async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`);
        if (res.ok) {
            const data = await res.json();
            onLoggedIn(data.username);
        } else {
            showAuthOverlay();
        }
    } catch (err) {
        showAuthOverlay();
    }
}

function showAuthOverlay() {
    document.getElementById('authOverlay').classList.remove('d-none');
    document.getElementById('userArea').classList.add('d-none');
    document.getElementById('authUsername').focus();
}

function onLoggedIn(username) {
    document.getElementById('authOverlay').classList.add('d-none');
    document.getElementById('userArea').classList.remove('d-none');
    document.getElementById('usernameLabel').textContent = username;
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    hideAuthError();
    loadFavorites();
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    const isLogin = authMode === 'login';
    document.getElementById('authSubtitle').textContent =
        isLogin ? 'Log in to see your favorite universities' : 'Create an account to save your favorites';
    document.getElementById('authSubmitBtn').textContent = isLogin ? 'Log In' : 'Sign Up';
    document.getElementById('authTogglePrompt').textContent =
        isLogin ? "Don't have an account?" : 'Already have an account?';
    document.getElementById('authToggleLink').textContent = isLogin ? 'Sign up' : 'Log in';
    document.getElementById('authPassword').setAttribute(
        'autocomplete', isLogin ? 'current-password' : 'new-password');
    hideAuthError();
}

async function submitAuth() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    if (!username || !password) {
        showAuthError('Please enter a username and password.');
        return;
    }

    const endpoint = authMode === 'login' ? 'login' : 'register';
    const btn = document.getElementById('authSubmitBtn');
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            onLoggedIn(data.username);
        } else {
            showAuthError(data.error || 'Something went wrong. Please try again.');
        }
    } catch (err) {
        showAuthError('Could not reach the server. Please try again.');
    } finally {
        btn.disabled = false;
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    } catch (err) {
        // ignore — clear client state regardless
    }
    favorites = [];
    currentUniversities = [];
    document.getElementById('universityGrid').innerHTML = '';
    document.getElementById('favoritesGrid').innerHTML = '';
    updateFavCount();
    renderSavedSidebar();
    authMode = 'login';
    toggleAuthMode();      // reset labels then...
    toggleAuthMode();      // ...back to login state
    showAuthOverlay();
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.classList.remove('d-none');
}

function hideAuthError() {
    document.getElementById('authError').classList.add('d-none');
}

// --- Navigation ---
function showSection(section) {
    document.getElementById('browseSection').classList.toggle('d-none', section !== 'browse');
    document.getElementById('favoritesSection').classList.toggle('d-none', section !== 'favorites');
    document.getElementById('navUniversities').classList.toggle('active', section === 'browse');
    document.getElementById('navFavorites').classList.toggle('active', section === 'favorites');

    if (section === 'favorites') {
        loadFavorites();
    }
}

function quickSearch(term) {
    document.getElementById('searchInput').value = term;
    searchUniversities();
}

// --- Search ---
async function searchUniversities() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/university/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        currentUniversities = await res.json();
        selectedCountry = '';
        document.getElementById('countrySelect').value = '';
        populateCountrySelect(currentUniversities);
        renderResults(query);
    } catch (err) {
        console.error(err);
        document.getElementById('resultsTitle').textContent = 'Error searching universities';
    } finally {
        showLoading(false);
    }
}

function renderResults(query) {
    const filtered = selectedCountry
        ? currentUniversities.filter(u => u.country === selectedCountry)
        : currentUniversities;

    renderUniversityGrid(filtered, 'universityGrid');
    document.getElementById('resultsTitle').textContent =
        filtered.length > 0 ? `Showing ${filtered.length} universities` : '';
    document.getElementById('noResults').classList.toggle('d-none', filtered.length > 0);
}

function populateCountrySelect(universities) {
    const select = document.getElementById('countrySelect');
    const countries = [...new Set(universities.map(u => u.country).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All Countries</option>' +
        countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function onCountrySelect() {
    selectedCountry = document.getElementById('countrySelect').value;
    renderResults(document.getElementById('searchInput').value.trim());
}

function clearAllFilters() {
    selectedCountry = '';
    document.getElementById('countrySelect').value = '';
    renderResults(document.getElementById('searchInput').value.trim());
}

// --- Favorites ---
async function loadFavorites() {
    try {
        const res = await fetch(`${API_BASE}/university/favorites`);
        if (res.status === 401) {
            showAuthOverlay();
            return;
        }
        favorites = await res.json();
        updateFavCount();
        renderUniversityGrid(favorites, 'favoritesGrid');
        document.getElementById('noFavorites').classList.toggle('d-none', favorites.length > 0);
        renderSavedSidebar();
        if (currentUniversities.length > 0) {
            renderResults(document.getElementById('searchInput').value.trim());
        }
    } catch (err) {
        console.error('Failed to load favorites', err);
    }
}

/**
 * Sends a university to the server to be favorited.
 *
 * Returns true only if the server actually confirmed the save (HTTP 2xx).
 * fetch() does NOT throw on error status codes like 401/400/500 — only on
 * network failures — so checking res.ok explicitly is what catches a save
 * that silently failed on the backend (e.g. session expired, bad request).
 */
async function addFavorite(university) {
    try {
        const res = await fetch(`${API_BASE}/university/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(university)
        });
        if (!res.ok) {
            console.error('Add favorite failed with status', res.status);
            if (res.status === 401) {
                showAuthOverlay();
            }
            return false;
        }
        await loadFavorites();
        return true;
    } catch (err) {
        console.error('Failed to add favorite', err);
        return false;
    }
}

async function removeFavorite(universityId) {
    try {
        const res = await fetch(`${API_BASE}/university/favorites/${universityId}`, { method: 'DELETE' });
        if (!res.ok) {
            console.error('Remove favorite failed with status', res.status);
            return false;
        }
        await loadFavorites();
        return true;
    } catch (err) {
        console.error('Failed to remove favorite', err);
        return false;
    }
}

function isFavorite(universityId) {
    return favorites.some(u => u.universityId === universityId);
}

function updateFavCount() {
    const badge = document.getElementById('favCount');
    if (!badge) return;
    if (favorites.length > 0) {
        badge.textContent = favorites.length;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

function renderSavedSidebar() {
    const list = document.getElementById('savedList');
    if (favorites.length === 0) {
        list.innerHTML = '<li class="text-muted small px-2 py-3">Nothing saved yet</li>';
        return;
    }
    list.innerHTML = favorites.slice(0, 5).map(u => `
        <li>
            <div class="saved-thumb"><i class="bi bi-mortarboard"></i></div>
            <div class="saved-info">
                <div class="saved-name">${escapeHtml(u.name)}</div>
                <div class="saved-country">${escapeHtml(u.country || '')}</div>
            </div>
            <button class="saved-heart" onclick="removeFavorite(${u.universityId})" title="Remove">
                <i class="bi bi-heart-fill"></i>
            </button>
        </li>
    `).join('');
}

// --- Flag helper ---
function flagEmoji(alphaTwoCode) {
    if (!alphaTwoCode || alphaTwoCode.length !== 2) return null;
    const code = alphaTwoCode.toUpperCase();
    const codePoints = [...code].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
    return String.fromCodePoint(...codePoints);
}

// --- Rendering ---
function renderUniversityGrid(universities, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = universities.map(uni => {
        const flag = flagEmoji(uni.alphaTwoCode);
        const domain = (uni.domains && uni.domains.length > 0) ? uni.domains[0] : '';
        const isFav = isFavorite(uni.universityId);

        return `
            <div class="movie-card" onclick="openDetail(${uni.universityId})">
                <div class="uni-photo">
                    <!-- pic for this uni -->
                    ${flag ? `<span class="uni-flag">${flag}</span>` : `<i class="bi bi-mortarboard"></i>`}
                </div>
                <div class="card-body">
                    <div class="card-title" title="${escapeHtml(uni.name)}">${escapeHtml(uni.name)}</div>
                    <div class="card-meta">
                        <span class="rating-badge"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(uni.country || 'Unknown')}</span>
                        <span class="text-muted">${escapeHtml(domain)}</span>
                        <button class="fav-btn ${isFav ? 'active' : ''}"
                                onclick="event.stopPropagation(); toggleFavorite(${uni.universityId})"
                                title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                            <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- University Detail Modal ---
function openDetail(universityId) {
    const university = findUniversity(universityId);
    if (!university) return;

    selectedUniversity = university;
    const isFav = isFavorite(university.universityId);
    const website = (university.webPages && university.webPages.length > 0) ? university.webPages[0] : null;
    const domain = (university.domains && university.domains.length > 0) ? university.domains[0] : null;

    document.getElementById('modalName').textContent = university.name;
    document.getElementById('modalCountry').textContent = university.country || 'Unknown';
    document.getElementById('modalDomain').textContent = domain || 'No website listed';
    document.getElementById('modalEmail').textContent = domain ? `info@${domain}` : 'Not available';

    const websiteBtn = document.getElementById('modalWebsiteBtn');
    websiteBtn.href = website || '#';
    websiteBtn.classList.toggle('d-none', !website);

    const favBtn = document.getElementById('modalFavBtn');
    favBtn.innerHTML = isFav
        ? '<i class="bi bi-heart-fill"></i> Remove from Favorites'
        : '<i class="bi bi-heart"></i> Add to Favorites';
    favBtn.className = isFav ? 'btn btn-outline-primary btn-lg' : 'btn btn-primary btn-lg';

    new bootstrap.Modal(document.getElementById('universityModal')).show();
}

async function toggleFavoriteFromModal() {
    if (!selectedUniversity) return;
    await toggleFavorite(selectedUniversity.universityId);

    const isFav = isFavorite(selectedUniversity.universityId);
    const favBtn = document.getElementById('modalFavBtn');
    favBtn.innerHTML = isFav
        ? '<i class="bi bi-heart-fill"></i> Remove from Favorites'
        : '<i class="bi bi-heart"></i> Add to Favorites';
    favBtn.className = isFav ? 'btn btn-outline-primary btn-lg' : 'btn btn-primary btn-lg';
}

async function toggleFavorite(universityId) {
    if (isFavorite(universityId)) {
        await removeFavorite(universityId);
    } else {
        const university = findUniversity(universityId);
        if (university) await addFavorite(university);
    }
}

function findUniversity(universityId) {
    return currentUniversities.find(u => u.universityId === universityId)
        || favorites.find(u => u.universityId === universityId);
}

// --- Chat ---
function toggleChat() {
    const sidebar = document.getElementById('chatSidebar');
    sidebar.classList.toggle('open');
    document.getElementById('btnChat').classList.toggle('active', sidebar.classList.contains('open'));
    if (sidebar.classList.contains('open')) {
        document.getElementById('chatInput').focus();
    }
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    appendChatMsg('user', message);
    input.value = '';
    input.disabled = true;
    document.getElementById('chatSendBtn').disabled = true;

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        appendChatMsg('bot', data.response || data.error || 'No response');
        if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            appendChatRecommendations(data.recommendations);
        }
    } catch (err) {
        appendChatMsg('bot', 'Sorry, something went wrong. Please try again.');
    } finally {
        input.disabled = false;
        document.getElementById('chatSendBtn').disabled = false;
        input.focus();
    }
}

function appendChatRecommendations(universities) {
    const container = document.getElementById('chatMessages');
    const wrap = document.createElement('div');
    wrap.className = 'chat-recs';

    universities.forEach(university => {
        const chip = document.createElement('div');
        chip.className = 'chat-rec';

        const label = document.createElement('span');
        label.className = 'chat-rec-title';
        label.textContent = university.country
            ? `${university.name} (${university.country})`
            : university.name;

        const btn = document.createElement('button');
        btn.className = 'chat-rec-btn';
        setSaveButtonState(btn, isFavorite(university.universityId));
        btn.onclick = () => saveFromChat(university, btn);

        chip.appendChild(label);
        chip.appendChild(btn);
        wrap.appendChild(chip);
    });

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function setSaveButtonState(btn, saved) {
    btn.classList.toggle('saved', saved);
    btn.innerHTML = saved
        ? '<i class="bi bi-check-lg"></i> Saved'
        : '<i class="bi bi-heart"></i> Save to Favorites';
}

/**
 * Saves a chat-recommended university to favorites.
 *
 * Only flips the button to "Saved" if addFavorite() actually confirmed the
 * save succeeded — otherwise the button would show "Saved" even when the
 * request silently failed (e.g. session expired), which is the bug we hit.
 */
async function saveFromChat(university, btn) {
    if (isFavorite(university.universityId)) return;
    btn.disabled = true;
    const success = await addFavorite(university);
    if (success) {
        setSaveButtonState(btn, true);
    } else {
        alert('Could not save this university. Please make sure you are logged in and try again.');
    }
    btn.disabled = false;
}

function appendChatMsg(role, text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    const p = document.createElement('p');
    p.textContent = text;
    div.appendChild(p);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// --- Utility ---
function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}