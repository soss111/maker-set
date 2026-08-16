# Deploy MakerSet to www.ltcc.ee

Production target:

| Piece | URL |
| --- | --- |
| **Public site** | https://www.ltcc.ee (Netlify custom domain) |
| **API** | Proxied as https://www.ltcc.ee/api → Render backend |

Netlify serves the React app. The Express + SQLite API runs on Render (or similar) and is reached through Netlify’s `/api` proxy so the browser only talks to `www.ltcc.ee`.

## 1. Deploy the API (Render)

1. [Render](https://render.com) → New → Blueprint → connect `soss111/maker-set`.
2. Apply `render.yaml` (service `makerset-api`).
3. After deploy, copy the service URL, e.g. `https://makerset-api.onrender.com`.
4. In Render → Environment, set:

| Variable | Value |
| --- | --- |
| `PUBLIC_URL` | `https://makerset-api.onrender.com` (temporary) **or** `https://www.ltcc.ee` once the Netlify `/api` proxy works |
| `CORS_ORIGIN` | `https://www.ltcc.ee,https://ltcc.ee,https://maker-set.netlify.app` |

5. Health check: `https://makerset-api.onrender.com/api/health`

**Free tier note:** Render free web services **cannot use disks**. SQLite and uploads are stored on the instance and **reset when the service redeploys**. Fine for bringing the site up; for permanent data, upgrade the plan and attach a disk at `/app/data` (then set `DB_FILE=/app/data/makerset.db` and `UPLOADS_DIR=/app/data/uploads`).

Default admin on first boot: `admin@makerset.com` / `admin123` — change immediately.

## 2. Attach www.ltcc.ee on Netlify

1. Netlify → your MakerSet site → **Domain management** → **Add domain** → `www.ltcc.ee`.
2. Also add apex `ltcc.ee` if you want redirect to `www`.
3. Netlify shows DNS records. At your domain registrar (for `ltcc.ee`), set roughly:

| Type | Name | Value |
| --- | --- | --- |
| **CNAME** | `www` | `maker-set.netlify.app` (or the hostname Netlify shows) |
| **A/ALIAS/ANAME** or Netlify DNS nameservers | `@` / apex | per Netlify’s instructions for `ltcc.ee` → redirect to `www` |

4. Wait for DNS + HTTPS certificate (Netlify provisions Let’s Encrypt automatically).

## 3. Netlify environment variables

| Variable | Value |
| --- | --- |
| `REACT_APP_API_URL` | `/api` |
| `API_PROXY_TARGET` | `https://makerset-api.onrender.com` (no trailing slash) |

Then **Deploys → Trigger deploy → Clear cache and deploy**.

The build script writes:

- `/api/*` and `/uploads/*` → your Render API  
- `/*` → SPA (`/shop`, `/login`, etc.)

## 4. Verify on the real domain

1. https://www.ltcc.ee/login  
2. Login (email code or password)  
3. Shop / parts / sets — DevTools should call `https://www.ltcc.ee/api/...`, not `localhost`

## Optional: api.ltcc.ee

If you prefer a separate API host instead of the `/api` proxy:

1. Point `api.ltcc.ee` CNAME at Render  
2. Set `REACT_APP_API_URL=https://api.ltcc.ee/api`  
3. Set Render `PUBLIC_URL=https://api.ltcc.ee` and `CORS_ORIGIN=https://www.ltcc.ee`

## Local development

Unchanged: `npm run dev` (API `:5001`, client `:3000`).
