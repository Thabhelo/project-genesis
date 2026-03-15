# OAuth Setup (Google & GitHub)

## 1. Get Firebase config

1. Go to [Firebase Console](https://console.firebase.google.com) → **project-genesis-9fb21** → Project Settings (gear icon)
2. Under **Your apps**, find the web app or click **Add app** → Web (</>)
3. Copy the config values into `frontend/.env`:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=project-genesis-9fb21.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-genesis-9fb21
VITE_FIREBASE_STORAGE_BUCKET=project-genesis-9fb21.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=696934010342
VITE_FIREBASE_APP_ID=1:696934010342:web:...
```

## 2. Add authorized domains

Firebase Console → Authentication → Settings → **Authorized domains**

Add:
- `localhost` (for local dev)
- `project-genesis-frontend-7cu7fsp2ia-uc.a.run.app` (your Cloud Run frontend URL)

## 3. Local dev

```bash
cd frontend && npm run dev
```

Sign in with Google or GitHub should work.

## 4. Production deploy

The deploy script automatically loads `frontend/.env` when building:

```bash
./scripts/deploy-cloudrun.sh
```

Ensure `frontend/.env` has all `VITE_FIREBASE_*` values filled in before deploying.
