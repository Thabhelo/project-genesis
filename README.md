# Project Genesis (The Tabula Rasa)

A self-evolving AI civilization simulator where Gemini-powered agents live, build, and govern in a shared 3D space.

Built for the Gemini Live Agent Challenge, this project explores what happens when you give multiple AI agents a "Blank Slate"—zero instructions other than their base personas, the ability to communicate, and the power to procedurally generate 3D objects in their world.

## Features
- **Agentic Governance:** 5 distinct Gemini agents (The Architect, The Diplomat, The Critique, The Merchant, The Philosopher) share a context window and debate the future of their society.
- **Procedural World Building:** Agents output structured JSON to spawn 3D objects (boxes, spheres, cylinders) directly into the environment based on their decisions.
- **Real-Time 3D Visualizer:** A React Three Fiber frontend that renders the agents' creations and displays a live feed of their dialogue.
- **Tabula Rasa:** No pre-programmed rules. Watch as they naturally develop (or fail to develop) order, currency, or a constitution.

## Why This Matters: AI Policy & Alignment Testing
In the current AI revolution, understanding emergent behaviors in multi-agent systems is critical for **AI Safety, Alignment, and Policy Formulation**. Project Genesis serves as a sandbox for researchers, ethicists, and policymakers to observe how autonomous agents negotiate, allocate resources, and establish governance without human intervention.

By maintaining a clear, immutable log of every societal decision, rule, and constitutional amendment, this simulation provides a transparent ledger of AI societal evolution. This approach aligns with leading research in the field, such as:
- **Stanford University & Google Research (Park et al., 2023):** Demonstrated in *"Generative Agents: Interactive Simulacra of Human Behavior"* that LLM-backed agents can simulate believable societal dynamics.
- **OpenAI's Multi-Agent Research:** Highlights the necessity of observing emergent cooperation and competition to ensure safe AGI deployment.
- **AI Policy Sandboxing:** Provides a safe, isolated environment to stress-test economic and legal frameworks before applying them to real-world AI systems or autonomous economies.

## Tech Stack
- **Backend:** Node.js, Express, Google GenAI SDK (`gemini-2.5-flash`)
- **Frontend:** React, Vite, Tailwind CSS, React Three Fiber (Three.js)
- **Database:** Firestore (with in-memory fallback when `serviceAccountKey.json` is absent)

## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### 2. Installation
Install dependencies for both the backend and frontend:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Configuration
Create a `.env` file in the `backend` directory (see `backend/.env.example`):
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
# Optional: Enable voice (agents may choose to speak their messages)
ELEVENLABS_API_KEY=your_elevenlabs_key
```

The frontend needs no env vars for local development. For production, set `VITE_API_URL` in `frontend/.env` to your deployed backend URL.

### 4. Run the Simulation
From the root directory, run:
```bash
npm start
```
This will concurrently start the Node.js backend and the Vite frontend server.

Open your browser to `http://localhost:5173` (or the port Vite provides) and click **"Start Simulation"** to watch the agents wake up and begin building their world!

### 5. Firestore (Persistence Across Restarts)
To persist simulation state across server restarts:

1. Create a [Firebase project](https://console.firebase.google.com/) (or use an existing one).
2. Enable **Firestore Database** (Create database → Start in production/test mode).
3. Go to **Project Settings** (gear icon) → **Service Accounts** → **Generate New Private Key**.
4. Save the downloaded JSON as `backend/serviceAccountKey.json`.
5. Restart the backend. You should see: `Firestore persistence enabled.`

The backend loads and saves state **per user** (keyed by Firebase UID). Each signed-in user has their own simulation world that persists across sessions.

## Deployment

### Automatic deploy (GitHub Actions)
Pushes to `main` automatically deploy to Cloud Run. One-time setup: add `GCP_PROJECT_ID` and `GCP_SA_KEY` as GitHub repository secrets. See [docs/DEPLOY.md](docs/DEPLOY.md) for details.

### Manual deploy (Google Cloud Run)
Deploy both frontend and backend to Cloud Run via gcloud CLI:

```bash
# Prerequisites: gcloud CLI, authenticated (gcloud auth login)
gcloud config set project YOUR_PROJECT_ID

# Deploy (set GEMINI_API_KEY first for agents to work)
export GEMINI_API_KEY=your_gemini_key
./scripts/deploy-cloudrun.sh
```

The script deploys the backend first, then the frontend (with the backend URL baked in). Firestore works via Application Default Credentials when the Firebase project matches your GCP project—ensure the Cloud Run service account has Firestore permissions.

To set secrets after deployment:
```bash
gcloud run services update project-genesis-backend --region us-central1 \
  --set-env-vars GEMINI_API_KEY=your_key
```

### Google OAuth (optional)
To enable "Sign in with Google" for the human user:
1. Firebase Console → Authentication → Sign-in method → Enable **Google**
2. Add your Cloud Run frontend URL to **Authorized domains** (e.g. `project-genesis-frontend-xxx.run.app`)
3. Add `frontend/.env` with `VITE_FIREBASE_*` (from Project Settings → General)
4. For Cloud Run: export `VITE_FIREBASE_*` before `./scripts/deploy-cloudrun.sh`

### Alternative: Vercel (frontend) + Railway/Render (backend)
- **Frontend:** `cd frontend && vercel --prod` — set `VITE_API_URL` in Vercel env vars
- **Backend:** Deploy `backend` folder to Railway or Render
