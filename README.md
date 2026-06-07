# Proposal & RFP Agent with Organizational Memory

This AI agent helps organizations generate effective proposals by remembering past successes, client preferences, and win/loss outcomes.

## Project Structure

- `backend/`: FastAPI application with SQLAlchemy and SQLite.
- `frontend/`: React application built with Vite and Tailwind CSS.

## Getting Started

### 1. Prerequisites

- Python 3.12+
- Node.js 22+

### 2. Setup & Run Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python3 -m uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. You can view the interactive documentation at `http://localhost:8000/docs`.

### 3. Setup & Run Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The UI will be available at `http://localhost:3000`.

## Key Features

- **Client Management**: Track clients across different industries and record their specific preferences.
- **Organizational Memory**: When generating a new proposal, the agent automatically retrieves "won" proposals for the same client or industry to provide proven context and recommendations.
- **Proposal Lifecycle**: Manage proposals from 'draft' to 'won' or 'lost' to build the organizational knowledge base.
