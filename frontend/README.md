# SmartHire AI — Frontend

A presentation-ready React frontend for **SmartHire AI: AI-Powered Mock Interview and Candidate Assessment Platform**.

## Stack used

- React.js + Vite
- Tailwind CSS
- React Router
- Axios API client
- Context API for authentication state
- Framer Motion for page transitions
- Lucide React icons

These choices follow the SmartHire project document's frontend stack: React.js, Tailwind CSS, Axios, Redux / Context API, and Framer Motion. Context API is selected rather than adding Redux.

## Requirements

- Node.js 18.18+ (Node.js 20 LTS recommended)
- npm

Check:
```bash
node -v
npm -v
```

## Run locally

1. Extract this ZIP.
2. Open Terminal and move into the extracted `smarthire-frontend` directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the website:
   ```bash
   npm run dev
   ```
5. Open the URL printed by Vite, usually `http://localhost:5173`.

## Demo login

The default is **interactive demo mode** so the website can be presented without waiting for backend or AI modules.

- Email: `alex@demo.com`
- Password: `SmartHire@123`

In demo mode any email and password are accepted. Demo profile and interview records are sample data stored locally in the browser. Do not use real personal information.

## Connect the existing FastAPI backend

The frontend does not replace or modify the existing backend.

1. Copy `.env.example` to `.env`.
2. Set:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_USE_REAL_AUTH=true
   ```
3. Confirm the backend is running on port 8000.
4. Restart Vite after changing `.env`.

The Axios client is configured for `/auth/login`, `/auth/register`, `/auth/logout`, and `/users/me`. **Important:** the current backend request/response schemas must be checked against `src/context/AuthContext.jsx` before enabling real auth. The current app is shipped with real auth disabled so the demo runs independently. The refresh-token cookie/rotation contract may also need to be wired to your exact backend implementation.

## What is interactive in this presentation build?

- Landing page and navigation
- Sign-in and registration flow (demo mode)
- Candidate dashboard and sample metrics
- Resume PDF selection / drag-and-drop (local browser only; no upload API connected)
- Interview category, difficulty and question count selection
- Interview session timer, response capture and optional browser camera/microphone permission test
- Sample feedback report and downloadable text summary
- Interview history search/filter
- Sample performance analytics

## Important implementation boundary

This is a **frontend presentation build**, not a claim that the entire AI assessment pipeline is implemented. The following services are not connected in this package and are represented with clearly labelled sample/demo content:

- Resume parsing and skill extraction
- AI-generated interview questions
- Whisper speech transcription and filler-word / pace / pronunciation analysis
- OpenCV / MediaPipe / DeepFace emotion and eye-contact analysis
- AI scoring and personalised feedback
- Persistent interview history, notifications and report APIs
- OAuth2 provider login

The camera/microphone control only requests browser media permission and displays the local camera preview. It does not record, upload or analyse audio/video.

## Build for deployment

```bash
npm run build
npm run preview
```

The production bundle is created in `dist/`.

## Project structure

```text
smarthire-frontend/
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```
