#!/usr/bin/env bash
set -euo pipefail

cd client
npm install --legacy-peer-deps
npm run build

# SPA fallback always
{
  # Optional: proxy /api/* to a hosted Express backend (no CORS needed).
  # Set API_PROXY_TARGET in Netlify env, e.g. https://makerset-api.onrender.com
  if [[ -n "${API_PROXY_TARGET:-}" ]]; then
    target="${API_PROXY_TARGET%/}"
    echo "/api/*  ${target}/api/:splat  200!"
    echo "/uploads/*  ${target}/uploads/:splat  200!"
  fi
  echo "/*    /index.html   200"
} > build/_redirects

echo "Netlify redirects written:"
cat build/_redirects
