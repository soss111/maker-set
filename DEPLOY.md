# Deploy MakerSet (Netlify frontend + Render API)

MakerSet needs **two** hosts:

1. **Frontend** — Netlify (already: https://maker-set.netlify.app)
2. **Backend API** — any Node host (Render blueprint included as `render.yaml`)

Netlify alone cannot run the Express + SQLite API.

## 1. Deploy the API (Render)

1. Go to [Render](https://render.com) → New → Blueprint → connect `soss111/maker-set`.
2. Apply `render.yaml` (service `makerset-api` + persistent disk).
3. After deploy, copy the service URL, e.g. `https://makerset-api.onrender.com`.
4. In Render → Environment, set:
   - `PUBLIC_URL=https://makerset-api.onrender.com`
   - `CORS_ORIGIN=https://maker-set.netlify.app`
5. Confirm health: `https://makerset-api.onrender.com/api/health`

Default admin (first boot): `admin@makerset.com` / `admin123` — change immediately.

## 2. Point Netlify at the API

In Netlify → Site settings → Environment variables:

| Variable | Value |
| --- | --- |
| `REACT_APP_API_URL` | `/api` |
| `API_PROXY_TARGET` | `https://makerset-api.onrender.com` (no trailing slash) |

Then **Trigger deploy** (clear cache + deploy site).

The build script (`scripts/netlify-build.sh`) writes redirects so:

- `/api/*` and `/uploads/*` proxy to your API
- `/*` serves the SPA (`/shop`, `/login`, etc. no longer 404)

## 3. Verify

1. https://maker-set.netlify.app/login
2. Email code or password login
3. Shop / parts / sets load without browser calls to `localhost:5001`

## Local development

Unchanged: `npm run dev` (API `:5001`, client `:3000`). Production defaults to `/api` only in production builds.
