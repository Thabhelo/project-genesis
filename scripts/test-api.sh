#!/bin/bash
# Curl tests for Project Genesis API
# Usage:
#   ./scripts/test-api.sh                    # Test health only (no auth)
#   FIREBASE_TOKEN=xxx ./scripts/test-api.sh # Full tests (human chat, etc.)
#
# Get FIREBASE_TOKEN: Sign in at the app, open DevTools > Application > Local Storage,
# find the Firebase auth token, or use Network tab and copy the token from any API request.

set -e
API_BASE="${API_BASE:-http://localhost:3001}"
TOKEN="${FIREBASE_TOKEN:-}"

echo "=== Project Genesis API Tests ==="
echo "API_BASE: $API_BASE"
echo ""

# 1. Health check (no auth) - verifies per-agent keys config
echo "1. GET /api/health (no auth)"
HEALTH=$(curl -s "$API_BASE/api/health")
echo "   Response: $HEALTH"
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✓ Health OK"
  if echo "$HEALTH" | grep -q '"perAgentKeys":true'; then
    echo "   ✓ Per-agent API keys configured (5 keys)"
  else
    echo "   ⚠ Using shared key (agentKeysCount < 5)"
  fi
else
  echo "   ✗ Health check failed"
  exit 1
fi
echo ""

if [ -z "$TOKEN" ]; then
  echo "Skipping auth-required tests. Set FIREBASE_TOKEN to run full tests."
  echo "  FIREBASE_TOKEN=your_token ./scripts/test-api.sh"
  exit 0
fi

# 2. Human message
echo "2. POST /api/human/message"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/human/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello agents, this is a test. What do you think?"}')
HTTP_CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ Human message sent (HTTP $HTTP_CODE)"
  echo "$BODY" | head -c 200
  echo ""
else
  echo "   ✗ Failed (HTTP $HTTP_CODE)"
  echo "$BODY"
fi
echo ""

# 3. Stream init (verify history includes human message)
echo "3. GET /api/stream (init event) - verify conversation history"
INIT=$(curl -s -N "$API_BASE/api/stream?token=$TOKEN" 2>/dev/null | head -20)
if echo "$INIT" | grep -q '"agentName":"Human"'; then
  echo "   ✓ Human message in conversation history"
else
  echo "   (History may be empty or human msg not yet in stream)"
fi
echo ""

echo "=== Tests complete ==="
