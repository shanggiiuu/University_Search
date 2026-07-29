const API_BASE = '/api';
const PAGE_SIZE = 6;

const COUNTRIES = [
    'Philippines', 'Japan', 'Singapore', 'Canada', 'USA', 'United Kingdom',
    'Australia', 'Germany', 'France', 'Armenia', 'India', 'Brazil',
    'South Korea', 'Italy', 'Spain', 'Mexico', 'China', 'Netherlands'
];

let currentUniversities = [];
let favorites = [];
let watchlist = [];
let selectedUniversity = null;
let authMode = 'login'; // 'login' or 'register'
let currentQuery = '';
let currentPage = 1;

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initTheme();
    populateCountryDropdown();

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
});

// --- Theme ---
function initTheme() {
    const saved = localStorage.getItem('unisearch-theme');
    const theme = saved || 'light';
    applyTheme(theme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
    }
    localStorage.setItem('unisearch-theme', theme);
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
}

// --- Country dropdown ---
function populateCountryDropdown() {
    const select = document.getElementById('countrySelect');
    COUNTRIES.forEach(country => {
        const opt = document.createElement('option');
        opt.value = country;
        opt.textContent = country;
        select.appendChild(opt);
    });
}

function onCountrySelect() {
    const value = document.getElementById('countrySelect').value;
    if (value) {
        document.getElementById('searchInput').value = value;
        searchUniversities();
    }
}

function quickSearch(country) {
    document.getElementById('searchInput').value = country;
    document.getElementById('countrySelect').value = country;
    showSection('browse');
    searchUniversities();
}

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
    loadWatchlist();
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    const isLogin = authMode === 'login';
    document.getElementById('authSubtitle').textContent =
        isLogin ? 'Log in to save your favorite universities' : 'Create an account to save your favorites';
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
    watchlist = [];
    currentUniversities = [];
    document.getElementById('universityGrid').innerHTML = '';
    document.getElementById('favoritesGrid').innerHTML = '';
    document.getElementById('watchlistGrid').innerHTML = '';
    updateWatchCount();
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
function goHome() {
    showSection('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSection(section) {
    document.getElementById('browseSection').classList.toggle('d-none', section !== 'browse');
    document.getElementById('favoritesSection').classList.toggle('d-none', section !== 'favorites');
    document.getElementById('watchlistSection').classList.toggle('d-none', section !== 'watchlist');
    document.getElementById('aboutSection').classList.toggle('d-none', section !== 'about');

    document.getElementById('navHome').classList.toggle('active', section === 'browse' && !currentQuery);
    document.getElementById('navUniversities').classList.toggle('active', section === 'browse');
    document.getElementById('navFavorites').classList.toggle('active', section === 'favorites');
    document.getElementById('navAbout').classList.toggle('active', section === 'about');

    if (section === 'favorites') {
        loadFavorites();
    } else if (section === 'watchlist') {
        loadWatchlist();
    }

    if (section !== 'about') {
        document.querySelector('.page-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- Search ---
async function searchUniversities() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    currentQuery = query;
    showSection('browse');
    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/university/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        currentUniversities = await res.json();
        currentPage = 1;
        renderResults(query);
    } catch (err) {
        console.error(err);
        document.getElementById('resultsTitle').textContent = 'Error searching universities';
    } finally {
        showLoading(false);
    }
}

function clearSearch() {
    currentQuery = '';
    currentUniversities = [];
    currentPage = 1;
    document.getElementById('searchInput').value = '';
    document.getElementById('countrySelect').value = '';
    document.getElementById('universityGrid').innerHTML = '';
    document.getElementById('resultsShowing').innerHTML = '';
    document.getElementById('resultsTotal').textContent = '';
    document.getElementById('resultsTitle').textContent = 'Search for a country to get started';
    document.getElementById('noResults').classList.add('d-none');
    document.getElementById('paginationWrap').classList.add('d-none');
}

function clearAllFilters() {
    document.getElementById('majorSelect').value = '';
    document.getElementById('tuitionSelect').value = '';
    document.getElementById('acceptanceSelect').value = '';
    document.getElementById('scholarshipsCheck').checked = true;
    document.getElementById('englishCheck').checked = true;
    clearSearch();
}

function renderResults(query) {
    const hasResults = currentUniversities.length > 0;
    document.getElementById('resultsTitle').textContent = hasResults ? '' : '';
    document.getElementById('noResults').classList.toggle('d-none', hasResults);

    document.getElementById('resultsShowing').innerHTML = hasResults
        ? `Showing results for: <span class="filter-tag">${escapeHtml(query)}
             <button onclick="clearSearch()" title="Clear filter">✕</button></span>`
        : '';
    document.getElementById('resultsTotal').innerHTML = hasResults
        ? `Showing <strong>${currentUniversities.length}</strong> universities`
        : '';

    const totalPages = Math.max(1, Math.ceil(currentUniversities.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const visible = currentUniversities.slice(start, start + PAGE_SIZE);
    renderUniversityGrid(visible, 'universityGrid', 'search');
    renderPagination(currentUniversities.length, totalPages);
}

function goToPage(page) {
    currentPage = page;
    renderResults(currentQuery);
    document.querySelector('.page-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPagination(total, totalPages) {
    const wrap = document.getElementById('paginationWrap');
    if (total === 0 || totalPages <= 1) {
        wrap.innerHTML = '';
        wrap.classList.add('d-none');
        return;
    }
    wrap.classList.remove('d-none');

    let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''}
        onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;

    paginationRange(currentPage, totalPages).forEach(p => {
        html += p === '...'
            ? `<span class="page-ellipsis">…</span>`
            : `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
    });

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''}
        onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;

    wrap.innerHTML = html;
}

function paginationRange(current, total) {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }
    if (current - delta > 2) range.unshift('...');
    if (current + delta < total - 1) range.push('...');
    range.unshift(1);
    if (total > 1) range.push(total);
    return range;
}

// --- Favorites ---
async function loadFavorites() {
    try {
        const res = await fetch(`${API_BASE}/university/favorites`);
        if (res.status === 401) {
            showAuthOverlay();
            return;
        }
        if (!res.ok) throw new Error('Failed to load favorites');
        const data = await res.json();
        favorites = Array.isArray(data) ? data : [];
        renderUniversityGrid(favorites, 'favoritesGrid', 'favorites');
        document.getElementById('noFavorites').classList.toggle('d-none', favorites.length > 0);
        // Re-render search results to update bookmark icons
        if (currentUniversities.length > 0) {
            renderResults(currentQuery);
        }
    } catch (err) {
        console.error('Failed to load favorites', err);
    }
}

async function addFavorite(university) {
    try {
        await fetch(`${API_BASE}/university/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(university)
        });
        await loadFavorites();
    } catch (err) {
        console.error('Failed to add favorite', err);
    }
}

async function removeFavorite(id) {
    try {
        await fetch(`${API_BASE}/university/favorites/${id}`, { method: 'DELETE' });
        await loadFavorites();
    } catch (err) {
        console.error('Failed to remove favorite', err);
    }
}

function isFavorite(id) {
    return favorites.some(u => u.id === id);
}

// --- Watchlist (save for later) ---
async function loadWatchlist() {
    try {
        const res = await fetch(`${API_BASE}/university/watchlist`);
        if (res.status === 401) {
            showAuthOverlay();
            return;
        }
        if (!res.ok) throw new Error('Failed to load watchlist');
        const data = await res.json();
        watchlist = Array.isArray(data) ? data : [];
        updateWatchCount();
        renderUniversityGrid(watchlist, 'watchlistGrid', 'watchlist');
        document.getElementById('noWatchlist').classList.toggle('d-none', watchlist.length > 0);
    } catch (err) {
        console.error('Failed to load watchlist', err);
    }
}

async function addToWatchlist(university) {
    try {
        await fetch(`${API_BASE}/university/watchlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(university)
        });
        await loadWatchlist();
    } catch (err) {
        console.error('Failed to add to watchlist', err);
    }
}

async function removeFromWatchlist(id) {
    try {
        await fetch(`${API_BASE}/university/watchlist/${id}`, { method: 'DELETE' });
        await loadWatchlist();
    } catch (err) {
        console.error('Failed to remove from watchlist', err);
    }
}

function isInWatchlist(id) {
    return watchlist.some(u => u.id === id);
}

function updateWatchCount() {
    const badge = document.getElementById('watchCount');
    if (watchlist.length > 0) {
        badge.textContent = watchlist.length;
        badge.classList.remove('d-none');
    } else {
        badge.classList.add('d-none');
    }
}

// --- Mock display data ---
// Rating, acceptance rate, tuition, and subject tags aren't provided by the
// backend yet. These are deterministic placeholders derived from the
// university's name/country so a given card always looks the same.
const TAG_POOL = ['Engineering', 'Business', 'Research', 'Science', 'Technology',
    'Humanities', 'Arts', 'Medicine', 'Law', 'Computer Science', 'Design', 'Economics'];
const TAG_COLORS = ['blue', 'green', 'purple', 'orange', 'teal', 'pink'];

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function uniHash(uni) {
    return hashString(`${uni.name || ''}|${uni.country || ''}`);
}

function mockRating(uni) {
    const h = uniHash(uni);
    return (3.5 + (h % 16) / 10).toFixed(1);
}

function mockAcceptanceRate(uni) {
    const h = uniHash(uni);
    return 3 + (h % 90);
}

function mockTuition(uni) {
    const h = uniHash(uni);
    return 4000 + (h % 58) * 1000;
}

function mockTags(uni) {
    const h = uniHash(uni);
    const first = h % TAG_POOL.length;
    const second = (h >> 4) % TAG_POOL.length;
    const tags = [TAG_POOL[first]];
    if (second !== first) tags.push(TAG_POOL[second]);
    return tags;
}

function tagColorClass(tag) {
    return TAG_COLORS[hashString(tag) % TAG_COLORS.length];
}

function cardImageUrl(uni) {
    return `https://picsum.photos/seed/uni-${uniHash(uni)}/600/400`;
}

function countryFlag(alphaTwoCode) {
    if (!alphaTwoCode || alphaTwoCode.length !== 2) return '';
    return alphaTwoCode.toUpperCase().replace(/./g, ch =>
        String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

// --- Rendering ---
function renderUniversityGrid(universities, containerId, mode) {
    const container = document.getElementById(containerId);
    container.innerHTML = universities.map((uni) => {
        const website = (uni.webPages && uni.webPages[0]) || '#';
        const flag = countryFlag(uni.alphaTwoCode);
        const rating = mockRating(uni);
        const acceptanceRate = mockAcceptanceRate(uni);
        const tuition = mockTuition(uni);
        const tags = mockTags(uni);

        let heartBtn;
        if (mode === 'watchlist') {
            heartBtn = `
                <button class="heart-btn active"
                        onclick="event.stopPropagation(); removeFromWatchlist(${uni.id})"
                        title="Remove from watchlist">
                    <i class="bi bi-bookmark-x-fill"></i>
                </button>`;
        } else {
            const isFav = isFavorite(uni.id);
            heartBtn = `
                <button class="heart-btn ${isFav ? 'active' : ''}"
                        onclick="event.stopPropagation(); toggleFavorite(${uni.id})"
                        title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
                </button>`;
        }

        return `
            <div class="uni-card-v2" onclick="openDetail(${uni.id})">
                <div class="uni-card-photo">
                    <img src="${cardImageUrl(uni)}" alt="" loading="lazy">
                    ${heartBtn}
                </div>
                <div class="uni-card-body">
                    <div class="uni-name" title="${escapeHtml(uni.name)}">${escapeHtml(uni.name)}</div>
                    <div class="uni-card-row-split">
                        <span class="uni-location">${flag} ${escapeHtml(uni.country || '')}</span>
                        <span class="uni-rating"><i class="bi bi-star-fill"></i> ${rating}</span>
                    </div>
                    <div class="uni-stat-row">
                        <span>Acceptance Rate</span><strong>${acceptanceRate}%</strong>
                    </div>
                    <div class="uni-stat-row">
                        <span>Tuition (per year)</span><strong>$${tuition.toLocaleString()}</strong>
                    </div>
                    <div class="uni-tags">
                        ${tags.map(t => `<span class="tag-pill tag-${tagColorClass(t)}">${t}</span>`).join('')}
                    </div>
                    <a class="uni-website-link" href="${website}" target="_blank" rel="noopener"
                       onclick="event.stopPropagation()">
                        View Website <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// --- University Detail Modal ---
function openDetail(universityId) {
    const uni = findUniversity(universityId);
    if (!uni) return;

    selectedUniversity = uni;
    const domain = (uni.domains && uni.domains[0]) || 'No domain listed';
    const website = (uni.webPages && uni.webPages[0]) || '#';
    const isFav = isFavorite(uni.id);

    document.getElementById('modalName').textContent = uni.name;
    document.getElementById('modalCountry').textContent = uni.country || 'Unknown';
    document.getElementById('modalDomain').textContent = domain;
    document.getElementById('modalEmail').textContent = domain;
    document.getElementById('modalWebsiteBtn').href = website;

    const favBtn = document.getElementById('modalFavBtn');
    favBtn.innerHTML = isFav
        ? '<i class="bi bi-heart-fill"></i> Remove from Favorites'
        : '<i class="bi bi-heart"></i> Save to Favorites';

    new bootstrap.Modal(document.getElementById('universityModal')).show();
}

async function toggleFavoriteFromModal() {
    if (!selectedUniversity) return;
    await toggleFavorite(selectedUniversity.id);

    const isFav = isFavorite(selectedUniversity.id);
    const favBtn = document.getElementById('modalFavBtn');
    favBtn.innerHTML = isFav
        ? '<i class="bi bi-heart-fill"></i> Remove from Favorites'
        : '<i class="bi bi-heart"></i> Save to Favorites';
}

async function toggleFavorite(universityId) {
    if (isFavorite(universityId)) {
        await removeFavorite(universityId);
    } else {
        const uni = findUniversity(universityId);
        if (uni) await addFavorite(uni);
    }
}

function findUniversity(id) {
    return currentUniversities.find(u => u.id === id)
        || favorites.find(u => u.id === id)
        || watchlist.find(u => u.id === id);
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

    universities.forEach(uni => {
        const chip = document.createElement('div');
        chip.className = 'chat-rec';

        const label = document.createElement('span');
        label.className = 'chat-rec-title';
        label.textContent = uni.country ? `${uni.name} (${uni.country})` : uni.name;

        const btn = document.createElement('button');
        btn.className = 'chat-rec-btn';
        setSaveButtonState(btn, isInWatchlist(uni.id));
        btn.onclick = () => saveFromChat(uni, btn);

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
        : '<i class="bi bi-bookmark-plus"></i> Save for later';
}

async function saveFromChat(uni, btn) {
    if (isInWatchlist(uni.id)) return;
    btn.disabled = true;
    await addToWatchlist(uni);
    setSaveButtonState(btn, true);
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
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
}
