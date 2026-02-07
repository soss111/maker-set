# MakerSet - Clean Code Version

MakerLab Sets Management System

## Features

- Multilingual Support (Estonian, English, Russian, Finnish)
- Set Management
- Inventory Tracking
- Receipt Management
- Modern UI with Material-UI

## Tech Stack

- **Backend:** Node.js + Express + SQLite/MySQL/PostgreSQL
- **Frontend:** React + TypeScript + Material-UI

## Quick Start

### Installation

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Configuration

1. Copy `server/.env.example` to `server/.env`
2. Configure your database settings
3. Set `DATABASE_ENGINE=sqlite` for SQLite (default)

### Run

```bash
# Development mode (runs both server and client)
npm run dev

# Or separately:
npm run server  # Backend on port 5001
npm run client  # Frontend on port 3000
```

### Database Setup

```bash
cd server
npm run db:setup
```

## Environment Variables

See `server/.env.example` for required configuration.

### Local vs production (web)

- **Local:** Defaults work. Server uses `http://localhost:PORT` for media links and CSP; client uses `http://localhost:5001/api` when `REACT_APP_API_URL` is unset.
- **Production (deployed):**
  - **Server:** In `server/.env` set `PUBLIC_URL` to your API origin (e.g. `https://api.yourdomain.com`) so media/upload URLs and CSP work. Set `CORS_ORIGIN` to your frontend origin (e.g. `https://yourdomain.com`).
  - **Client:** Build the client with `REACT_APP_API_URL` set to the same API origin (e.g. `REACT_APP_API_URL=https://api.yourdomain.com/api npm run build`). Any code using the shared `api` client (from `services/api`) will then call the correct host; replace remaining hardcoded `http://localhost:5001` fetches with the api client or `process.env.REACT_APP_API_URL` for full production support.

## License

MIT
