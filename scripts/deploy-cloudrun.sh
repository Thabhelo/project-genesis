#!/bin/bash
# Deploy Project Genesis to Google Cloud Run via gcloud CLI
# Prerequisites: gcloud CLI installed and authenticated

set -e

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
REGION=${GCP_REGION:-us-central1}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Set GCP_PROJECT_ID or run 'gcloud config set project YOUR_PROJECT_ID'"
  exit 1
fi

echo "Project: $PROJECT_ID | Region: $REGION"
echo ""

# Enable APIs
echo "Enabling APIs..."
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com --project="$PROJECT_ID" --quiet

# Deploy backend
echo ""
echo "=== Building and deploying backend ==="
cd "$ROOT/backend"
gcloud builds submit --config=cloudbuild.yaml --substitutions="_REGION=$REGION" --project="$PROJECT_ID"

BACKEND_URL=$(gcloud run services describe project-genesis-backend --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")
echo "Backend URL: $BACKEND_URL"

# Ensure both services are publicly accessible (fix 403 Forbidden)
echo "Granting public access to Cloud Run services..."
gcloud run services add-iam-policy-binding project-genesis-backend --region="$REGION" --member="allUsers" --role="roles/run.invoker" --project="$PROJECT_ID" --quiet 2>/dev/null || true

# Set backend env vars (GEMINI_API_KEY or GEMINI_API_KEYS) - user must run separately if not set
if [ -n "$GEMINI_API_KEYS" ]; then
  echo "Setting GEMINI_API_KEYS (per-agent keys for rate limit relief)..."
  gcloud run services update project-genesis-backend --region "$REGION" --set-env-vars "GEMINI_API_KEYS=$GEMINI_API_KEYS" --project "$PROJECT_ID" --quiet
elif [ -n "$GEMINI_API_KEY" ]; then
  echo "Setting GEMINI_API_KEY..."
  gcloud run services update project-genesis-backend --region "$REGION" --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY" --project "$PROJECT_ID" --quiet
fi
if [ -n "$ELEVENLABS_API_KEY" ]; then
  gcloud run services update project-genesis-backend --region "$REGION" --update-env-vars "ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY" --project "$PROJECT_ID" --quiet
fi

# Deploy frontend (with backend URL and optional Firebase config baked in at build time)
echo ""
echo "=== Building and deploying frontend ==="
cd "$ROOT/frontend"
# Load Firebase config from frontend/.env if it exists (for OAuth in production)
if [ -f "$ROOT/frontend/.env" ]; then
  set -a
  source "$ROOT/frontend/.env"
  set +a
  echo "Loaded Firebase config from frontend/.env"
fi
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions="_REGION=$REGION,_BACKEND_URL=$BACKEND_URL,_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY:-},_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN:-},_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID:-},_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET:-},_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID:-},_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID:-}" \
  --project="$PROJECT_ID"

FRONTEND_URL=$(gcloud run services describe project-genesis-frontend --region "$REGION" --format 'value(status.url)' --project "$PROJECT_ID")

# Ensure frontend is publicly accessible
gcloud run services add-iam-policy-binding project-genesis-frontend --region="$REGION" --member="allUsers" --role="roles/run.invoker" --project="$PROJECT_ID" --quiet 2>/dev/null || true

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "=========================================="
echo ""
echo "To set API keys (required for agents):"
echo "  # Single key:"
echo "  export GEMINI_API_KEY=your_key"
echo "  gcloud run services update project-genesis-backend --region $REGION --set-env-vars GEMINI_API_KEY=\$GEMINI_API_KEY"
echo "  # Or per-agent keys (5x quota, avoids rate limits). Use | not comma for gcloud:"
echo "  export GEMINI_API_KEYS='key1|key2|key3|key4|key5'"
echo "  gcloud run services update project-genesis-backend --region $REGION --set-env-vars GEMINI_API_KEYS=\$GEMINI_API_KEYS"
echo ""
echo "For Firestore: Ensure the Cloud Run service account has Firestore permissions."
echo "  (Firebase project must match GCP project, or use serviceAccountKey.json as secret)"
