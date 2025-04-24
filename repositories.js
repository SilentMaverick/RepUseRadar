document.addEventListener('DOMContentLoaded', () => {
    // Initialize meteors effect if available
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
    const savedReposContainer = document.getElementById('savedReposContainer');
    const noSavedRepos = document.getElementById('noSavedRepos');

    // Initialize saved repositories from localStorage
    let savedRepos = JSON.parse(localStorage.getItem('savedRepos') || '[]');

    // Language colors mapping
    const languageColors = {
        JavaScript: '#f1e05a',
        TypeScript: '#2b7489',
        Python: '#3572A5',
        Java: '#b07219',
        'C++': '#f34b7d',
        C: '#555555',
        Go: '#00ADD8',
        Rust: '#dea584',
        Ruby: '#701516',
        PHP: '#4F5D95',
        Swift: '#ffac45',
        Kotlin: '#F18E33',
        Dart: '#00B4AB',
        HTML: '#e34c26',
        CSS: '#563d7c',
        Shell: '#89e051'
    };

    // Function to get language color
    function getLanguageColor(language) {
        return languageColors[language] || '#858585';
    }

    // Function to save repository
    function saveRepository(repo) {
        if (!isRepositorySaved(repo)) {
            savedRepos.push(repo);
            localStorage.setItem('savedRepos', JSON.stringify(savedRepos));
            updateSavedRepositoriesDisplay();
            showNotification('Repository saved successfully!');
            return true;
        }
        return false;
    }

    // Function to remove saved repository
    function removeSavedRepository(repo) {
        savedRepos = savedRepos.filter(savedRepo => savedRepo.id !== repo.id);
        localStorage.setItem('savedRepos', JSON.stringify(savedRepos));
        updateSavedRepositoriesDisplay();
        // Update save button state in search results
        const searchResultButton = document.querySelector(`[data-repo-id="${repo.id}"]`);
        if (searchResultButton) {
            searchResultButton.classList.remove('saved');
            searchResultButton.innerHTML = '<i class="far fa-star"></i>';
        }
    }

    // Function to check if repository is saved
    function isRepositorySaved(repo) {
        return savedRepos.some(savedRepo => savedRepo.id === repo.id);
    }

    // Function to show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // Function to create repository card
    function createRepositoryCard(repo, isSavedSection = false) {
        const card = document.createElement('div');
        card.className = 'glass-card p-6 rounded-lg shadow-lg relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl';
        
        const isRepoSaved = isRepositorySaved(repo);
        const saveButtonClass = isRepoSaved ? 'saved' : '';
        const saveButtonIcon = isRepoSaved ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-semibold mb-2">
                        <a href="${repo.html_url}" target="_blank" class="text-blue-400 hover:text-blue-300">
                            ${repo.name}
                        </a>
                    </h3>
                    <p class="text-white/60 text-sm mb-2">${repo.description || 'No description available'}</p>
                </div>
                <button class="${isSavedSection ? 'crazy-button text-red-400' : `save-button ${saveButtonClass} crazy-button`}" 
                        data-repo-id="${repo.id}">
                    ${isSavedSection ? '<i class="fas fa-times"></i>' : saveButtonIcon}
                </button>
            </div>
            <div class="flex items-center space-x-4 text-sm text-white/60">
                <span><i class="fas fa-star mr-1"></i>${repo.stargazers_count.toLocaleString()}</span>
                <span><i class="fas fa-code-branch mr-1"></i>${repo.forks_count.toLocaleString()}</span>
                ${repo.language ? `<span><i class="fas fa-circle mr-1" style="color: ${getLanguageColor(repo.language)}"></i>${repo.language}</span>` : ''}
            </div>
        `;

        // Add click event listener to the button
        const button = card.querySelector('button');
        button.addEventListener('click', () => {
            if (isSavedSection) {
                removeSavedRepository(repo);
            } else {
                if (isRepositorySaved(repo)) {
                    removeSavedRepository(repo);
                    button.classList.remove('saved');
                    button.innerHTML = '<i class="far fa-star"></i>';
                } else {
                    if (saveRepository(repo)) {
                        button.classList.add('saved');
                        button.innerHTML = '<i class="fas fa-star"></i>';
                    }
                }
            }
        });

        return card;
    }

    // Function to update saved repositories display
    function updateSavedRepositoriesDisplay() {
        if (!savedReposContainer || !noSavedRepos) return;
        
        if (savedRepos.length === 0) {
            savedReposContainer.innerHTML = '';
            noSavedRepos.classList.remove('hidden');
            return;
        }

        noSavedRepos.classList.add('hidden');
        savedReposContainer.innerHTML = '';
        savedRepos.forEach(repo => {
            const card = createRepositoryCard(repo, true);
            savedReposContainer.appendChild(card);
        });
    }

    // Function to show loading spinner
    function showLoading() {
        if (loadingSpinner) {
            loadingSpinner.classList.remove('hidden');
        }
    }

    // Function to hide loading spinner
    function hideLoading() {
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
    }

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
    async function searchRepositories(query, language, sort) {
        showLoading();
        try {
            if (trendingSection) {
                trendingSection.classList.add('hidden');
            }
            
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

            if (resultsContainer) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.remove('hidden');

                if (!data.items || data.items.length === 0) {
                    resultsContainer.innerHTML = '<p class="text-white/60 text-center">No repositories found matching your criteria.</p>';
                    return;
                }

                data.items.forEach(repo => {
                    const card = createRepositoryCard(repo);
                    resultsContainer.appendChild(card);
                });

                resultsContainer.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error searching repositories:', error);
            if (resultsContainer) {
                resultsContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
            }
        } finally {
            hideLoading();
        }
    }

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
                const card = createRepositoryCard(repo);
                trendingReposContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching trending repositories:', error);
            trendingReposContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        } finally {
            hideLoading();
        }
    };

    // Add event listener for clear all button
    const clearSavedButton = document.getElementById('clearSaved');
    if (clearSavedButton) {
        clearSavedButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all saved repositories?')) {
                savedRepos = [];
                localStorage.setItem('savedRepos', JSON.stringify(savedRepos));
                updateSavedRepositoriesDisplay();
                showNotification('All saved repositories cleared!');
            }
        });
    }

    // Add debouncing to search input
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query) {
                    searchRepositories(query, languageFilter?.value, sortFilter?.value);
                }
            }, 500);
        });
    }

    // Event listener for form submission
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput?.value.trim();
            if (query) {
                searchRepositories(query, languageFilter?.value, sortFilter?.value);
            }
        });
    }

    // Event listeners for filters
    [languageFilter, sortFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                const query = searchInput?.value.trim();
                if (query) {
                    searchRepositories(query, languageFilter?.value, sortFilter?.value);
                }
            });
        }
    });

    // Initial load of trending repositories
    fetchTrendingRepositories();

    // Initial display of saved repositories
    updateSavedRepositoriesDisplay();

    // Add styles for save button
    const style = document.createElement('style');
    style.textContent = `
        .save-button {
            color: rgba(255, 255, 255, 0.6);
            transition: color 0.3s;
        }
        .save-button:hover {
            color: #FCD34D;
        }
        .save-button.saved {
            color: #FCD34D;
        }
    `;
    document.head.appendChild(style);

    // Add styles for the meteor shower
    const meteorStyle = document.createElement('style');
    meteorStyle.textContent = `
        .meteor {
            position: fixed;
            width: 2px;
            height: 2px;
            background: white;
            opacity: 0;
            transform: rotate(-45deg);
            animation: meteor 5s linear infinite;
            filter: blur(1px);
        }

        @keyframes meteor {
            0% {
                transform: translateX(0) translateY(0) rotate(-45deg);
                opacity: 1;
            }
            70% {
                opacity: 1;
            }
            100% {
                transform: translateX(-100vw) translateY(100vh) rotate(-45deg);
                opacity: 0;
            }
        }

        .crazy-button {
            position: relative;
            padding: 0.5rem 1rem;
            font-weight: 600;
            border: 2px solid transparent;
            border-radius: 8px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            color: white;
            transition: all 0.3s ease;
            overflow: hidden;
            z-index: 1;
        }

        .crazy-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 200%;
            height: 100%;
            background: linear-gradient(115deg, 
                transparent 0%, 
                transparent 25%,
                rgba(255, 255, 255, 0.2) 25%,
                rgba(255, 255, 255, 0.2) 50%,
                transparent 50%,
                transparent 75%,
                rgba(255, 255, 255, 0.2) 75%,
                rgba(255, 255, 255, 0.2) 100%
            );
            background-size: 400% 100%;
            animation: shine 3s linear infinite;
            z-index: -1;
        }

        .crazy-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        @keyframes shine {
            0% {
                background-position: 200% 0;
            }
            100% {
                background-position: -200% 0;
            }
        }

        .saved-section {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 2rem;
            margin-bottom: 2rem;
        }
    `;
    document.head.appendChild(meteorStyle);

    // Function to create meteors
    function createMeteor() {
        const meteor = document.createElement('div');
        meteor.className = 'meteor';
        meteor.style.left = `${Math.random() * window.innerWidth}px`;
        meteor.style.top = '0px';
        const meteorsContainer = document.getElementById('meteorsContainer');
        if (meteorsContainer) {
            meteorsContainer.appendChild(meteor);
            setTimeout(() => {
                if (meteor && meteor.parentNode) {
                    meteor.parentNode.removeChild(meteor);
                }
            }, 5000);
        }
    }

    // Create meteors periodically
    const createMeteors = () => {
        if (document.getElementById('meteorsContainer')) {
            createMeteor();
        }
    };
    setInterval(createMeteors, 500);
}); 