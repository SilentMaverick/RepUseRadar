# GitHub Search Enhanced

A modern web application that enhances GitHub repository search with advanced filtering and sorting capabilities.

## Features

- Search GitHub repositories with real-time results
- Advanced filtering options (stars, forks, language)
- Custom sorting capabilities
- Modern, responsive UI with dark mode support
- Fast and efficient API with caching

## Tech Stack

- Frontend:
  - React with TypeScript
  - Tailwind CSS for styling
  - React Query for data fetching
  - Heroicons for icons
- Backend:
  - FastAPI (Python)
  - GitHub API integration
  - CORS support
  - Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- Python 3.7 or higher
- GitHub Personal Access Token

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd github-search-enhanced
```

2. Frontend setup:
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

3. Backend setup:
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn python-dotenv httpx

# Configure environment variables
cp .env.example .env
# Edit .env and add your GitHub token
```

4. Start the backend server:
```bash
# From the backend directory
python app.py
```

## Development

The frontend will be available at http://localhost:5173
The backend API will be available at http://localhost:8000

## Environment Variables

Create a `.env` file in the backend directory with the following:

```
GITHUB_TOKEN=your_github_personal_access_token
```

## API Endpoints

- `GET /api/search` - Search repositories
  - Query parameters:
    - `q`: Search query
    - `sort`: Sort field (stars, forks, updated)
    - `order`: Sort order (asc, desc)
    - `per_page`: Results per page (max 100)
    - `page`: Page number

- `GET /api/user/{username}` - Get user details

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 