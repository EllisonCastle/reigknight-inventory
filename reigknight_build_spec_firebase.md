# Reigknight — Event Operations Platform: Build Spec (Firebase)

An internal platform for planning and running events at Ellison Castle: inventory, venues, events, inventory assignment with double-booking prevention, a per-event task/agenda system, and read-only shareable progress views. Built on **Firebase** (Firestore + Auth + Storage) in the **same Firebase project as the existing check-in app**, so check-in data can be surfaced on event dashboards later. Frontend deployed on Netlify.

---

## How to use this spec with Claude Code

1. Create an empty project folder and open Claude Code in it.
2. In the Firebase console, open the **same project your check-in app uses** → Project Settings → grab the web app config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`).
3. Enable **Email/Password** sign-in under Authentication, and enable **Cloud Storage** (this prompts a Blaze upgrade — see the cost note at the end; you stay at $0).
4. Paste this whole spec, then tell Claude Code: **"Start with Phase 1 only. Don't build later phases yet."** Phase-by-phase produces far better results than one big request.

---

## Stack

- **Frontend:** React + TypeScript + Vite, styled with Tailwind CSS.
- **Database:** Cloud Firestore.
- **Auth:** Firebase Authentication (Email/Password).
- **Photos:** Cloud Storage for Firebase.
- **Hosting:** Netlify (matches the check-in app's frontend). Firebase Hosting is an alternative.
- **Config (env vars):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`.
- **No Cloud Functions required** — all logic runs client-side, gated by Firestore Security Rules. (An optional function is noted later for race-proofing.)
- **No keep-alive needed** — unlike Supabase, Firebase projects don't auto-pause, which suits events every few months.

---

## Access model (one app, two modes — mirrors the check-in page)

- **Edit mode** — a team member signs in with Firebase Auth. Any signed-in team member can read and edit everything.
- **Read-only view** — a shared link with **no login**, live data, no edit controls.

Read-only is enforced in **Firestore Security Rules**, not just by hiding buttons:

- Each event has an unguessable `shareToken`. The read-only link points at a **`publicViews/{shareToken}`** document — a self-contained snapshot of that one event (event info + its tasks + its reserved inventory, embedded in the single doc). Rules allow **`get` by known token but forbid `list`**, so the collection can't be enumerated and only someone you sent the link to can read that one event.
- The app regenerates an event's `publicViews` snapshot whenever the event, its tasks, or its reservations are saved (a small `publishEventSnapshot(eventId)` helper). This needs no Cloud Function.
- For an all-events management overview without logging in: default recommendation is a lightweight **viewer login** (safest). A no-login master view is possible but would mean one link exposing everything — call it out as a deliberate choice if you want it.

---

## Design direction

- **White background**, clean and minimal. Charcoal text (`#1f2328`), light gray surfaces (`#f7f7f8`), subtle 1px gray borders, generous whitespace.
- One restrained **regal accent** color (e.g., deep plum `#5b2a4a` or navy `#233876`) for primary buttons, active states, and links; everything else neutral on white.
- Clean "stat tiles" and data tables, with the locked/unlocked feel familiar from the check-in page — but **light**, not dark.
- Fully **mobile-friendly** — staff mark tasks complete from phones on-site.

---

## Data model (Firestore collections)

Firestore is collections of documents. Reservations and tasks are **top-level collections** (not subcollections) so we can query across all events for availability checks and "my tasks" views. Denormalize a few fields (noted) to avoid needing joins.

### `venues/{venueId}`
```
{ name, description, capacity, photoUrl, createdAt }
```

### `inventoryItems/{itemId}`
```
{
  name,                 // "60in Round Table", "Chiavari Chair"
  description,
  tags: [ string ],     // ["rustic", "outdoor", "gold"] — flexible, filterable (array-contains)
  color,                // "Gold", "White", "Natural Wood"
  totalQuantity,        // number owned/on hand — this is the "quantity available" field
  location,             // where it's stored, e.g. "Barn Shed", "Storage Room B"
  photos: [ { url, isPrimary, sortOrder } ],   // uploaded to Cloud Storage
  model,                // optional — more detailed spec/model name
  sku,                  // optional — your own barcode/QR value (see Barcode section)
  createdAt
}
```
> **On "quantity available":** `totalQuantity` is how many Reigknight *owns*. How many are *free for a given event window* is computed live by the availability check in the double-booking logic — never stored, always derived, so it can't drift out of date.
>
> **Filtering:** the inventory list must be filterable by **tags** (rustic, outdoor, etc.), **color**, and **location**, plus text search on name/description. Tags replace a single rigid "category" — an item can carry several.

### `people/{personId}` — anyone assignable (staff who log in AND contractors who don't)
```
{
  fullName, email, phone,
  role,                 // 'admin' | 'staff' | 'viewer' | 'contractor'
  authUid,              // Firebase Auth uid — set only for people who log in
  active, createdAt
}
```

### `events/{eventId}`
```
{
  name,
  venueId,
  startAt,              // Timestamp — reservation/hold window start (setup)
  endAt,               // Timestamp — reservation/hold window end (teardown)
  status,              // 'draft'|'confirmed'|'in_progress'|'completed'|'cancelled'
  clientName, clientContact, notes,
  checkinEventId,      // id of the matching event in the check-in app (same project) — for stats later
  shareToken,          // random UUID powering the read-only link
  createdAt, createdBy // createdBy = auth uid
}
```

### `reservations/{reservationId}` — inventory assigned to an event (drives double-booking)
```
{
  eventId, itemId, quantity,
  reservedFrom,        // Timestamp — defaults to event.startAt
  reservedTo,          // Timestamp — defaults to event.endAt
  eventStatus,         // DENORMALIZED copy of the event's status (kept in sync) so we can exclude cancelled without a join
  createdAt
}
```

### `tasks/{taskId}` — the per-event working agenda
```
{
  eventId, title, description,
  taskType,            // 'purchase'|'install'|'paint'|'build'|'rent'|'clean'|'setup'|'teardown'|'other'
  assigneeId,          // people/{personId}
  dueDate,             // Timestamp/date
  status,              // 'todo'|'in_progress'|'done'|'blocked'
  completedAt,         // set when status -> done
  createdAt, createdBy
}
```
Filterable by **due date, type, and assignee**; any signed-in person can mark a task `done`. "My Tasks" is a filter on `assigneeId`.

### `publicViews/{shareToken}` — read-only snapshot per event
```
{
  event: { name, venueName, startAt, endAt, status, clientName },
  inventory: [ { itemName, quantity, primaryPhotoUrl } ],
  tasks: [ { title, taskType, assigneeName, dueDate, status } ],
  checkinSummary: null,   // filled in later from the check-in app
  updatedAt
}
```

---

## Double-booking logic (the core requirement)

Two independent checks, both run client-side before writing a reservation/event. Overlap rule: **A starts before B ends AND A ends after B starts.**

**Firestore constraint to know:** a single query can only use a range/inequality filter on **one** field. The overlap test needs two (`reservedFrom < to` and `reservedTo > from`), so the pattern is: filter on one field in the query, then filter the second field and sum in client code. At Reigknight's scale (events every few months, modest inventory) these result sets are tiny, so this is fast and correct.

**1. Venue conflict** — a venue hosts at most one event at a time.
```js
// venueId, from, to are the proposed event's values; excludeEventId when editing
const snap = await getDocs(query(
  collection(db, 'events'),
  where('venueId', '==', venueId),
  where('startAt', '<', to)              // single inequality
));
const conflict = snap.docs.some(d => {
  const e = d.data();
  return d.id !== excludeEventId
      && e.status !== 'cancelled'
      && e.endAt.toMillis() > from.toMillis();   // second condition, client-side
});
// if conflict -> block/warn
```

**2. Inventory conflict (quantity-aware)** — can't reserve more of an item than is free in the window.
```js
// itemId, from, to, requestedQty; excludeReservationId when editing
const snap = await getDocs(query(
  collection(db, 'reservations'),
  where('itemId', '==', itemId),
  where('reservedFrom', '<', to)         // single inequality
));
let reserved = 0;
snap.forEach(d => {
  const r = d.data();
  if (d.id !== excludeReservationId
      && r.eventStatus !== 'cancelled'
      && r.reservedTo.toMillis() > from.toMillis()) {
    reserved += r.quantity;
  }
});
const available = item.totalQuantity - reserved;
// if requestedQty > available -> block and show, e.g.,
// "Only 80 of 200 Chiavari chairs are free June 12–14"
```

**Keep `eventStatus` in sync:** when an event's status changes (especially to `cancelled`), update the `eventStatus` field on all its reservations. Do this in the same save flow.

**Composite indexes:** the two queries above (equality + inequality on different fields) require Firestore composite indexes. On first run Firestore logs an error with a one-click link to create each — follow it, or have Claude Code add them to `firestore.indexes.json`.

**Optional race-proofing (later):** client-side checks have a vanishingly small race window if two people reserve the last units simultaneously — negligible for a small team. If it ever matters, a Firebase Cloud Function running the check inside a Firestore transaction closes it. That needs Blaze (which you'll already have for Storage) and stays within the free invocation tier.

---

## Firestore Security Rules (v1)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }

    match /venues/{id}         { allow read, write: if signedIn(); }
    match /inventoryItems/{id} { allow read, write: if signedIn(); }
    match /people/{id}         { allow read, write: if signedIn(); }
    match /events/{id}         { allow read, write: if signedIn(); }
    match /reservations/{id}   { allow read, write: if signedIn(); }
    match /tasks/{id}          { allow read, write: if signedIn(); }

    match /publicViews/{token} {
      allow get:   if true;      // anyone with the unguessable token can read this one doc
      allow list:  if false;     // but cannot enumerate the collection
      allow write: if signedIn();
    }
  }
}
```

**Storage rules** (inventory photos): allow read (public, so images show in read-only views) and write only when signed in.
```
match /inventory/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

---

## Inventory import / export (core capability)

The team must **always** be able to export the full inventory list and re-import updates — same muscle memory as the check-in app's CSV tools.

**Export:** a one-click download of all inventory items as **CSV** (Excel-compatible). Columns: `id, name, description, tags, color, totalQuantity, location, model, sku, photoUrls`. Tags are joined with `;` in the cell (e.g., `rustic;outdoor;gold`). `id` is included so an exported file can be edited and re-imported to update the exact same records.

**Import (upsert):** upload a CSV to bulk add/update items in one pass:
- If a row has an `id` (or a matching `sku`), **update** that existing item's fields.
- If a row has no `id`/`sku` match, **create** a new item.
- Show a **preview/confirm screen** before writing — a count of "X updated, Y created," with any bad rows flagged — so a typo can't silently overwrite the catalog.
- Parse CSV client-side (e.g., PapaParse) and write with a Firestore batch.

**Photo caveat (state plainly in the UI):** import/export covers all *text* fields. Photos are binary and can't ride along in a CSV — the export lists existing photo URLs for reference, but adding or changing images is done through the app's upload. Don't imply photos import from CSV.

---

## Barcode / QR (optional, later — the honest version)

Two different ideas often get lumped together as "barcodes"; they're worth separating:

- **Scanning your own labels (recommended, free, in-browser).** Generate a QR code or barcode per item that encodes its `id`/`sku`, print labels, and stick them on the items or storage bins. Staff scan with a phone camera to instantly pull up an item — to locate it, check its available quantity, or assign it to an event. This is the Sortly-style workflow and it's genuinely useful for a physical inventory spread across storage areas. It works with a browser barcode library (e.g., ZXing / `@zxing/library`, or the native `BarcodeDetector` API where supported), at no extra cost.
- **Auto-filling item info from a global product database (skip for now).** Scanning a retail UPC to auto-populate a product's name/specs relies on third-party lookup APIs that are usually paid or rate-limited — and most of your inventory (custom tables, décor, rentals) has no standard retail barcode anyway. Low payoff for this use case.

Recommendation: keep the `sku` field now so items are label-ready, and add **generate-label + camera-scan-to-find** as a later enhancement once the core app is solid. Skip global product-database lookup.

---

## Check-in integration (the payoff of staying in Firebase)

Because this lives in the **same Firebase project** as the check-in app, the events platform can read the check-in app's Firestore data directly. Each event stores `checkinEventId`; the event dashboard can then query the check-in collections to show live counts (tickets sold, checked in, capacity) without rebuilding anything.

*To wire this in Phase 4, I'll need the check-in app's Firestore collection name(s) and the fields it stores for guests/check-ins.*

---

## Build phases

**Phase 1 — Core:** Firebase Auth login; CRUD for venues, inventory items (full field set, with photo upload to Cloud Storage); inventory list with **tag/color/location filters** and **CSV export + import (upsert)**; events; assign inventory to events via reservations with **both double-booking checks live**. White, clean UI.

**Phase 2 — Agenda/tasks:** per-event task list with type, assignee, due date, status; mark-complete; filter by date / type / person; "My Tasks" view.

**Phase 3 — Read-only views:** `shareToken` + `publicViews` snapshot docs + `publishEventSnapshot()`; a clean per-event **progress dashboard** (status, % tasks done, outstanding items by person/type/date, assigned inventory). No login, no edit controls.

**Phase 4 — Check-in:** link `checkinEventId` and surface live check-in stats on the event dashboard from the shared project.

**Later (not now):**
- Refactor the check-in app itself to hold **multiple events at once** (tabs), instead of resetting the page per event. Each event tab maps cleanly to a `checkinEventId` here, so this platform links straight to the right one.
- Barcode/QR **label generation + camera scan-to-find** for inventory (see the Barcode section).

---

## Cost note (Firebase, 2026)

- **Firestore + Authentication:** free on the Spark plan, no credit card.
- **Cloud Storage (inventory photos):** since Feb 3, 2026, Firebase Storage requires enabling the **Blaze** (pay-as-you-go) plan — a card on file — even though you stay at **$0** under the Always Free tier (5 GB stored, 100 GB transfer/month), which Reigknight won't approach.
- **Protect yourself:** Blaze has no hard spending cap. In Google Cloud Console → Billing → Budgets & alerts, set a low budget (e.g., $5) with email alerts so you're notified of any unexpected usage.
- **No auto-pause**, so no keep-alive workaround is needed — a real advantage for infrequent events.
