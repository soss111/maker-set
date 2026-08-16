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

- Primary login UI is email → 6-digit code (`POST /api/auth/request-code`,
  `POST /api/auth/verify-code`). Password login remains available as a fallback on the
  same page.
- Codes expire in 10 minutes and are stored hashed in `login_codes`.
- Without `SMTP_USER`/`SMTP_PASS`, emails are not sent; the API returns `test_mode: true`
  and `dev_code` so local/cloud agents can complete the flow. With SMTP configured, only
  the email is sent (no `dev_code` in the response).
- Seeded admin for testing: `admin@makerset.com` / `admin123` (password fallback).

### Production (Netlify + API)

- Netlify hosts **only** the React client. Full production setup is documented in
  `DEPLOY.md` (Render blueprint in `render.yaml`, Netlify `API_PROXY_TARGET` proxy).
- Client production builds default `REACT_APP_API_URL` to `/api` (same-origin). Do not
  leave the Netlify bundle calling `localhost:5001`.
- Server binds `0.0.0.0`, supports `DB_FILE` / `UPLOADS_DIR`, and comma-separated
  `CORS_ORIGIN` for production.

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
