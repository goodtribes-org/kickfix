# Kickfix

Swedish job marketplace where users can post, find, and accept jobs. Built with React, Express, Prisma, and MongoDB.

## Features

- **User accounts** — register and log in with email/password (JWT auth)
- **Post jobs** — create job listings with title, description, price, category, and optional image upload
- **Browse & filter** — search jobs by text, category, type (online/IRL), city, and price range
- **Accept jobs** — pick up available jobs posted by other users
- **In-app chat** — message the other party on accepted jobs (polling-based)
- **Economy overview** — track income and expenses from completed jobs
- **11 categories** — Teknik, Design, Skrivande, Marknadsföring, Översättning, Hushåll, Trädgård, Flytt, Renovering, Undervisning, Övrigt

## Architecture

```
frontend/     React (CRA) — port 3000
backend/      Express + Prisma — port 5000
chart/        Helm chart for Kubernetes
```

**Frontend** (`frontend/`) — React SPA with React Router. Pages: Home, Login, CreateJob, FindJob, Profile, ChatPage. Shared components: JobCard, Navbar. Auth state via React Context with JWT tokens stored in localStorage.

**Backend** (`backend/`) — Express REST API with 15 endpoints across 4 route groups. Prisma ORM on MongoDB. Multer for image uploads. JWT authentication middleware.

**Database** — MongoDB with replica set (required by Prisma). Four models: User, Job, Message, Transaction.

### API endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /register`, `POST /login`, `POST /logout`, `GET /me` |
| Jobs | `GET /`, `POST /`, `GET /:id`, `GET /user/my-jobs`, `GET /user/accepted-jobs`, `PUT /:id/accept`, `PUT /:id/complete`, `DELETE /:id` |
| Messages | `GET /:jobId`, `POST /:jobId` |
| Payments | `GET /history` |

All endpoints are prefixed with `/api` (e.g. `/api/auth/login`).

### Data models

- **User** — email, password (bcrypt hashed)
- **Job** — title, description, price, category, type (online/irl), status (open/accepted/completed), optional image and location fields, relations to creator and acceptor
- **Message** — content, sender, job reference
- **Transaction** — amount, type (income/expense), user and job references. Created automatically when a job is marked complete.

## Local development

### With Docker (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3003
- Backend API: http://localhost:5000/api
- MongoDB: localhost:27017

### Without Docker

Requires a MongoDB replica set on `localhost:27017`.

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npm start

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

## Environment variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string (must include `replicaSet` param) | `mongodb://localhost:27017/workapp?replicaSet=rs0&directConnection=true` |
| `JWT_SECRET` | Secret for signing JWT tokens | `workapp_secret_key_2024` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `PORT` | Server port | `5000` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:5000/api` |

## Production deployment

### CI/CD

Two GitHub Actions workflows in `.github/workflows/`:

1. **Docker Image Publish** (`docker-build.yml`) — triggers on push to `main` or version tags (`v*`). Builds `frontend` and `backend` images in parallel and pushes to `ghcr.io`.
2. **Deploy To Production** (`deploy.yaml`) — triggers after image publish completes. Renders Helm templates with the commit SHA as image tag and commits the generated manifests to the `viodlar/manifest` repo (GitOps pattern). A cluster-side controller picks up the changes.

Images: `ghcr.io/viodlar/kickfix/frontend:<sha>` and `ghcr.io/viodlar/kickfix/backend:<sha>`

### Helm chart

```bash
helm lint chart/kickfix
helm template kickfix chart/kickfix
helm install kickfix chart/kickfix --set backend.env.JWT_SECRET="your-secret"
```

### Ingress routing

| Domain | Routes to |
|--------|-----------|
| `www.kickfix.se`, `kickfix.se` | Frontend |
| `api.kickfix.se` | Backend (`/api/*`, `/uploads/*`) |

Two separate Ingress resources (frontend + backend) using Traefik ingress controller. TLS via cert-manager with `http` cluster issuer (HTTP-01 challenge). Each ingress gets its own TLS secret.

### Infrastructure

- MongoDB StatefulSet with replica set initialization via lifecycle hook
- Backend uploads persisted on a 1Gi PVC mounted at `/app/uploads`
- MongoDB data on a 5Gi PVC
- Traefik ingress controller
