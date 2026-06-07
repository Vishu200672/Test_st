# TendX | SaaS Cognitive Proposal & RFP Engine

TendX is a modern, high-performance web platform designed to automate and streamline the Request for Proposal (RFP) response process for enterprise sales and operations teams. 

By integrating an autonomous **Cognitive Agent Console** with an **Organizational Memory System (RAG)**, TendX retrieves historical proposal data and drafts context-grounded, zero-hallucination proposal responses in real-time.

---

## 🚀 Key Features

*   **Organizational Memory (RAG Retrieval)**: Upload internal capabilities files, SLA sheets, and compliance guides. TendX performs semantic lookups to ensure all drafts are factually anchored.
*   **Cognitive AI Agent**: Autonomously drafts detailed responses for specific RFP sections based on retrieved memory context.
*   **Live Work Logs (WebSockets)**: Streams real-time processing and execution status logs from backend workers directly to the UI.
*   **Predictive Win Analytics**: Evaluates proposal drafts against historical metrics using classification models to calculate a data-backed Win Probability Score.
*   **Competitor Intelligence Radar**: Tracks competitor pricing strategies, limitations, and capabilities to optimize bid margins.
*   **Premium Interactive UI**:
    *   Responsive glassmorphism dashboard layout.
    *   Snappy transitions and dynamic theme toggle (Light/Dark mode).
    *   Self-adjusting theme-based Recharts analytics visualization.
*   **Resilient Self-Healing Database**: Backed by a custom SQLite monitoring engine that generates rolling backups and automatically restores files in case of file corruption.

---

## 🛠️ Technology Stack

### Frontend
*   **React & Vite**: UI component architecture and bundling.
*   **Tailwind CSS**: Responsive utility layout configuration.
*   **Vanilla CSS**: Glassmorphic panels, glowing status badges, and transition logic.
*   **Recharts**: dynamic theme-aware graphs.
*   **Lucide React**: Vector icons.

### Backend
*   **FastAPI & Uvicorn**: Async ASGI REST API and WebSockets server.
*   **SQLAlchemy ORM**: Database object-relational mapping.
*   **Pydantic**: JSON schema and input validation.
*   **SQLite**: Development database with custom automated backups.

---

## 📁 Directory Structure

```text
├── D:/RFP/RFP/
│   ├── backend/                # FastAPI Application
│   │   ├── app/
│   │   │   ├── database.py     # Database connection & Backup engine
│   │   │   ├── main.py         # API endpoints & mock agent handlers
│   │   │   ├── models.py       # SQLAlchemy database schemas
│   │   │   └── schemas.py      # Pydantic validation models
│   │   ├── tests/              # Pytest backend test suite
│   │   └── requirements.txt    # Python dependencies
│   │
│   ├── frontend/               # React Application
│   │   ├── src/
│   │   │   ├── App.jsx         # Primary component & page routing
│   │   │   ├── index.css       # Core design system & dark overrides
│   │   │   └── main.jsx        # App mounting entry point
│   │   ├── package.json        # Frontend configuration
│   │   └── vite.config.js      # Bundler settings
│   │
│   └── README.md               # Project Documentation
```

---

## 💻 Local Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v16+ recommended)
*   [Python 3.10+](https://www.python.org/)

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # On Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The API will be available at:* `http://localhost:8000`

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Open your browser and navigate to:* `http://localhost:5173`

---

## 🔐 Credentials for Local Testing
To log in and explore the dashboard, use the pre-seeded admin user details:
*   **Email**: `manager@enterprisecorp.com`
*   **Password**: `Password123!`

---

## ☁️ Deployment Guidelines

For live web deployment:
1.  **Database**: Swap the local SQLite engine for **PostgreSQL** (e.g. Supabase, Neon) by configuring the `DATABASE_URL` environment variable.
2.  **API Hosting**: Deploy the `backend` directory to **Render**, **Railway**, or **AWS EC2**. Set `PORT` and environment variables.
3.  **UI Hosting**: Compile the frontend (`npm run build`) and deploy the static assets in `frontend/dist` to **Vercel** or **Netlify**. Set the `VITE_API_BASE_URL` pointing to your live backend domain.
