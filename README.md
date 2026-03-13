# Project Genesis (The Tabula Rasa)

A self-evolving AI civilization simulator where Gemini-powered agents live, build, and govern in a shared 3D space.

Built for the Gemini Live Agent Challenge, this project explores what happens when you give multiple AI agents a "Blank Slate"—zero instructions other than their base personas, the ability to communicate, and the power to procedurally generate 3D objects in their world.

## Features
- **Agentic Governance:** 5 distinct Gemini agents (The Architect, The Diplomat, The Rebel, The Merchant, The Philosopher) share a context window and debate the future of their society.
- **Procedural World Building:** Agents output structured JSON to spawn 3D objects (boxes, spheres, cylinders) directly into the environment based on their decisions.
- **Real-Time 3D Visualizer:** A React Three Fiber frontend that renders the agents' creations and displays a live feed of their dialogue.
- **Tabula Rasa:** No pre-programmed rules. Watch as they naturally develop (or fail to develop) order, currency, or a constitution.

## Tech Stack
- **Backend:** Node.js, Express, Google GenAI SDK (`gemini-2.5-flash`)
- **Frontend:** React, Vite, Tailwind CSS, React Three Fiber (Three.js)
- **Database:** In-memory mock database (with Firebase Admin SDK ready for production)

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
Create a `.env` file in the `backend` directory and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
```

### 4. Run the Simulation
From the root directory, run:
```bash
npm start
```
This will concurrently start the Node.js backend and the Vite frontend server.

Open your browser to `http://localhost:5173` (or the port Vite provides) and click **"Start Simulation"** to watch the agents wake up and begin building their world!
