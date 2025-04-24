document.addEventListener('DOMContentLoaded', () => {
    // Initialize meteors effect
    if (typeof initMeteors === 'function') {
        initMeteors();
    }

    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const languageFilter = document.getElementById('languageFilter');
    const locationFilter = document.getElementById('locationFilter');
    const userSortFilter = document.getElementById('userSortFilter');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const topUsersContainer = document.getElementById('topUsersContainer');

    // Function to show loading spinner
    const showLoading = () => {
        loadingSpinner.classList.remove('hidden');
    };

    // Function to hide loading spinner
    const hideLoading = () => {
        loadingSpinner.classList.add('hidden');
    };

    // Function to make API request
    const makeGitHubRequest = async (endpoint, params = null) => {
        const url = params 
            ? `${githubConfig.endpoints.base}${endpoint}?${params.toString()}`
            : `${githubConfig.endpoints.base}${endpoint}`;
            
        const response = await fetch(url, {
            headers: githubConfig.getHeaders()
        });
        
        await githubConfig.checkRateLimit(response);
        return response.json();
    };

    // Function to search users
    const searchUsers = async (query, language, location, sort) => {
        showLoading();
        try {
            // Hide top users section when searching
            const topUsersSection = document.querySelector('.top-users-section');
            if (topUsersSection) {
                topUsersSection.classList.add('hidden');
            }

            // Build search query
            let searchQuery = query;
            if (location) {
                searchQuery += ` location:${location}`;
            }

            const params = new URLSearchParams({
                q: searchQuery,
                sort: sort === 'contributions' ? 'repositories' : sort,
                order: 'desc',
                per_page: 30 // Increased to get more users for filtering
            });

            const data = await makeGitHubRequest(githubConfig.endpoints.search.users, params);

            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('hidden');

            if (!data.items || data.items.length === 0) {
                resultsContainer.innerHTML = '<p class="text-white/60 text-center">No users found matching your criteria.</p>';
                return;
            }

            // Fetch detailed information for each user
            let usersWithDetails = await Promise.all(
                data.items.map(async (user) => {
                    try {
                        const details = await fetchUserDetails(user.login);
                        const contributions = await fetchUserContributions(user.login);
                        const languages = await fetchUserLanguages(user.login);
                        return { ...details, contributions, languages };
                    } catch (error) {
                        console.error(`Error fetching details for ${user.login}:`, error);
                        return null;
                    }
                })
            );

            // Filter out failed fetches and apply language filter
            usersWithDetails = usersWithDetails.filter(user => {
                if (!user) return false;
                if (language && user.languages.length > 0) {
                    return user.languages.includes(language);
                }
                return true;
            });

            // Sort users based on selected criteria
            usersWithDetails.sort((a, b) => {
                switch (sort) {
                    case 'contributions':
                        return b.contributions - a.contributions;
                    case 'repositories':
                        return b.public_repos - a.public_repos;
                    case 'followers':
                        return b.followers - a.followers;
                    default:
                        return b.followers - a.followers;
                }
            });

            if (usersWithDetails.length === 0) {
                resultsContainer.innerHTML = '<p class="text-white/60 text-center">No users found matching your criteria.</p>';
                return;
            }

            usersWithDetails.forEach(user => {
                const userCard = createUserCard(user);
                resultsContainer.appendChild(userCard);
            });

            // Scroll to results
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error searching users:', error);
            resultsContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        } finally {
            hideLoading();
        }
    };

    // Function to fetch user details
    const fetchUserDetails = async (username) => {
        return makeGitHubRequest(`${githubConfig.endpoints.user}/${username}`);
    };

    // Function to fetch user contributions
    const fetchUserContributions = async (username) => {
        try {
            const events = await makeGitHubRequest(`${githubConfig.endpoints.user}/${username}/events/public`);
            return events
                .filter(event => event.type === 'PushEvent')
                .reduce((total, event) => total + (event.payload.commits?.length || 0), 0);
        } catch (error) {
            console.error('Error fetching contributions:', error);
            return 0;
        }
    };

    // Function to fetch user's most used languages
    const fetchUserLanguages = async (username) => {
        try {
            const repos = await makeGitHubRequest(`${githubConfig.endpoints.user}/${username}/repos`);
            
            const languages = repos.reduce((acc, repo) => {
                if (repo.language) {
                    acc[repo.language] = (acc[repo.language] || 0) + 1;
                }
                return acc;
            }, {});

            return Object.entries(languages)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([lang]) => lang);
        } catch (error) {
            console.error('Error fetching languages:', error);
            return [];
        }
    };

    // Function to fetch top users
    const fetchTopUsers = async () => {
        showLoading();
        try {
            const params = new URLSearchParams({
                q: 'followers:>1000',
                sort: userSortFilter.value === 'contributions' ? 'repositories' : userSortFilter.value,
                order: 'desc',
                per_page: 30 // Increased to get more users for filtering
            });

            const data = await makeGitHubRequest(githubConfig.endpoints.search.users, params);

            topUsersContainer.innerHTML = '';

            if (!data.items || data.items.length === 0) {
                topUsersContainer.innerHTML = '<p class="text-white/60 text-center">No top users found.</p>';
                return;
            }

            let usersWithDetails = await Promise.all(
                data.items.map(async (user) => {
                    try {
                        const details = await fetchUserDetails(user.login);
                        const contributions = await fetchUserContributions(user.login);
                        const languages = await fetchUserLanguages(user.login);
                        return { ...details, contributions, languages };
                    } catch (error) {
                        console.error(`Error fetching details for ${user.login}:`, error);
                        return null;
                    }
                })
            );

            // Filter out failed fetches and apply filters
            usersWithDetails = usersWithDetails.filter(user => {
                if (!user) return false;
                if (languageFilter.value && user.languages.length > 0) {
                    return user.languages.includes(languageFilter.value);
                }
                if (locationFilter.value && user.location) {
                    return user.location.toLowerCase().includes(locationFilter.value.toLowerCase());
                }
                return true;
            });

            // Sort users based on selected criteria
            usersWithDetails.sort((a, b) => {
                switch (userSortFilter.value) {
                    case 'contributions':
                        return b.contributions - a.contributions;
                    case 'repositories':
                        return b.public_repos - a.public_repos;
                    case 'followers':
                        return b.followers - a.followers;
                    default:
                        return b.followers - a.followers;
                }
            });

            // Take top 5 users after filtering and sorting
            usersWithDetails = usersWithDetails.slice(0, 5);

            if (usersWithDetails.length === 0) {
                topUsersContainer.innerHTML = '<p class="text-white/60 text-center">No users found matching your criteria.</p>';
                return;
            }

            usersWithDetails.forEach(user => {
                const userCard = createUserCard(user);
                topUsersContainer.appendChild(userCard);
            });
        } catch (error) {
            console.error('Error fetching top users:', error);
            topUsersContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        } finally {
            hideLoading();
        }
    };

    // Function to create user card
    const createUserCard = (user) => {
        const card = document.createElement('div');
        card.className = 'glass-card rounded-lg p-6 hover:border-purple-500/50 transition-all duration-300 mb-4 transform hover:-translate-y-1 hover:shadow-xl';
        
        card.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex items-start space-x-4 mb-4">
                    <img src="${user.avatar_url}" alt="${user.login}" class="w-16 h-16 rounded-full ring-2 ring-purple-500/30">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold mb-1">
                            <a href="${user.html_url}" target="_blank" class="hover:text-purple-400 transition-colors flex items-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                ${user.name || user.login}
                            </a>
                        </h3>
                        <p class="text-white/60">@${user.login}</p>
                    </div>
                    <div class="flex items-start space-x-4">
                        <div class="text-center bg-white/5 rounded-lg px-3 py-2">
                            <div class="text-sm text-white/60">Contributions</div>
                            <div class="font-semibold text-purple-400">${user.contributions.toLocaleString()}</div>
                        </div>
                        <div class="text-center bg-white/5 rounded-lg px-3 py-2">
                            <div class="text-sm text-white/60">Followers</div>
                            <div class="font-semibold text-blue-400">${user.followers.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                ${user.bio ? `<p class="text-white/60 mb-4 line-clamp-2">${user.bio}</p>` : ''}
                <div class="flex flex-wrap items-center gap-4 mt-auto pt-4 border-t border-white/10">
                    ${user.languages.length > 0 ? `
                        <div class="flex items-center flex-wrap gap-2">
                            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                            </svg>
                            ${user.languages.map(lang => `<span class="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm">${lang}</span>`).join(' ')}
                        </div>
                    ` : ''}
                    ${user.location ? `
                        <div class="flex items-center text-white/60">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            ${user.location}
                        </div>
                    ` : ''}
                    <span class="text-white/60 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Joined ${new Date(user.created_at).toLocaleDateString()}
                    </span>
                </div>
            </div>
        `;

        return card;
    };

    // Update container styles
    resultsContainer.className = 'grid grid-cols-1 gap-6 mt-8 hidden';
    topUsersContainer.className = 'grid grid-cols-1 gap-6';

    // Add debouncing to search input
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query) {
                searchUsers(
                    query,
                    languageFilter.value,
                    locationFilter.value,
                    userSortFilter.value
                );
            }
        }, 500);
    });

    // Event listener for form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            searchUsers(
                query,
                languageFilter.value,
                locationFilter.value,
                userSortFilter.value
            );
        }
    });

    // Event listeners for filters
    [languageFilter, locationFilter, userSortFilter].forEach(filter => {
        filter.addEventListener('change', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchUsers(
                    query,
                    languageFilter.value,
                    locationFilter.value,
                    userSortFilter.value
                );
            } else {
                fetchTopUsers();
            }
        });
    });

    // Initial load of top users
    fetchTopUsers();
}); 