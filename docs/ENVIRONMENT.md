# Environment Variables

## Files
- `.env.example`: full local template (frontend + provisioning scripts).
- `.env.production.example`: frontend-only production template.

## Security Rule
- `VITE_*` variables are embedded into client bundles and are public.
- Never put secrets in `VITE_*`.
- `APPWRITE_API_KEY` is server-only and must stay in secret stores (CI/CD secret manager).

## Server-side Variables (Node scripts)
| Variable | Required | Purpose |
|---|---|---|
| `APPWRITE_ENDPOINT` | Yes | Appwrite API endpoint used by provisioning scripts |
| `APPWRITE_PROJECT_ID` | Yes | Appwrite project ID |
| `APPWRITE_API_KEY` | Yes | Server API key with schema/bucket permissions |
| `APPWRITE_DATABASE_ID` | Yes | Target database ID |

## Client-side Variables (Frontend)
| Variable | Required | Purpose |
|---|---|---|
| `VITE_APPWRITE_ENDPOINT` | Yes | Browser Appwrite endpoint |
| `VITE_APPWRITE_PROJECT_ID` | Yes | Browser Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Yes | Database ID for all collections |
| `VITE_ENABLE_EMAIL_VERIFICATION` | No | Toggle email verification gate (`true`/`false`) |
| `VITE_ENABLE_APPWRITE_FUNCTIONS` | No | Toggle frontend execution of Appwrite Functions (`true`/`false`) |

Note: map view has no env toggle in current implementation. It is enabled in UI and depends on Leaflet assets plus browser geolocation permission for distance features.

## ID Variables
Collection, bucket, and function IDs can be overridden through env vars in `.env.example`.  
If not overridden, defaults from `src/constants/appwriteIds.js` are used.

## Recommended Environment Separation
- Local: `.env` from `.env.example`.
- Staging: CI/CD injected vars with staging Appwrite project and IDs.
- Production: CI/CD injected vars with production Appwrite project and IDs.

## Rotation and Access
- Rotate `APPWRITE_API_KEY` regularly.
- Restrict key scope to required services.
- Keep production and staging keys separate.
