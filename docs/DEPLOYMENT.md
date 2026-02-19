# Deployment Guide

## 1) Pre-Deploy Checks
Run locally or in CI:
```bash
npm ci
npm run lint
npm run test
npm run build
npm run test:smoke
```

## 2) Build
```bash
npm run build:prod
```
Output is generated in `dist/`.

## 3) Deploy Options

### Option A: Static Hosting (Recommended)
Deploy the `dist/` folder to a static host (Netlify, Vercel static output, Cloudflare Pages, S3+CloudFront, etc.).

Requirements:
- Configure SPA fallback to `index.html`.
- Inject production `VITE_*` values at build time.

### Option B: Docker + Nginx
Build:
```bash
docker build -t nyumba-smart:latest .
```
Run:
```bash
docker run --rm -p 8080:80 nyumba-smart:latest
```
Health check:
```bash
curl -I http://localhost:8080/
```

## 4) CI Setup
This repository includes `.github/workflows/ci.yml` with:
- dependency install
- lint
- tests (unit/integration)
- production build
- Playwright smoke test

For release packaging, `.github/workflows/release-artifact.yml` builds `dist/` and uploads it as a downloadable artifact on tag pushes (`v*`) or manual runs.

## 5) Appwrite Production Setup
Before first release:
```bash
npm run appwrite:provision
npm run appwrite:permissions:strict
```

Use production-scoped service credentials and IDs.

Deploy backend functions from `appwrite/functions/` and set `VITE_ENABLE_APPWRITE_FUNCTIONS=true` only after deployment is complete.

If you plan to enable account verification and recovery, follow `docs/FEATURE_ACTIVATION.md` before setting `VITE_ENABLE_EMAIL_VERIFICATION=true`.

## 6) Post-Deploy Validation
- Login, register, logout.
- Landlord listing create/edit.
- Tenant apply flow.
- Messaging send/receive.
- Notifications page and unread count.

## 7) Rollback Strategy
- Keep previous deployed artifact/image tagged.
- Roll back by redeploying previous tag.
- Do not run destructive schema changes in the same release step as frontend deployment.
