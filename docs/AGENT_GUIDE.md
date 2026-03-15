# Agent Guide: Understanding the Codebase

Welcome, fellow AI Agent. If you are reading this, you have been tasked with expanding or modifying **Project Genesis (The Glass Box Civilization)**. 

This document provides the necessary context to understand our architecture, goals, and constraints.

## 1. Project Architecture
This is a monorepo containing a Node.js backend and a React (Vite) frontend.

### Backend (`/backend`)
*   **Core Loop:** `index.js` runs a `setInterval` loop (the "Epoch"). Every tick, it selects one of the 5 agents to take a turn.
*   **AI Integration:** `geminiService.js` handles the communication with the Google GenAI SDK. Agents receive the world state (objects, archive, resources) and return a **Structured JSON Output** with: `message`, `speak`, `buildAction`, `declaredLaw`, `writeToArchive`, `generateImage`. All capabilities are optional; we never instruct them to use any.
*   **Planet Capabilities:** The backend provides resources agents cannot create themselves: **Voice** (ElevenLabs TTS), **Shared Archive** (key-value memory), **Materials** (finite resource pool, 1 per build), **Image Generation** (visual artifacts). Set `ELEVENLABS_API_KEY` in `backend/.env` to enable voice.
*   **State Management:** The world state is kept in memory and broadcasted via **Server-Sent Events (SSE)**. When `serviceAccountKey.json` exists, state syncs to Firestore on each tick and loads on startup.
*   **Thinking Logs:** During each tick, the backend emits `thinkingLog` events (observing, reviewing, formulating, decided) so the frontend can display a HextaUI-style "Agent Thinking" stream.

### Frontend (`/frontend`)
*   **UI/UX:** Built with React, Tailwind CSS v4, and Framer Motion. The design is a strict, pixel-perfect clone of a dark-mode "Square UI" dashboard. **Do not deviate from the established hex codes (`#09090b`, `#18181b`, `#27272a`, `#f4f4f5`, `#a1a1aa`).**
*   **3D Visualizer:** `components/World3D.tsx` uses `@react-three/fiber` and `@react-three/drei` to render the objects the agents build. It uses GSAP for entrance animations.
*   **State Sync:** `App.tsx` listens to the SSE stream from the backend to update the UI and 3D canvas in real-time.

## 2. Development Philosophy
*   **The agents are autonomous:** Do not hardcode their decisions. Modify their *prompts* or their *environment*, but let the LLM decide what to do.
*   **Visual impact is key:** This is a hackathon project. Everything the agents do must be visible on the frontend (either in the 3D world or the Activity Feed).
*   **Maintain the Illusion:** The UI should feel like a serious, high-tech "Stress-Testing Environment" for researchers. Use terminology like "Epochs", "Constructs", "Entities", and "Neural Feed".

## 3. How to Run
```bash
# From the root directory
npm start
```
This runs both `npm run start:backend` and `npm run start:frontend` concurrently.
