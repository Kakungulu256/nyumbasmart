# NyumbaSmart Flutter Starter

This is a Flutter starter client for Android/iOS using the same Appwrite BaaS as the web app.

It is wired for:
- Appwrite Auth
- Public listings query
- Buy/Rent mode filtering using `listingIntent` (`sale` / `rent`)
- Land vs Property filtering
- Uganda land filters (`region`, `district`, `landTenureType`)

## 1) Prerequisites

- Flutter SDK 3.24+
- Dart SDK 3.5+
- Existing Appwrite project already used by the web app

## 2) Generate Native Folders (first time)

This scaffold intentionally ships without generated platform folders.  
Run this once inside `mobile/nyumbasmart_flutter`:

```bash
flutter create --platforms=android,ios .
```

## 3) Install Packages

```bash
flutter pub get
```

## 4) Run With Appwrite Environment

Use the same Appwrite values from your web `.env`:

```bash
flutter run \
  --dart-define=APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1 \
  --dart-define=APPWRITE_PROJECT_ID=<APPWRITE_PROJECT_ID> \
  --dart-define=APPWRITE_DATABASE_ID=<APPWRITE_DATABASE_ID> \
  --dart-define=APPWRITE_COLLECTION_LISTINGS_ID=listings \
  --dart-define=APPWRITE_SELF_SIGNED=false
```

Optional IDs (if custom):
- `APPWRITE_COLLECTION_USERS_ID`
- `APPWRITE_BUCKET_LISTING_IMAGES_ID`

## 5) Appwrite Platform Setup

In Appwrite Console:
1. Add Android app (package name).
2. Add iOS app (bundle ID).
3. Ensure permissions allow public read for available listings.

## Notes

- If Appwrite fulltext index is missing for `title`, the app falls back to client-side keyword filtering.
- If optional attributes are missing in schema (`region`, `district`, `landTenureType`, `listingIntent`), it retries with compatible queries.
