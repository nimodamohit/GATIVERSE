# GATIVERSE

> **Tagline:** *"Know Your Train. Know Your Time."*

GATIVERSE is an AI-powered railway platform that provides real-time train tracking, dynamic ETA prediction, delay updates, and alternative train suggestions.

> [!NOTE]
> **Railway Data Architecture Notice:**
> Real railway data integration will be implemented in later phases. The initial architecture is built with a pluggable data provider layer to support replaceable railway data providers (such as live feeds, mock streams, or external APIs) seamlessly.

---

## 🏗 System Architecture & Technology Stack

The project is structured as a decoupled monorepo with dedicated microservices:

| Microservice | Technology | Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 15+, TypeScript, Tailwind CSS | `3000` | Web application interface |
| **Backend** | Node.js, Express.js, Socket.IO, Mongoose | `5000` | Core REST API, real-time WebSocket foundation, MongoDB config |
| **ML Service** | Python 3.11+, FastAPI, Uvicorn | `8000` | AI delay prediction & ETA engine foundation |
| **Shared** | TypeScript | N/A | Shared data contracts and types |
| **Simulator** | Python / Node.js (Phase 3) | N/A | Telemetry & railway dynamic data simulator |

---

## 📁 Monorepo Directory Structure

```
GATIVERSE/
│
├── frontend/        # Next.js frontend application
├── backend/         # Express.js REST API + Socket.IO real-time engine
├── ml-service/      # Python FastAPI microservice for AI/ML inference
├── simulator/       # Data simulator reserved for Phase 3
├── shared/          # Shared TypeScript interfaces & types
├── docs/            # Architecture & technical documentation
├── docker/          # Dockerfiles & docker-compose configuration
├── .env.example     # Environment variable template
├── .gitignore       # Git ignore rules
├── README.md        # Main project documentation
└── package.json     # Workspace management package
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` or set environment variables per service:

```env
# General Config
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Config
MONGODB_URI=mongodb://localhost:27017/smartrail_eta

# Microservices Config
ML_SERVICE_URL=http://localhost:8000
```

---

## 🚀 Getting Started & Running Services

### 1. Root Workspace Setup
Install Node dependencies:
```bash
npm install
```

### 2. Run Frontend Service
```bash
# From workspace root
npm run dev:frontend

# Or inside frontend directory
cd frontend
npm run dev
```
Access frontend at `http://localhost:3000`.

### 3. Run Backend Service
```bash
# From workspace root
npm run dev:backend

# Or inside backend directory
cd backend
npm run dev
```
Health endpoint: `GET http://localhost:5000/api/health`

### 4. Run ML Microservice
```bash
cd ml-service

# Create & activate virtual environment (optional)
python -m venv .venv
# On Windows: .\.venv\Scripts\Activate.ps1
# On Linux/macOS: source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Health endpoint: `GET http://localhost:8000/health`

---

## 🗺 Implementation Roadmap

- [x] **Phase 0: Project Foundation**
  - Monorepo directory structure setup
  - Next.js + TypeScript + Tailwind frontend foundation
  - Express.js + Socket.IO backend foundation with `/api/health`
  - Non-crashing Mongoose configuration
  - FastAPI Python ML microservice foundation with `/health`
  - Shared package, simulator placeholders, and Docker infrastructure
- [ ] **Phase 1: Core Domain Schemas & Telemetry API**
- [ ] **Phase 2: Live Tracking & Real-Time Engine**
- [ ] **Phase 3: Railway Telemetry Simulator & Ingestion**
- [ ] **Phase 4: ML Delay Prediction & Dynamic ETA Model Integration**
- [ ] **Phase 5: User Features & Railway Assistant**
