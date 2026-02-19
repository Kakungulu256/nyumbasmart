# Feature Activation Runbook

This guide explains how to activate:
- Forgot Password
- Email Verification (account activation gate)
- Map View + GeoSearch

It also includes the checklist to complete before email verification is re-enabled.

## 1) Forgot Password Activation

### Appwrite requirements
1. Configure your Web platform in Appwrite with your frontend origin.
2. Configure email delivery in Appwrite (SMTP/provider) so recovery emails can be sent.
3. Make sure your app can serve the reset route:
   - `/auth/reset-password`

### Frontend behavior in this project
- Forgot password is already wired in:
  - `src/features/auth/pages/ForgotPasswordPage.jsx`
  - `src/features/auth/pages/ResetPasswordPage.jsx`
- It calls:
  - `account.createRecovery(email, redirectUrl)`
  - `account.updateRecovery(userId, secret, password, password)`

### Validation steps
1. Open `/auth/forgot-password`.
2. Request reset for a real account email.
3. Open email link and confirm it includes `userId` and `secret`.
4. Set a new password and verify login works.

## 2) Email Verification Activation (Account Activation)

## Pre-activation checklist (complete this before re-enabling)
1. Appwrite email sending is working (same requirement as forgot password).
2. Frontend origin is added as Appwrite Web platform.
3. Verification callback route is reachable:
   - `/auth/verify`
4. You have a decision for existing unverified users:
   - either verify all manually
   - or expect them to verify via `/auth/verify`.
5. You understand current UX behavior:
   - verification is requested from the verify page (`Resend verification email`), not auto-sent immediately at signup.

### Activation steps
1. Set environment flag:
   - `.env`: `VITE_ENABLE_EMAIL_VERIFICATION=true`
   - production env: `VITE_ENABLE_EMAIL_VERIFICATION=true`
2. Redeploy frontend.
3. Confirm flows:
   - login blocks unverified users and routes to `/auth/verify`
   - verification email can be requested
   - verification link confirms and allows access.

### Optional improvement before activation
- If you want verification email sent automatically at signup, add `authService.requestEmailVerification(...)` in the register flow after session creation.

## 3) Map View + GeoSearch Activation

### Requirements
1. Dependencies installed:
   - `leaflet`
   - `react-leaflet`
2. Leaflet CSS imported:
   - `src/main.jsx` includes `import 'leaflet/dist/leaflet.css'`
3. Outbound network allows OpenStreetMap tile URLs:
   - `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
4. Use HTTPS in staging/production if you want geolocation distance features.

### Frontend behavior in this project
- Map view is available in Listings page and can be toggled in UI.
- GeoSearch distance/radius works when user grants geolocation permission.

### Validation steps
1. Open `/listings`.
2. Click `Show map` if hidden.
3. Click `Use my location` and allow permission.
4. Apply radius + distance sort and verify listing order/pins update.

## 4) Quick Smoke Checklist
1. Forgot password email arrives and reset succeeds.
2. Verification email request works and verification link confirms.
3. Unverified user is blocked from protected features when verification gate is on.
4. Map renders and pins appear.
5. GeoSearch works on permission grant and gracefully degrades if denied.
