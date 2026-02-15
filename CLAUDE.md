# Kickfix

Swedish job marketplace with React frontend and Express/Prisma backend on MongoDB.

## Architecture

- **Frontend**: React (CRA) at `frontend/` — served on port 3000
- **Backend**: Express + Prisma (MongoDB) at `backend/` — served on port 5000
- **Database**: MongoDB (via Prisma ORM with `mongodb` provider)

### Key directories

```
frontend/src/pages/       # Page components (Home, Login, CreateJob, FindJob, Profile, ChatPage)
frontend/src/components/  # Shared components (JobCard, Navbar)
frontend/src/context/     # AuthContext for JWT-based auth
backend/routes/           # Express route handlers (auth, jobs, messages, payments)
backend/middleware/        # JWT auth middleware, multer upload config
backend/prisma/           # Prisma schema
backend/lib/              # Prisma client singleton
backend/uploads/          # User-uploaded images (gitignored)
chart/kickfix/            # Helm chart for Kubernetes deployment
```

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

Requires a local MongoDB instance at `mongodb://localhost:27017/workapp`.

### With Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: localhost:27017

## Prisma commands

Run from `backend/`:

```bash
npx prisma generate        # Regenerate client after schema changes
npx prisma studio          # Open Prisma Studio GUI
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | MongoDB connection string | `mongodb://localhost:27017/workapp` |
| `JWT_SECRET` | Secret for signing JWT tokens | `workapp_secret_key_2024` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `PORT` | Backend server port | `5000` |
| `REACT_APP_API_URL` | Frontend API base URL | `http://localhost:5000/api` |

## CI/CD

GitHub Actions workflow at `.github/workflows/docker-build.yml`:
- Triggers on push to `main` and version tags (`v*`)
- Builds and pushes `frontend` and `backend` images to `ghcr.io`

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

Ingress routes `www.kickfix.se` and `kickfix.se`:
- `/api` and `/uploads` → backend service
- `/` → frontend service
- TLS via cert-manager with `letsencrypt-prod` cluster issuer
