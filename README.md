# NyumbaSmart

NyumbaSmart is a rental management web app built with React + Vite + Appwrite.  
Current scope includes auth, role-based dashboards, listings, applications, messaging, notifications, and baseline production/security tooling.
Listing is currently free for landlords (no payment gateway enforced).

## Tech Stack
- React 19 + Vite
- Appwrite (Auth, Databases, Storage, Realtime)
- Zustand + React Query
- Vitest + Testing Library
- Playwright (smoke E2E)

## Prerequisites
- Node.js 20+
- npm 10+
- Appwrite project, database, and API key (for provisioning scripts)

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Create local env file:
```bash
cp .env.example .env
```
3. Fill `.env` values.
4. Provision Appwrite schema/buckets:
```bash
npm run appwrite:provision
npm run appwrite:permissions
```
5. Run the app:
```bash
npm run dev
```

## Quality Gates
- Lint: `npm run lint`
- Unit + integration tests: `npm run test`
- Smoke E2E: `npm run test:smoke`
- Production build: `npm run build`
- Release verification (full gate): `npm run verify:release`

## Environment Documentation
- Main template: `.env.example`
- Production frontend template: `.env.production.example`
- Detailed variable guide: `docs/ENVIRONMENT.md`
- Feature activation runbook: `docs/FEATURE_ACTIVATION.md`

## Deployment
- Deployment guide: `docs/DEPLOYMENT.md`
- Docker + Nginx artifacts included:
  - `Dockerfile`
  - `nginx.conf`
  - `.dockerignore`
- GitHub Actions workflows:
  - `.github/workflows/ci.yml`
  - `.github/workflows/release-artifact.yml`

## Flutter Mobile Starter
- A Flutter starter client is included at `mobile/nyumbasmart_flutter`.
- It uses the same Appwrite backend and schema (including buy/rent intent and Uganda land filters).
- Setup guide: `mobile/nyumbasmart_flutter/README.md`.

## Appwrite Functions Source
- Function source folders are in `appwrite/functions/`.
- Manual deployment instructions are in `appwrite/functions/README.md`.
- Frontend function execution is controlled by `VITE_ENABLE_APPWRITE_FUNCTIONS`.

## Release Checklist
See `docs/RELEASE_CHECKLIST.md` before shipping.
