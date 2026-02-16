# Kickfix

Swedish job marketplace with React frontend and Express/Prisma backend on MongoDB.

## Architecture

- **Frontend**: React (CRA) at `frontend/` — served on port 3000
- **Backend**: Express + Prisma (MongoDB) at `backend/` — served on port 5000
- **Database**: MongoDB (via Prisma ORM with `mongodb` provider, requires replica set)

### Key directories

```
frontend/src/pages/       # Page components (Home, Login, CreateJob, FindJob, Profile, ChatPage)
frontend/src/components/  # Shared components (JobCard, Navbar)
frontend/src/context/     # AuthContext for JWT-based auth
frontend/src/utils/       # apiFetch helper (auto-attaches JWT, handles FormData)
backend/index.js          # Express server entry point
backend/routes/           # Express route handlers (auth, jobs, messages, payments)
backend/middleware/        # JWT auth middleware (auth.js), multer upload config (upload.js)
backend/prisma/           # Prisma schema (User, Job, Message, Transaction models)
backend/lib/              # Prisma client singleton
backend/uploads/          # User-uploaded images (gitignored)
chart/kickfix/            # Helm chart for Kubernetes deployment
.github/workflows/        # CI/CD (docker-build.yml + deploy.yaml)
```

### API structure

All routes are mounted under `/api`:
- `/api/auth` — register, login, logout, get current user
- `/api/jobs` — CRUD, accept, complete, user's jobs, filtering
- `/api/messages` — get/send messages per job
- `/api/payments` — payment history (income/expenses)

Static uploads served at `/uploads/<filename>`.

CORS supports comma-separated origins in `FRONTEND_URL` env var.

## Local development

### Without Docker

```bash
# Backend
cd backend
cp .env.example .env      # Edit as needed
npm install
npx prisma generate
npm start                  # Runs on :5000

# Frontend
cd frontend
npm install
npm start                  # Runs on :3000
```

Requires a MongoDB replica set at `mongodb://localhost:27017/workapp?replicaSet=rs0&directConnection=true`.

### With Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3003
- Backend API: http://localhost:5000/api
- MongoDB: localhost:27017 (auto-configured as replica set)

## Prisma commands

Run from `backend/`:

```bash
npx prisma generate        # Regenerate client after schema changes
npx prisma studio          # Open Prisma Studio GUI
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MongoDB connection string (must include replicaSet param) | `mongodb://localhost:27017/workapp?replicaSet=rs0&directConnection=true` |
| `JWT_SECRET` | Secret for signing JWT tokens | `workapp_secret_key_2024` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated for multiple) | `http://localhost:3000` |
| `PORT` | Backend server port | `5000` |
| `REACT_APP_API_URL` | Frontend API base URL | `http://localhost:5000/api` |

## CI/CD

Two GitHub Actions workflows:

1. **Docker Image Publish** (`.github/workflows/docker-build.yml`):
   - Triggers on push to `main` and version tags (`v*`)
   - Builds `frontend` and `backend` images in parallel (matrix strategy)
   - Pushes to `ghcr.io/viodlar/kickfix/{frontend,backend}:<commit-sha>`
   - Runs on `arc-runner-set-viodlar`

2. **Deploy To Production** (`.github/workflows/deploy.yaml`):
   - Triggers after Docker Image Publish completes
   - Renders Helm templates with commit SHA image tags
   - Commits generated manifests to `viodlar/manifest` repo (GitOps)
   - Sends Slack notification

## Helm deployment

```bash
# Lint
helm lint chart/kickfix

# Template preview
helm template kickfix chart/kickfix

# Install
helm install kickfix chart/kickfix \
  --set backend.env.JWT_SECRET="your-secret" \
  --set frontend.image.tag=main \
  --set backend.image.tag=main
```

### Ingress routing

| Domain | Routes to |
|--------|-----------|
| `www.kickfix.se`, `kickfix.se` | Frontend (all paths) |
| `api.kickfix.se` | Backend (`/api/*`, `/uploads/*`) |

TLS via cert-manager with `letsencrypt-prod` cluster issuer. All three domains share one TLS certificate.

### Production environment

- Frontend `REACT_APP_API_URL`: `https://api.kickfix.se/api`
- Backend `FRONTEND_URL`: `https://www.kickfix.se,https://kickfix.se`
- MongoDB runs as a StatefulSet with replica set (postStart lifecycle hook initializes it)
- Uploads persisted on a 1Gi PVC, MongoDB data on a 5Gi PVC
