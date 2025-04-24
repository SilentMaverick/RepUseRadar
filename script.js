// Cache DOM elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const languageFilter = document.getElementById('languageFilter');
const sortFilter = document.getElementById('sortFilter');
const orderFilter = document.getElementById('orderFilter');
const starsFilter = document.getElementById('starsFilter');
const createdFilter = document.getElementById('createdFilter');
const resultsContainer = document.getElementById('resultsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const trendingReposContainer = document.getElementById('trendingReposContainer');
const topUsersContainer = document.getElementById('topUsersContainer');
const userSortFilter = document.getElementById('userSortFilter');

// Initialize with trending data
document.addEventListener('DOMContentLoaded', () => {
    fetchTrendingRepositories();
    fetchTopUsers();
    if (typeof initMeteors === 'function') {
        initMeteors();
    }
});

// Add glow effect to buttons
document.querySelectorAll('[data-glow]').forEach(button => {
    button.addEventListener('mousemove', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        button.style.setProperty('--x', `${x}px`);
        button.style.setProperty('--y', `${y}px`);
    });
});

// Handle form submission
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await searchRepositories();
});

async function searchRepositories() {
    const query = searchInput.value.trim();
    if (!query) return;

    // Show loading spinner
    loadingSpinner.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    try {
        // Build search query with exact and similar matches
        let queryString = `${query} in:name,description`;
        
        if (languageFilter.value) {
            queryString += ` language:${languageFilter.value}`;
        }
        if (starsFilter.value) {
            queryString += ` stars:${starsFilter.value}`;
        }
        
        if (createdFilter.value) {
            const date = new Date();
            switch (createdFilter.value) {
                case 'today':
                    date.setDate(date.getDate() - 1);
                    break;
                case 'week':
                    date.setDate(date.getDate() - 7);
                    break;
                case 'month':
                    date.setMonth(date.getMonth() - 1);
                    break;
                case 'year':
                    date.setFullYear(date.getFullYear() - 1);
                    break;
            }
            queryString += ` created:>=${date.toISOString().split('T')[0]}`;
        }

        // Build URL with parameters
        const params = new URLSearchParams({
            q: queryString,
            sort: sortFilter.value,
            order: orderFilter.value,
            per_page: '30'
        });

        // Fetch repositories from GitHub API
        const response = await fetch(
            `https://api.github.com/search/repositories?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(response.status === 403 
                ? 'API rate limit exceeded. Please try again later.' 
                : 'Failed to fetch repositories');
        }

        const data = await response.json();
        
        // Sort results to prioritize name matches
        const sortedItems = data.items.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return 0;
        });

        displayResults(sortedItems);
    } catch (error) {
        displayError(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function displayResults(repositories) {
    if (!repositories.length) {
        resultsContainer.innerHTML = `
            <div class="text-center text-gray-400">
                No repositories found. Try a different search.
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = repositories.map(repo => `
        <div class="repository-card">
            <h3>
                <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
                    ${highlightMatch(repo.full_name, searchInput.value)}
                </a>
            </h3>
            <p>${highlightMatch(repo.description || 'No description available.', searchInput.value)}</p>
            <div class="repository-meta">
                <span title="Stars">⭐ ${repo.stargazers_count.toLocaleString()}</span>
                <span title="Forks">🔀 ${repo.forks_count.toLocaleString()}</span>
                ${repo.language ? `<span title="Language">📝 ${repo.language}</span>` : ''}
                <span title="Last Updated">🕒 ${formatDate(repo.updated_at)}</span>
            </div>
        </div>
    `).join('');
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-blue-200 text-blue-800 px-1 rounded">$1</mark>');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const day = 24 * 60 * 60 * 1000;
    
    if (diff < day) {
        return 'Today';
    } else if (diff < 7 * day) {
        return `${Math.floor(diff / day)} days ago`;
    } else if (diff < 30 * day) {
        return `${Math.floor(diff / (7 * day))} weeks ago`;
    } else if (diff < 365 * day) {
        return `${Math.floor(diff / (30 * day))} months ago`;
    }
    return date.toLocaleDateString();
}

function displayError(message) {
    resultsContainer.innerHTML = `
        <div class="error-message">
            ${message}
        </div>
    `;
}

// Add debouncing to search
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (searchInput.value.trim()) {
            searchRepositories();
        }
    }, 500);
});

async function fetchTrendingRepositories() {
    try {
        loadingSpinner.classList.remove('hidden');
        
        // Get today's date and yesterday's date
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Format date as YYYY-MM-DD
        const dateQuery = `created:>${yesterday.toISOString().split('T')[0]}`;
        
        const params = new URLSearchParams({
            q: `${dateQuery} stars:>10`,
            sort: 'stars',
            order: 'desc',
            per_page: '5'
        });

        const response = await fetch(
            `https://api.github.com/search/repositories?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(response.status === 403 
                ? 'API rate limit exceeded. Please try again later.' 
                : 'Failed to fetch trending repositories');
        }

        const data = await response.json();
        displayTrendingResults(data.items);
    } catch (error) {
        displayError(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

async function fetchTopUsers() {
    try {
        loadingSpinner.classList.remove('hidden');
        
        const params = new URLSearchParams({
            q: 'followers:>1000',
            sort: userSortFilter.value || 'followers',
            order: 'desc',
            per_page: '5'
        });

        const response = await fetch(
            `https://api.github.com/search/users?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(response.status === 403 
                ? 'API rate limit exceeded. Please try again later.' 
                : 'Failed to fetch top users');
        }

        const data = await response.json();
        const usersWithDetails = await Promise.all(
            data.items.map(async user => {
                const detailsResponse = await fetch(user.url);
                const userData = await detailsResponse.json();
                
                // Fetch commit count
                try {
                    const eventsResponse = await fetch(
                        `https://api.github.com/users/${user.login}/events/public`
                    );
                    const events = await eventsResponse.json();
                    const commitCount = events
                        .filter(event => event.type === 'PushEvent')
                        .reduce((total, event) => total + (event.payload.commits?.length || 0), 0);
                    return { ...userData, commitCount };
                } catch (error) {
                    return { ...userData, commitCount: 0 };
                }
            })
        );

        displayTopUsers(usersWithDetails);
    } catch (error) {
        displayError(error.message);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

function displayTrendingResults(repositories) {
    trendingReposContainer.innerHTML = repositories.map(repo => `
        <div class="repository-card relative">
            <div class="trending-label">🔥 Trending</div>
            <h3>
                <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="text-blue-800">
                    ${repo.full_name}
                </a>
            </h3>
            <p class="text-blue-900">${repo.description || 'No description available.'}</p>
            <div class="repository-meta">
                <span title="Stars">⭐ ${repo.stargazers_count.toLocaleString()}</span>
                <span title="Forks">🔀 ${repo.forks_count.toLocaleString()}</span>
                ${repo.language ? `<span title="Language">📝 ${repo.language}</span>` : ''}
                <span title="Created">📅 ${formatDate(repo.created_at)}</span>
            </div>
        </div>
    `).join('');
}

function displayTopUsers(users) {
    topUsersContainer.innerHTML = users.map(user => `
        <div class="user-card">
            <img src="${user.avatar_url}" alt="${user.login}" class="user-avatar">
            <div class="user-info">
                <h3>
                    <a href="${user.html_url}" target="_blank" rel="noopener noreferrer" class="text-blue-800">
                        ${user.login}
                    </a>
                </h3>
                ${user.bio ? `<p class="text-blue-900 mb-2">${user.bio}</p>` : ''}
                <div class="user-meta">
                    <span title="Commits" class="commits-badge">🔨 ${user.commitCount.toLocaleString()} commits</span>
                    <span title="Followers">👥 ${user.followers.toLocaleString()} followers</span>
                    <span title="Public Repositories">📚 ${user.public_repos.toLocaleString()} repos</span>
                    ${user.location ? `<span title="Location">📍 ${user.location}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Handle user sort change
userSortFilter.addEventListener('change', fetchTopUsers); 