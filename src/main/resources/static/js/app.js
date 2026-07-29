const API_BASE = '/api';

let currentUniversities = [];
let favorites = [];
let topUniversities = [];
let hasSearched = false;
let selectedUniversity = null;
let authMode = 'login'; // 'login' or 'register'
let sortMode = 'name-asc';
let currentPage = 1;
let lastSortedList = [];
const PAGE_SIZE = 9;
const imageCache = new Map(); // universityId -> imageUrl | null

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadTopUniversities();

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
    loadAiRecommendations();
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
    document.getElementById('aiRecList').innerHTML = '';
    document.getElementById('aiRecDesc').textContent = 'Log in to get personalized suggestions.';
    updateFavCount();
    renderSavedSidebar();
    authMode = 'login';
    toggleAuthMode();      // reset labels then...
    toggleAuthMode();      // ...back to login state
    goHome();
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
    document.getElementById('homeSection').classList.toggle('d-none', section !== 'home');
    document.getElementById('browseSection').classList.toggle('d-none', section !== 'browse');
    document.getElementById('favoritesSection').classList.toggle('d-none', section !== 'favorites');
    document.getElementById('aboutSection').classList.toggle('d-none', section !== 'about');

    document.getElementById('navHome').classList.toggle('active', section === 'home');
    document.getElementById('navUniversities').classList.toggle('active', section === 'browse');
    document.getElementById('navSaved').classList.toggle('active', section === 'favorites');
    document.getElementById('navAbout').classList.toggle('active', section === 'about');

    if (section === 'favorites') {
        loadFavorites();
    }
    if (section === 'browse' && !hasSearched) {
        renderTopUniversitiesInBrowse();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function goHome() {
    showSection('home');
}

function quickSearch(term) {
    document.getElementById('searchInput').value = term;
    searchUniversities();
}

// --- Search ---
async function searchUniversities() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    showSection('browse');
    hasSearched = true;
    currentPage = 1;
    showLoading(true);
    try {
        const res = await fetch(`${API_BASE}/university/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        currentUniversities = await res.json();
        renderResults(query);
    } catch (err) {
        console.error(err);
        document.getElementById('resultsTitle').textContent = 'Error searching universities';
    } finally {
        showLoading(false);
    }
}

function renderResults(query) {
    const sorted = sortUniversities(currentUniversities);

    document.getElementById('resultsTitle').textContent =
        currentUniversities.length > 0 ? '' : 'Search for a country or university name to get started';
    document.getElementById('resultsShowing').textContent =
        sorted.length > 0 ? `Showing ${sorted.length} universit${sorted.length === 1 ? 'y' : 'ies'}` : '';
    document.getElementById('noResults').classList.toggle('d-none', sorted.length > 0 || currentUniversities.length === 0);

    renderPage(sorted);
}

function sortUniversities(list) {
    const sorted = [...list];
    switch (sortMode) {
        case 'name-desc':
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
        case 'country-asc':
            sorted.sort((a, b) => (a.country || '').localeCompare(b.country || ''));
            break;
        default:
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return sorted;
}

function renderPage(sorted) {
    lastSortedList = sorted;
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(start, start + PAGE_SIZE);
    renderUniversityGrid(pageItems, 'universityGrid');
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const wrap = document.getElementById('paginationWrap');
    if (totalPages <= 1) {
        wrap.classList.add('d-none');
        wrap.innerHTML = '';
        return;
    }
    wrap.classList.remove('d-none');
    let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>`;

    for (let p = 1; p <= totalPages; p++) {
        const nearEdge = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
        if (nearEdge) {
            html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`;
        } else if (p === 2 || p === totalPages - 1) {
            html += `<span class="page-ellipsis">…</span>`;
        }
    }

    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
    wrap.innerHTML = html;
}

function goToPage(p) {
    currentPage = p;
    renderPage(lastSortedList);
    document.getElementById('browseSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onSortChange() {
    sortMode = document.getElementById('sortSelect').value;
    currentPage = 1;
    renderResults(document.getElementById('searchInput').value.trim());
}

// --- Top Universities (curated spotlight for home + default browse view) ---
async function loadTopUniversities() {
    try {
        const res = await fetch(`${API_BASE}/university/top`);
        if (!res.ok) throw new Error('Failed to load top universities');
        topUniversities = await res.json();
        renderUniversityGrid(topUniversities, 'topUniGrid');
        if (!hasSearched) {
            renderTopUniversitiesInBrowse();
        }
    } catch (err) {
        console.error('Failed to load top universities', err);
    }
}

function renderTopUniversitiesInBrowse() {
    document.getElementById('resultsTitle').textContent = 'Top Universities';
    document.getElementById('resultsShowing').textContent = topUniversities.length > 0
        ? `Showing ${topUniversities.length} top pick${topUniversities.length === 1 ? '' : 's'}`
        : '';
    document.getElementById('noResults').classList.add('d-none');
    document.getElementById('paginationWrap').classList.add('d-none');
    renderUniversityGrid(topUniversities, 'universityGrid');
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
        if (topUniversities.length > 0) {
            renderUniversityGrid(topUniversities, 'topUniGrid');
            if (!hasSearched) {
                renderUniversityGrid(topUniversities, 'universityGrid');
            }
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

// --- AI Recommendations (home dashboard panel) ---
async function loadAiRecommendations() {
    const list = document.getElementById('aiRecList');
    const desc = document.getElementById('aiRecDesc');
    desc.textContent = 'Thinking of good options for you...';
    list.innerHTML = '<li class="ai-loading">Asking the assistant...</li>';

    const message = favorites.length > 0
        ? `Suggest 3 real universities I might like, similar in spirit to my saved favorites: ${favorites.slice(0, 5).map(u => `${u.name} (${u.country})`).join(', ')}. Keep your reply to one short sentence.`
        : `Suggest 3 well-regarded real universities from different countries for someone just starting to explore their options. Keep your reply to one short sentence.`;

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        if (!res.ok) {
            desc.textContent = data.error || "Couldn't load recommendations right now.";
            list.innerHTML = '';
            return;
        }

        desc.textContent = data.response || 'Here are a few universities you might like.';
        const recs = Array.isArray(data.recommendations) ? data.recommendations : [];

        if (recs.length === 0) {
            list.innerHTML = '<li class="text-muted small">No suggestions right now — try the chat assistant for more.</li>';
            return;
        }

        list.innerHTML = '';
        recs.forEach(u => list.appendChild(buildAiRecItem(u)));
    } catch (err) {
        console.error('Failed to load AI recommendations', err);
        desc.textContent = "Couldn't load recommendations right now.";
        list.innerHTML = '';
    }
}

function buildAiRecItem(university) {
    const li = document.createElement('li');
    const saved = isFavorite(university.universityId);

    const icon = document.createElement('div');
    icon.className = 'ai-rec-icon';
    icon.innerHTML = '<i class="bi bi-mortarboard"></i>';

    const info = document.createElement('div');
    info.className = 'ai-rec-info';
    const strong = document.createElement('strong');
    strong.textContent = university.name;
    const span = document.createElement('span');
    span.textContent = university.country || '';
    info.appendChild(strong);
    info.appendChild(span);

    const btn = document.createElement('button');
    btn.className = 'ai-rec-btn' + (saved ? ' saved' : '');
    btn.title = saved ? 'Saved' : 'Save to favorites';
    btn.innerHTML = saved ? '<i class="bi bi-check-lg"></i>' : '<i class="bi bi-heart"></i>';
    btn.onclick = async () => {
        if (isFavorite(university.universityId)) return;
        btn.disabled = true;
        const ok = await addFavorite(university);
        if (ok) {
            btn.classList.add('saved');
            btn.title = 'Saved';
            btn.innerHTML = '<i class="bi bi-check-lg"></i>';
        }
        btn.disabled = false;
    };

    li.appendChild(icon);
    li.appendChild(info);
    li.appendChild(btn);
    return li;
}

// --- Flag helper ---
function flagEmoji(alphaTwoCode) {
    if (!alphaTwoCode || alphaTwoCode.length !== 2) return null;
    const code = alphaTwoCode.toUpperCase();
    const codePoints = [...code].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
    return String.fromCodePoint(...codePoints);
}

// --- Campus photos (fetched on demand, per university, and cached) ---
async function loadCampusImage(uni) {
    if (imageCache.has(uni.universityId)) return imageCache.get(uni.universityId);
    try {
        const res = await fetch(`${API_BASE}/university/image?name=${encodeURIComponent(uni.name)}`);
        const data = res.ok ? await res.json() : {};
        imageCache.set(uni.universityId, data.imageUrl || null);
        return data.imageUrl || null;
    } catch {
        imageCache.set(uni.universityId, null);
        return null;
    }
}

function applyCampusImage(uni, containerId, imageUrl) {
    if (!imageUrl) return;
    const card = document.querySelector(`#${containerId} .uni-card[data-uni-id="${uni.universityId}"]`);
    const photo = card && card.querySelector('.uni-photo');
    if (photo && !photo.querySelector('.uni-photo-img')) {
        const img = document.createElement('img');
        img.className = 'uni-photo-img';
        img.alt = uni.name;
        img.loading = 'lazy';
        img.onerror = () => img.remove();
        img.src = imageUrl;
        photo.appendChild(img);
    }
}

// --- Rendering ---
function renderUniversityGrid(universities, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = universities.map(uni => {
        const flag = flagEmoji(uni.alphaTwoCode);
        const domain = (uni.domains && uni.domains.length > 0) ? uni.domains[0] : '';
        const isFav = isFavorite(uni.universityId);
        const knownImage = uni.imageUrl || imageCache.get(uni.universityId);

        return `
            <div class="uni-card" data-uni-id="${uni.universityId}" onclick="openDetail(${uni.universityId})">
                <div class="uni-photo">
                    ${flag ? `<span class="uni-flag">${flag}</span>` : `<i class="bi bi-mortarboard"></i>`}
                    ${knownImage ? `<img class="uni-photo-img" src="${escapeHtml(knownImage)}" alt="${escapeHtml(uni.name)}" loading="lazy" onerror="this.remove()">` : ''}
                    <button class="fav-btn ${isFav ? 'active' : ''}"
                            onclick="event.stopPropagation(); toggleFavorite(${uni.universityId})"
                            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
                    </button>
                </div>
                <div class="card-body">
                    <div class="card-title" title="${escapeHtml(uni.name)}">${escapeHtml(uni.name)}</div>
                    <div class="card-meta">
                        <span class="rating-badge"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(uni.country || 'Unknown')}</span>
                        <span class="text-muted">${escapeHtml(domain)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    universities
        .filter(uni => !uni.imageUrl && !imageCache.has(uni.universityId))
        .forEach(uni => loadCampusImage(uni).then(url => applyCampusImage(uni, containerId, url)));
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

    const modalPhoto = document.getElementById('modalPhoto');
    modalPhoto.innerHTML = '<i class="bi bi-bank2"></i>';
    const knownImage = university.imageUrl || imageCache.get(university.universityId);
    if (knownImage) {
        modalPhoto.appendChild(Object.assign(document.createElement('img'), {
            src: knownImage, alt: university.name, onerror() { this.remove(); }
        }));
    } else {
        loadCampusImage(university).then(url => {
            if (url && selectedUniversity && selectedUniversity.universityId === universityId) {
                modalPhoto.appendChild(Object.assign(document.createElement('img'), {
                    src: url, alt: university.name, onerror() { this.remove(); }
                }));
            }
        });
    }

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
        || favorites.find(u => u.universityId === universityId)
        || topUniversities.find(u => u.universityId === universityId);
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
