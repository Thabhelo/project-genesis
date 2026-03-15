# Deployment

## Automatic deploy (GitHub Actions)

Pushes to `main` trigger a deploy to Google Cloud Run.

### One-time setup

1. **Create a GCP service account** with these roles:
   - Cloud Build Editor
   - Cloud Run Admin
   - Service Account User
   - Storage Admin (for Container Registry)

2. **Create and download a JSON key** for that service account.

3. **Add GitHub repository secrets** (Settings → Secrets and variables → Actions):
   Use these exact names (letters, numbers, underscores only—no spaces or hyphens):
   - `GCP_PROJECT_ID` – your GCP project ID (e.g. `project-genesis-9fb21`)
   - `GCP_SA_KEY` – full contents of the service account JSON key file

4. **Optional – Firebase (for OAuth in production):**
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   Copy these from `frontend/.env` if you use Firebase Auth.

### After setup

Push to `main` to deploy. Check the **Actions** tab for status.

---

## Manual deploy

```bash
./scripts/deploy-cloudrun.sh
```

Requires `gcloud` CLI and `frontend/.env` for Firebase config.
