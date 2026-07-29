# Reigknight — Event Operations Platform: Build Spec (Firebase)

An internal platform for planning and running events at Ellison Castle: inventory, venues, events, inventory assignment with double-booking prevention, a per-event task/agenda system, and read-only shareable progress views. Built on **Firebase** (Firestore + Auth + Storage) in the **same Firebase project as the existing check-in app**, so check-in data can be surfaced on event dashboards later. Frontend deployed on Netlify.

---

## Firebase setup (this project — already done)

This app is added to the **existing `reigknight-checkin` Firebase project** as a second web app (not a new project), so it can read check-in data later. Key facts Claude Code must respect:

- **The check-in app already uses Realtime Database** in this project. This new app uses **Firestore**, which lives alongside it. **Do not touch, migrate, or alter the Realtime Database or its rules.**
- **Anonymous sign-in is enabled** (the check-in app relies on it) and **must stay enabled**. **Email/Password** sign-in is also enabled — that's what the Reigknight team uses.
- Firestore security rules must therefore treat "a real team member" as **email/password auth specifically**, not merely "any signed-in user" (an anonymous check-in user is also signed in). See the rules section — use the `isTeam()` helper, not a generic `signedIn()`.
- **Config comes from env vars** (values are not secret, but keep them out of source). Create a `.env` (git-ignored) and read config from it. The same vars go into **Netlify → Environment variables** for deploys.

## How to use this spec with Claude Code

1. Create an empty project folder and open Claude Code in it.
2. Paste this whole spec plus your Firebase web config values (from Project Settings → Your apps).
3. Tell Claude Code: **"Start with Phase 1 only. Don't build later phases yet."** Phase-by-phase produces far better results than one big request.

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
  category,             // REQUIRED — one value from CATEGORIES preset list
  material,             // OPTIONAL — one value from MATERIALS preset list
  color,                // OPTIONAL — one value from COLORS preset list; if "Custom", also store colorCustom
  colorCustom,          // free text, only when color === "Custom"
  tags: [ string ],     // free-form multi-tags: ["rustic","outdoor","boho"] — array-contains filterable
  totalQuantity,        // total units owned
  location,             // where it's stored, e.g. "Warehouse", "Barn Shed", "Storage Room B"
  bin,                  // OPTIONAL — specific bin/shelf/spot within the location, e.g. "Bin 17", "Shelf B-3"
  condition,            // one value from CONDITIONS preset list — item-level lifecycle
  statusBreakdown: {    // per-unit count buckets — MUST sum to totalQuantity
    good: number,
    needsRepair: number,
    needsReplacement: number
  },
  photos: [ { url, isPrimary, sortOrder } ],   // uploaded to Cloud Storage
  model,                // optional — spec/model name
  createdAt,
  updatedAt
}
```

**Required on save:** `name`, `category`, `totalQuantity`, `location`, `statusBreakdown` (with counts summing correctly). Everything else is optional.

**Derived fields (computed in code, don't store):**
- `needsAttention` = `statusBreakdown.needsRepair + statusBreakdown.needsReplacement > 0`
- `availableForRental` = `totalQuantity - needsRepair - needsReplacement` — items in `Needs Repair` / `Needs Replacement` are **excluded from availability** in the double-booking check (they can't be rented until fixed).

**Validation invariants:**
- `statusBreakdown.good + needsRepair + needsReplacement === totalQuantity` — always. When the user changes any of these four fields in the UI, auto-balance and prevent save if they don't reconcile.
- When `totalQuantity` is increased, add the delta to `good` by default.
- When `totalQuantity` is decreased, remove from `needsReplacement` first, then `needsRepair`, then `good`.

**Filtering & sorting (list view must support):**
- Filter by category, material, color, tags (array-contains), location, bin, condition, status (needsAttention true/false).
- Sort by name, category, `needsRepair + needsReplacement` desc ("what needs work most"), condition, location.
- Text search on name + description + bin.

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

> **This project has Anonymous sign-in enabled (for the check-in app), so `request.auth != null` is true for anonymous users too.** Reigknight data must be gated to **email/password** accounts specifically — hence `isTeam()` below, not a generic "signed in" check. Also: **merge** these rules into any existing Firestore rules rather than replacing the file.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // A real Reigknight team member = signed in with email/password (NOT anonymous)
    function isTeam() {
      return request.auth != null
        && request.auth.token.firebase.sign_in_provider == 'password';
    }

    match /venues/{id}         { allow read, write: if isTeam(); }
    match /inventoryItems/{id} { allow read, write: if isTeam(); }
    match /people/{id}         { allow read, write: if isTeam(); }
    match /events/{id}         { allow read, write: if isTeam(); }
    match /reservations/{id}   { allow read, write: if isTeam(); }
    match /tasks/{id}          { allow read, write: if isTeam(); }

    match /publicViews/{token} {
      allow get:   if true;      // anyone with the unguessable token can read this one doc
      allow list:  if false;     // but cannot enumerate the collection
      allow write: if isTeam();
    }
  }
}
```

**Storage rules** (inventory photos): allow public read (so images show in read-only views) and write only for team members.
```
match /inventory/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null
    && request.auth.token.firebase.sign_in_provider == 'password';
}
```

---

## Inventory reference lists (seed constants)

Create `src/constants/inventory.ts` with the exact arrays below. All category / material / color / condition dropdowns read from these constants — so adding one later is one file change, no code hunting.

```ts
export const CATEGORIES = [
  "Tables","Seating","Linens and Textiles","Tabletop and Place Settings",
  "Serving and Catering Equipment","Bars and Beverage Stations",
  "Tents and Structures","Flooring and Ground Cover","Lighting",
  "Audio, Video and Presentation","Stages, Truss and Production",
  "Backdrops, Walls and Draping","Decor and Styling","Florals and Greenery",
  "Photo Booths and Interactive Media","Games and Entertainment",
  "Inflatables and Children's Attractions","Signage and Branding",
  "Crowd Control and Site Management","Power and Electrical",
  "Safety and Accessibility","Outdoor Furniture and Amenities",
  "Holiday and Seasonal Decor"
] as const;

export const COLORS = [
  "White","Black","Ivory","Beige","Natural","Brown","Gray","Gold","Silver",
  "Rose Gold","Clear","Red","Burgundy","Orange","Yellow","Green","Sage",
  "Emerald","Blue","Navy","Purple","Lavender","Pink","Blush","Multicolor",
  "Custom"        // "Custom" opens a free-text field (colorCustom)
] as const;

export const MATERIALS = [
  "Wood","Metal","Aluminum","Steel","Stainless Steel","Acrylic","Glass",
  "Ceramic","Porcelain","Plastic","Resin","Rattan","Wicker","Fabric","Vinyl",
  "Leather","Faux Leather","Velvet","Linen","Polyester","Cotton","Rubber",
  "Turf","Composite","Paper","Foam","Mixed Materials","Other"
] as const;

export const CONDITIONS = [
  "New","Excellent","Good","Fair","Service Required","Damaged","Retired"
] as const;

export const UNIT_STATUSES = [
  "good","needsRepair","needsReplacement"
] as const;

export const UNIT_STATUS_LABELS = {
  good: "Good",
  needsRepair: "Needs Repair",
  needsReplacement: "Needs Replacement"
};
```

---

## "Start from a common item" preset picker

At the top of the **Add Item** form, a searchable dropdown lets the user pick a common rental item as a starting template — the "state dropdown" analogy. Selecting one autofills `name`, `category`, typical `material`, and a starter `description`; the user can then edit any field and add photos/quantity before saving.

Create `src/constants/itemPresets.ts` with a seed list of common rental items — expand freely:

```ts
export const ITEM_PRESETS = [
  { name: "60in Round Table",          category: "Tables",  material: "Wood",    description: "60-inch round banquet table, seats 8." },
  { name: "8ft Rectangle Table",       category: "Tables",  material: "Wood",    description: "8ft rectangular banquet table, seats 8–10." },
  { name: "Cocktail Table (High-top)", category: "Tables",  material: "Metal",   description: "42in high-top cocktail table." },
  { name: "Chiavari Chair",            category: "Seating", material: "Wood",    description: "Classic Chiavari ballroom chair with cushion." },
  { name: "Folding Chair (White)",     category: "Seating", material: "Plastic", description: "White resin folding chair." },
  { name: "Farmhouse Bench",           category: "Seating", material: "Wood",    description: "Rustic wooden farmhouse bench." },
  { name: "Linen Tablecloth (120in Round)", category: "Linens and Textiles", material: "Polyester", description: "120in round tablecloth, floor-length on 60in round." },
  { name: "Cloth Napkin",              category: "Linens and Textiles", material: "Cotton",   description: "Standard cloth dinner napkin." },
  { name: "Charger Plate",             category: "Tabletop and Place Settings", material: "Acrylic", description: "Decorative under-plate charger." },
  { name: "Dinner Plate",              category: "Tabletop and Place Settings", material: "Porcelain", description: "Standard 10in dinner plate." },
  { name: "Wine Glass",                category: "Tabletop and Place Settings", material: "Glass",  description: "Standard stemmed wine glass." },
  { name: "Champagne Flute",           category: "Tabletop and Place Settings", material: "Glass",  description: "Standard champagne flute." },
  { name: "Chafing Dish",              category: "Serving and Catering Equipment", material: "Stainless Steel", description: "Full-size chafing dish with fuel tray." },
  { name: "Beverage Dispenser",        category: "Bars and Beverage Stations", material: "Glass", description: "3-gallon glass beverage dispenser with spigot." },
  { name: "Portable Bar",              category: "Bars and Beverage Stations", material: "Wood",  description: "Freestanding portable event bar." },
  { name: "20x20 Frame Tent",          category: "Tents and Structures", material: "Metal", description: "20x20 white frame tent." },
  { name: "Dance Floor Panel",         category: "Flooring and Ground Cover", material: "Wood", description: "3x3 wooden dance floor panel." },
  { name: "String Lights (50ft)",      category: "Lighting", material: "Other", description: "50ft warm-white outdoor string lights." },
  { name: "Uplight",                   category: "Lighting", material: "Metal", description: "LED wireless uplight, color-changing." },
  { name: "Wireless Microphone",       category: "Audio, Video and Presentation", material: "Metal", description: "Handheld wireless microphone with receiver." },
  { name: "PA Speaker",                category: "Audio, Video and Presentation", material: "Plastic", description: "Powered PA speaker on stand." },
  { name: "Backdrop Frame",            category: "Backdrops, Walls and Draping", material: "Aluminum", description: "Adjustable pipe-and-drape backdrop frame." },
  { name: "Draping Panel",             category: "Backdrops, Walls and Draping", material: "Polyester", description: "Sheer draping panel." },
  { name: "Giant Connect 4",           category: "Games and Entertainment", material: "Wood",  description: "Yard-size Giant Connect 4 game." },
  { name: "Cornhole Set",              category: "Games and Entertainment", material: "Wood",  description: "Regulation cornhole board set with bags." },
  { name: "Ring Toss",                 category: "Games and Entertainment", material: "Wood",  description: "Yard ring toss game." },
  { name: "A-Frame Sign",              category: "Signage and Branding", material: "Metal", description: "A-frame sidewalk sign." },
  { name: "Stanchion (Velvet Rope)",   category: "Crowd Control and Site Management", material: "Metal", description: "Stanchion post with velvet rope." },
  { name: "Extension Cord (100ft)",    category: "Power and Electrical", material: "Rubber", description: "100ft heavy-duty outdoor extension cord." },
  { name: "Adirondack Chair",          category: "Outdoor Furniture and Amenities", material: "Wood", description: "Classic outdoor Adirondack chair." }
] as const;
```

UX: at the top of the Add-Item form, an autocomplete/combobox labeled **"Start from a common item (optional)"**. Selecting one prefills the fields below. Typing a name that isn't in the list is fine — the user just fills the form from scratch. A subtle "Save as preset" action (admin-only) can be added later to grow this list from real inventory.

---

## Status flagging (needs-attention UI)

Any item where `needsRepair + needsReplacement > 0` must be visually flagged so it can't be missed in a list.

**In list rows (desktop and mobile):**
- Show a colored **pill badge** on the row: amber "5 need repair" when only `needsRepair > 0`; red "1 needs replacement" when `needsReplacement > 0`; red takes precedence if both apply, with the amber count shown after (e.g., "1 replace • 5 repair").
- Add a subtle **left border stripe** on the row in the same color (2–3px), so at a glance you can scan a table on a phone and see which need work. Keep the row background white — the stripe is the signal, staying with the clean/white theme.
- Include a top-of-list toggle: **"Show only items needing attention."**

**In item detail view:**
- A dedicated **Status** panel with three number inputs (Good / Needs Repair / Needs Replacement) that auto-balance against `totalQuantity`. Changing "Needs Repair" from 5→3 auto-adds 2 back to Good.
- Direct actions: **"Mark N repaired"** (moves from needsRepair→good), **"Mark N replaced"** (removes from needsReplacement and, if truly replaced with new units, offers to add that many back to good).

**Double-booking impact:** the availability calculation must use `availableForRental = totalQuantity − needsRepair − needsReplacement`, so units marked out-of-service can't accidentally be assigned to an event.

---

## Mobile-friendliness (baseline requirement)

The app is used by staff on their phones during setup, teardown, and inventory audits. Non-negotiable:
- Every screen (login, item list, item detail, event list, event detail, add/edit forms, CSV import preview) must be usable and legible on a **375px-wide viewport** (iPhone SE size) without horizontal scroll.
- **Typography on mobile — the current build is too small.** Set a minimum readable size across the app:
  - Body text: **16px** (Tailwind `text-base`) — this also prevents iOS from auto-zooming on form inputs.
  - Form input text and labels: **16px minimum.**
  - Table/list row primary text (item name, event name): **16px** — secondary/meta text no smaller than **14px** (`text-sm`).
  - Section headings: **18–20px** (`text-lg`/`text-xl`).
  - Never go below `text-sm` (14px) anywhere on mobile; nothing at `text-xs` on mobile screens.
  - Use responsive utilities (`text-base md:text-sm`) if desktop density needs to be tighter — but *always* err larger on mobile.
- Item list on mobile: card layout, not a wide table. Photo + name + category + status badge + attention stripe visible without tapping.
- Number inputs use the numeric keypad (`inputMode="numeric"`).
- Tap targets minimum 44×44 px.
- Filters collapse into a bottom sheet on mobile.

---

## Mobile-first inventory workflow (staff on their phones)

This is how the team will use the app most often: standing in the warehouse with a phone, updating counts or a status and snapping a photo. Get this workflow right — it's the app's main job on a small screen.

**Photo capture — tap once, camera opens, done:**
- The photo picker on both the Add-Item and Edit-Item forms must trigger the phone's **native camera** directly.
  - Implementation: `<input type="file" accept="image/*" capture="environment" multiple>` — `capture="environment"` opens the rear camera immediately on mobile; falls back to the file picker on desktop.
  - Offer two clear buttons in the form: **"Take Photo"** (uses `capture`) and **"Choose from Library"** (same input without `capture`) so staff aren't forced into the camera when they have shots already saved.
- **Client-side image compression before upload.** Phone photos are 3–8 MB each; that wastes Cloud Storage quota and makes mobile uploads slow on jobsite cell service. Compress to a max 1600px long edge at ~80% JPEG quality before uploading. Use `browser-image-compression` (npm) or a small canvas resize routine. Show original vs. compressed size briefly (e.g. "4.2 MB → 380 KB") so staff can see it's working.
- **Progress + resilience:** show a per-photo upload progress bar. If an upload fails (spotty warehouse Wi-Fi), keep the file in the form and offer a one-tap **Retry** — never a silent failure.
- **Multi-photo capture in one flow:** allow selecting/capturing several photos at once and uploading in parallel. After capture, show thumbnails with drag-to-reorder and a "Set as primary" star on each.
- **EXIF orientation:** strip or auto-rotate so portrait phone shots don't display sideways.
- **Delete/replace** a photo from the item detail on mobile in ≤ 2 taps.

**Quick-edit from the item list (no full form needed):**

Most phone updates are tiny — "we broke 2 more chairs" — and shouldn't require opening the full edit form. On each item card in the list, add a **⋯ menu** with:
- **Update status counts** — opens a compact sheet with just Good / Needs Repair / Needs Replacement number inputs, auto-balancing, and Save.
- **Add photo** — opens the camera directly, uploads, attaches to the item, done.
- **Adjust quantity** — a +/− stepper for `totalQuantity`.

These write straight to Firestore without leaving the list. This is the single biggest workflow win for phone use.

**Camera permission handling:**
- The first time the camera is invoked, iOS/Android prompt for permission. If the user denies, show a plain-language message with a link to Settings — not a silent failure. The "Choose from Library" button still works even if camera permission was denied.
- On desktop browsers without a camera, the "Take Photo" button hides itself.

**PWA-ish niceties (small effort, big feel):**
- Add a proper web-app manifest and app icon so staff can "Add to Home Screen" and launch the app fullscreen from their phones. No native app needed.
- No offline mode in v1 (real complexity) — but display a clear **"You're offline — changes will fail"** banner if the network drops, so nobody thinks an unsaved update was saved.

---

## Inventory import / export (core capability)

The team must **always** be able to export the full inventory list and re-import updates — same muscle memory as the check-in app's CSV tools.

**Export:** a one-click download of all inventory items as **CSV** (Excel-compatible). Columns: `id, name, description, category, material, color, colorCustom, tags, totalQuantity, location, bin, condition, statusGood, statusNeedsRepair, statusNeedsReplacement, model, photoUrls`. Tags are joined with `;` in the cell (e.g., `rustic;outdoor;boho`). `id` is included so an exported file can be edited and re-imported to update the exact same records.

**Import (upsert):** upload a CSV to bulk add/update items in one pass:
- If a row has an `id`, **update** that existing item's fields.
- If a row has no `id` (or the `id` doesn't match anything), **create** a new item.
- Show a **preview/confirm screen** before writing — a count of "X updated, Y created," with any bad rows flagged — so a typo can't silently overwrite the catalog.
- Parse CSV client-side (e.g., PapaParse) and write with a Firestore batch.

**Photo caveat (state plainly in the UI):** import/export covers all *text* fields. Photos are binary and can't ride along in a CSV — the export lists existing photo URLs for reference, but adding or changing images is done through the app's upload. Don't imply photos import from CSV.

---

## Check-in integration (the payoff of staying in Firebase)

Because this lives in the **same Firebase project** as the check-in app, the events platform can read the check-in app's Firestore data directly. Each event stores `checkinEventId`; the event dashboard can then query the check-in collections to show live counts (tickets sold, checked in, capacity) without rebuilding anything.

*To wire this in Phase 4, I'll need the check-in app's Firestore collection name(s) and the fields it stores for guests/check-ins.*

---

## Build phases

**Phase 1 — Core:** Firebase Auth login; CRUD for venues, inventory items (full field set, with photo upload to Cloud Storage); inventory list with **tag/color/location filters** and **CSV export + import (upsert)**; events; assign inventory to events via reservations with **both double-booking checks live**. White, clean UI.

**Phase 1.5 — Inventory upgrades (do this before Phase 2):**
- Add `src/constants/inventory.ts` (CATEGORIES / COLORS / MATERIALS / CONDITIONS / UNIT_STATUSES) and `src/constants/itemPresets.ts` (common items).
- Migrate the existing `inventoryItems` schema to the expanded model — new fields (`category`, `material`, `color` + `colorCustom`, `condition`, `statusBreakdown`); rewrite the Add/Edit form to use dropdowns from the constants and a **"Start from a common item"** picker at the top of the form.
- Enforce `good + needsRepair + needsReplacement === totalQuantity` with auto-balancing.
- Update the availability calculation to use `availableForRental = totalQuantity − needsRepair − needsReplacement`.
- Add the **needs-attention flagging** (row stripe, badge, "Show only items needing attention" toggle) to the list view.
- Verify **mobile layout** end-to-end at a 375px viewport (item list becomes cards; filters collapse into a bottom sheet; number inputs use numeric keypad; tap targets ≥44px).
- Update the CSV export/import to the new columns.

**Phase 2 — Agenda/tasks:** per-event task list with type, assignee, due date, status; mark-complete; filter by date / type / person; "My Tasks" view.

**Phase 3 — Read-only views:** `shareToken` + `publicViews` snapshot docs + `publishEventSnapshot()`; a clean per-event **progress dashboard** (status, % tasks done, outstanding items by person/type/date, assigned inventory). No login, no edit controls.

**Phase 4 — Check-in:** link `checkinEventId` and surface live check-in stats on the event dashboard from the shared project.

**Later (not now):**
- Refactor the check-in app itself to hold **multiple events at once** (tabs), instead of resetting the page per event. Each event tab maps cleanly to a `checkinEventId` here, so this platform links straight to the right one.

---

## Cost note (Firebase, 2026)

- **Firestore + Authentication:** free on the Spark plan, no credit card.
- **Cloud Storage (inventory photos):** since Feb 3, 2026, Firebase Storage requires enabling the **Blaze** (pay-as-you-go) plan — a card on file — even though you stay at **$0** under the Always Free tier (5 GB stored, 100 GB transfer/month), which Reigknight won't approach.
- **Protect yourself:** Blaze has no hard spending cap. In Google Cloud Console → Billing → Budgets & alerts, set a low budget (e.g., $5) with email alerts so you're notified of any unexpected usage.
- **No auto-pause**, so no keep-alive workaround is needed — a real advantage for infrequent events.
