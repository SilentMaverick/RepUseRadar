// GitHub API Configuration
const config = {
    // You can add your GitHub token here (Be careful not to commit sensitive tokens)
    // For development, you can use localStorage: localStorage.getItem('github_token')
    getToken: () => localStorage.getItem('github_token'),
    
    // API endpoints
    endpoints: {
        base: 'https://api.github.com',
        search: {
            repositories: '/search/repositories',
            users: '/search/users'
        },
        user: '/users'
    },

    // API request headers
    getHeaders: () => {
        const headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        const token = config.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // Rate limit handling
    async checkRateLimit(response) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const token = config.getToken();
        
        if (!token) {
            throw new Error('Please add a GitHub token to access the API. Click on "GitHub Explorer" to return to the main page and add your token.');
        }
        
        if (remaining === '0') {
            const resetDate = new Date(resetTime * 1000);
            const minutes = Math.ceil((resetDate - new Date()) / (1000 * 60));
            throw new Error(`API rate limit exceeded. Resets in ${minutes} minutes. Please try again later.`);
        }
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('github_token'); // Clear invalid token
                throw new Error('Invalid GitHub token. Please add a valid token.');
            } else if (response.status === 403) {
                throw new Error('API rate limit exceeded. Please try again later or check your token permissions.');
            } else {
                throw new Error('Failed to fetch data from GitHub API. Please try again.');
            }
        }
        
        return response;
    }
};

// Export the config object
window.githubConfig = config; 