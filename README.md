# Reigknight — Phase 1 (Core)

Event operations platform for Ellison Castle: venues, inventory, events, and inventory
assignment with double-booking prevention. Built on Firebase (Firestore + Auth + Storage),
sharing the same Firebase project as the check-in app. This build covers **Phase 1 only** —
no tasks/agenda, no read-only share links, no check-in integration yet.

## 1. Install dependencies

```bash
npm install
```

## 2. Firebase project setup

This app reuses your existing `reigknight-checkin` Firebase project.

1. Firebase Console → Project Settings → your web app → copy the config values.
2. Authentication → Sign-in method → enable **Email/Password**. Add your team's accounts
   under Authentication → Users (this app has no self-serve signup by design).
3. Storage → make sure it's enabled (Blaze plan, but stays at $0 under the Always Free tier
   per the spec's cost note). Set a budget alert in Google Cloud Console → Billing if you
   haven't already.
4. Firestore → make sure it's enabled in Native mode.

## 3. Environment variables

Fill in `.env` (already gitignored) with your Firebase web config:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

## 4. Security rules

**Important:** this app only reads/writes Firestore and Storage. It never touches your
check-in app's Realtime Database. Firestore/Storage rules are a completely separate system
from Realtime Database rules, so there's nothing to "merge" with the check-in app's RTDB
rules — but your Firestore project may already have its own rules from other work, so check
before overwriting.

- `firestore.rules` — paste into Firebase Console → Firestore Database → Rules. If you
  already have Firestore rules for something else in this project, merge match-blocks
  rather than replacing the whole file.
- `storage.rules` — paste into Firebase Console → Storage → Rules. Scoped only to the
  `inventory/**` path, so it won't affect anything else in the bucket.
- `firestore.indexes.json` — the two composite indexes the double-booking checks need
  (`events` by venueId+startAt, `reservations` by itemId+reservedFrom). If you have the
  Firebase CLI set up, `firebase deploy --only firestore:indexes`. Otherwise, just run the
  app — Firestore will log a console error with a one-click link to create each index the
  first time the query runs.

## 5. Run it

```bash
npm run dev
```

## 6. Deploy (Netlify)

`netlify.toml` is already set up (`npm run build`, publishes `dist/`, SPA redirect). Connect
the repo in Netlify and add the same `VITE_FIREBASE_*` variables under Site settings →
Environment variables.

## What's in Phase 1

- Email/Password sign-in (no public signup — add team accounts via Firebase Console).
- Venues: CRUD (name, description, capacity, optional photo URL).
- Inventory items: full field set (name, description, tags, color, quantity, location,
  model, SKU, multi-photo upload to Storage with a primary photo), filterable by tag/color/
  location plus text search.
- Inventory CSV export and upsert import (matches by `id` or `sku`) with a preview/confirm
  screen before anything is written. Photos are never imported/exported via CSV — add those
  through the app.
- Events: CRUD with venue, start/end window, status, client info, notes.
- Inventory assignment to events via reservations, with both double-booking checks live:
  venue conflict (one event per venue per window) and quantity-aware inventory availability
  (can't over-reserve an item across overlapping events).

Not built yet (later phases per the spec): tasks/agenda, read-only share links, check-in
integration.
