# Release Checklist

## Branch and Scope
- [ ] Release branch created from latest `main`
- [ ] Changelog/summary prepared
- [ ] No debug code, placeholder keys, or local endpoints committed

## Environment
- [ ] Production `VITE_*` values verified
- [ ] Production Appwrite IDs verified (collections/buckets/functions)
- [ ] `APPWRITE_API_KEY` stored in secret manager, not in repository

## Quality Gates
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] `npm run test:smoke` passes
- [ ] `npm run verify:release` passes

## Security and Permissions
- [ ] Appwrite schema is up to date
- [ ] Strict permissions applied (`appwrite:permissions:strict`)
- [ ] Role guards checked (tenant/landlord)
- [ ] Upload restrictions validated (type/size)

## Production Smoke
- [ ] Login + logout
- [ ] Register and role routing
- [ ] Landlord dashboard + listing management
- [ ] Tenant dashboard + applications
- [ ] Messaging + notifications

## Deployment
- [ ] Build artifact or Docker image tagged with version
- [ ] Release artifact workflow completed (`release-artifact.yml`) or equivalent build output archived
- [ ] Deploy completed to target environment
- [ ] Health check endpoint/landing page is accessible

## Post-Release
- [ ] Monitor errors and performance for 30-60 minutes
- [ ] Confirm no auth/database/storage regressions
- [ ] Record release notes and deployment timestamp
