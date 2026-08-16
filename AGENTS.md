# AGENTS.md

## Cursor Cloud specific instructions

MakerSet is a single product delivered as a Node.js monorepo: an Express REST API
(`server/`) plus a React + TypeScript SPA (`client/`). The docs in `README.md`
cover the standard commands; the notes below only capture non-obvious caveats for
running/testing this repo in the cloud environment.

### Services

| Service | Dir | Start command | Port | Notes |
| --- | --- | --- | --- | --- |
| Backend API | `server/` | `npm run dev` (nodemon) | 5001 | Also runnable from root via `npm run server`. |
| Frontend SPA | `client/` | `npm start` | 3000 | Create React App. Use `BROWSER=none npm start` in headless envs. Proxies API calls to `http://localhost:5001/api`. |

From the repo root, `npm run dev` starts both together via `concurrently`.

### Database (no external service needed)

- The default `DATABASE_ENGINE` is **SQLite**; the DB file (`server/database/makerset.db`)
  and its full schema are **auto-created/migrated on server startup** by
  `server/scripts/startup.js`. There is no separate DB process to run and no manual
  `db:setup` step required for a normal dev run.
- A default admin account is seeded automatically: **`admin@makerset.com` / `admin123`**
  (see `server/database/init-sqlite-auth.sql`). New sign-ups from the UI default to the
  `customer` role.
- The DB file is git-ignored; deleting `server/database/*.db` gives a clean slate on next
  server start.

### Environment variables

- All env vars are **optional** with working defaults for local dev; the app runs with no
  `.env` file. `README.md`/`setup.sh` reference `server/.env.example`, but that file does
  **not** exist in the repo — this is expected, not a setup failure.
- Optional integrations degrade gracefully: OpenAI (`OPENAI_API_KEY`) is an optional
  translation fallback (LibreTranslate is primary, then static fallback), and email
  (`SMTP_*`) runs in log-only "test mode" when unset.

### Email 6-digit login

- Primary login UI defaults to **password** when email SMTP may be unavailable; 6-digit
  code remains available via “Use 6-digit email code instead”.
- Codes: `POST /api/auth/request-code`, `POST /api/auth/verify-code`. Password:
  `POST /api/auth/login`.
- Codes expire in 10 minutes and are stored hashed in `login_codes`.
- Without working `SMTP_USER`/`SMTP_PASS` on Render, code login returns **503**
  (`reason: smtp_not_configured`) and the UI switches to password.
- If credentials are set but Gmail rejects the message (wrong **From** / App Password),
  code login returns **503** (`reason: smtp_send_failed`). For Gmail, `SMTP_FROM` must
  match `SMTP_USER` (or a verified alias); if unset, From defaults to `SMTP_USER`.
- `GET /api/health` includes `email.smtpConfigured` (boolean only — no secrets).
- Seeded admin for testing: `admin@makerset.com` / `admin123` (password).

### Production (Netlify + API)

- Public site target: **https://www.ltcc.ee** (Netlify custom domain). See `DEPLOY.md`.
- Netlify hosts **only** the React client. API runs on Render (`render.yaml`) and is
  proxied via Netlify `API_PROXY_TARGET` so the browser uses `https://www.ltcc.ee/api`.
- Client production builds default `REACT_APP_API_URL` to `/api`.
- Server binds `0.0.0.0`, supports `DB_FILE` / `UPLOADS_DIR`, and comma-separated
  `CORS_ORIGIN` (include `https://www.ltcc.ee`).
- JWT payloads use `userId`; `authenticateToken` also sets `req.user.user_id`. Prefer
  `req.user.user_id ?? req.user.userId` in new route code.
- Provider set create: `POST /api/sets` then `POST /api/provider-sets`. Missing
  commission `part_id`s are skipped (do not hard-fail the set create).
- Provider markup (`users.provider_markup_percentage`): admin sets it in User
  Management. It must appear on login, `/users/profile`, and provider UI
  (set management / wizard / analytics). Client helper:
  `client/src/utils/providerMarkup.ts`. Default when unset is **50%** provider
  keep / **50%** system commission. `0` is a valid configured value.
- After API fixes, **redeploy Render** so Netlify previews talking to
  `makerset-api.onrender.com` pick up the change (frontend-only Netlify redeploys are not enough).
- **Render free tier has no persistent disk** — each redeploy resets SQLite. Provider
  sets disappear unless you upgrade Render and attach a disk for `DB_FILE`.

### Client dependency install caveat

- The client **must** be installed with `npm install --legacy-peer-deps`. Plain
  `npm install` fails an `ERESOLVE` conflict because the project pins `typescript@4.9.5`
  while `react-i18next@16` declares a `typescript@^5||^6` peer. CRA transpiles via Babel,
  so the app builds and runs fine on TS 4.9 despite this.
- Do **not** rely on running raw `npx tsc --noEmit` for the client: it errors while parsing
  `node_modules/react-i18next/*.d.ts` (TS 5 syntax under TS 4.9). The authoritative
  type/lint check is the one CRA runs during `npm start` / `npm run build` (it reports
  "No issues found" for errors, only ESLint warnings).

### Linting

- Client: linting is built into CRA (`react-app` ESLint config) and runs automatically on
  `npm start` / `npm run build`. There is no standalone `lint` script.
- Server: `server/.eslintrc.js` exists but `eslint` is **not** installed and there is no
  `lint` script; server code is not linted by default.

### Tests (pre-existing failures — not environment issues)

- Server tests live in `server/tests/` (`cd server/tests && npm install && npm test`) but
  are **legacy/broken** against the current SQLite codebase: the jest `setupFilesAfterEnv`
  path is wrong (`<rootDir>/tests/setup.js` vs the actual `setup.js`), several suites
  `require` non-existent Postgres-era modules (`./models/database`, `./routes/orders.js`,
  etc.), and DB-backed suites expect a Postgres connection. All suites fail regardless of
  environment. Treat them as stale unless explicitly asked to modernize them.
- Client tests: `CI=true npm test` runs. `src/tests/components.test.tsx` (placeholder)
  passes; the default CRA boilerplate `src/App.test.tsx` ("renders learn react link")
  fails because it doesn't match the real app — a pre-existing stale test.
