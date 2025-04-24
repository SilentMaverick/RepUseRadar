document.addEventListener('DOMContentLoaded', () => {
    // Initialize meteors effect
    if (typeof initMeteors === 'function') {
        initMeteors();
    }

    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const languageFilter = document.getElementById('languageFilter');
    const sortFilter = document.getElementById('sortFilter');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const trendingReposContainer = document.getElementById('trendingReposContainer');
    const trendingSection = document.querySelector('.trending-section');

    // Initialize container styles
    resultsContainer.className = 'grid grid-cols-1 gap-6 mt-8 hidden';
    trendingReposContainer.className = 'grid grid-cols-1 gap-6';

    // Function to show loading spinner
    const showLoading = () => {
        loadingSpinner.classList.remove('hidden');
    };

    // Function to hide loading spinner
    const hideLoading = () => {
        loadingSpinner.classList.add('hidden');
    };

    // Function to make API request
    const makeGitHubRequest = async (endpoint, params) => {
        const url = `${githubConfig.endpoints.base}${endpoint}?${params.toString()}`;
        const response = await fetch(url, {
            headers: githubConfig.getHeaders()
        });
        
        await githubConfig.checkRateLimit(response);
        return response.json();
    };

    // Function to search repositories
    const searchRepositories = async (query, language, sort) => {
        showLoading();
        try {
            // Hide trending section when searching
            if (trendingSection) {
                trendingSection.classList.add('hidden');
            }
            
            // Build search query
            let searchQuery = query;
            if (language) {
                searchQuery += ` language:${language}`;
            }

            const params = new URLSearchParams({
                q: searchQuery,
                sort: sort,
                order: 'desc',
                per_page: 10
            });

            const data = await makeGitHubRequest(githubConfig.endpoints.search.repositories, params);

            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('hidden');

            if (!data.items || data.items.length === 0) {
                resultsContainer.innerHTML = '<p class="text-white/60 text-center">No repositories found matching your criteria.</p>';
                return;
            }

            data.items.forEach(repo => {
                const repoCard = createRepositoryCard(repo);
                resultsContainer.appendChild(repoCard);
            });

            // Scroll to results
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error searching repositories:', error);
            resultsContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        } finally {
            hideLoading();
        }
    };

    // Function to fetch trending repositories
    const fetchTrendingRepositories = async () => {
        showLoading();
        try {
            const date = new Date();
            date.setDate(date.getDate() - 7); // Last 7 days
            const dateString = date.toISOString().split('T')[0];

            const params = new URLSearchParams({
                q: `created:>${dateString} stars:>10`,
                sort: 'stars',
                order: 'desc',
                per_page: 5
            });

            const data = await makeGitHubRequest(githubConfig.endpoints.search.repositories, params);

            trendingReposContainer.innerHTML = '';
            
            if (!data.items || data.items.length === 0) {
                trendingReposContainer.innerHTML = '<p class="text-white/60 text-center">No trending repositories found.</p>';
                return;
            }

            data.items.forEach(repo => {
                const repoCard = createRepositoryCard(repo);
                trendingReposContainer.appendChild(repoCard);
            });
        } catch (error) {
            console.error('Error fetching trending repositories:', error);
            trendingReposContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        } finally {
            hideLoading();
        }
    };

    // Function to create repository card
    const createRepositoryCard = (repo) => {
        const card = document.createElement('div');
        card.className = 'glass-card rounded-lg p-6 hover:border-blue-500/50 transition-all duration-300 mb-4 transform hover:-translate-y-1 hover:shadow-xl';
        
        card.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold mb-2">
                            <a href="${repo.html_url}" target="_blank" class="hover:text-blue-400 transition-colors flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                </svg>
                                ${repo.full_name}
                            </a>
                        </h3>
                        <p class="text-white/60 mb-4 line-clamp-2">${repo.description || 'No description available'}</p>
                    </div>
                    <div class="flex items-start space-x-4 ml-4">
                        <div class="text-center bg-white/5 rounded-lg px-3 py-2">
                            <div class="text-sm text-white/60">Stars</div>
                            <div class="font-semibold text-blue-400">${repo.stargazers_count.toLocaleString()}</div>
                        </div>
                        <div class="text-center bg-white/5 rounded-lg px-3 py-2">
                            <div class="text-sm text-white/60">Forks</div>
                            <div class="font-semibold text-purple-400">${repo.forks_count.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-4 mt-auto pt-4 border-t border-white/10">
                    ${repo.language ? `
                        <div class="flex items-center">
                            <span class="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                            <span class="text-white/80">${repo.language}</span>
                        </div>
                    ` : ''}
                    <span class="text-white/60 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Updated ${new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
        `;

        return card;
    };

    // Add debouncing to search input
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query) {
                searchRepositories(query, languageFilter.value, sortFilter.value);
            }
        }, 500);
    });

    // Event listener for form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            searchRepositories(query, languageFilter.value, sortFilter.value);
        }
    });

    // Event listeners for filters
    [languageFilter, sortFilter].forEach(filter => {
        filter.addEventListener('change', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchRepositories(query, languageFilter.value, sortFilter.value);
            }
        });
    });

    // Initial load of trending repositories
    fetchTrendingRepositories();
}); 