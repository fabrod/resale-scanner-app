# Resale Scanner — real App Store app

Scan products and clothing in stores like Marshalls/TJ Maxx, check resale value,
and get a **BUY / MAYBE / SKIP** verdict with profit math. Then one-tap a
ready-to-paste listing for eBay, Poshmark, or Facebook Marketplace.

**Stack:** Expo (React Native) + a small Express backend that holds the API keys.
iOS builds run in the cloud via EAS — no Mac needed.

## Project layout

```
App.js                  → navigation (Scanner → Verdict → ListIt, History, Settings)
src/lib/verdict.js      → profit math: BUY / MAYBE / SKIP (pure functions)
src/lib/upc.js          → UPC → product lookup (via backend proxy)
src/lib/comps.js        → sold-price comps abstraction (auto or manual fallback)
src/lib/listing.js      → listing copy builder + marketplace deep links
src/lib/storage.js      → settings + scan history (AsyncStorage)
src/lib/api.js          → backend base URL (EXPO_PUBLIC_API_URL)
src/screens/            → Scanner, ManualEntry, Verdict, ListIt, History, Settings
backend/server.js       → Express API-key proxy (:3001)
```

The native entry point is `index.js`, which calls Expo's
`registerRootComponent(App)`. Keep `package.json`'s `main` pointed there.
Launching `App.js` directly without registration causes the startup error
`"main" has not been registered` in Expo Go and standalone builds.

## How the iOS app works

The app opens on **Scan a product**. From there, users can scan a product
barcode with the camera or choose manual entry. The header also provides direct
access to scan history and calculation settings.

### Camera permission flow

- When camera access has not been requested, the app explains why it needs the
  camera and offers **Continue** or **Not now**. Only **Continue** opens Apple's
  native iOS permission dialog.
- **Not now** dismisses the camera explanation and opens manual entry without
  requesting permission.
- When access is granted, the app proceeds directly to the scanner on future
  launches without showing the custom explanation again.
- When access is denied, the app does not request permission repeatedly or open
  Settings automatically. It offers the optional **Open Settings** action and
  keeps **Enter manually instead** available.
- Returning from Settings refreshes the current camera permission. If access is
  now granted, the scanner opens directly.

Barcode detection happens on the device. Camera images and video frames are not
recorded, saved, or uploaded. The scanner accepts common UPC/EAN and Code 128
barcodes. QR codes are directed to manual entry because they usually contain a
link rather than a product identifier.

### Product and resale workflow

1. A scanned or typed UPC is sent to the configured backend for product lookup.
   If lookup is unavailable, the user can still continue with an unknown product
   and enter prices manually.
2. Clothing or covered barcodes can be entered using brand and item keywords.
3. The verdict screen combines store price, expected resale price, marketplace
   fee percentage, shipping cost, and minimum desired profit.
4. The result is **BUY**, **MAYBE**, or **SKIP**. Completed checks are saved in
   on-device history using AsyncStorage.
5. The listing screen generates reusable listing copy and opens supported
   marketplace handoffs. The user remains responsible for reviewing and
   publishing the listing.

Settings and history are stored locally on the device. The app has no account,
analytics SDK, advertising SDK, or cloud history synchronization.

## 1. Run the app locally

```bash
npm install
npx expo start
# scan the QR with Expo Go on your iPhone
```

After changing the entry point, restart Metro with `npx expo start --clear`.
Use Expo Go compatible with this project's Expo SDK 57. The iOS Simulator
can test manual entry; test barcode scanning on a physical device.

### Native iOS end-to-end tests with Maestro

The reusable flows in `.maestro/` verify the camera explanation, neutral button
labels, native denial path, manual-entry fallback, already-granted path, and
return from Settings. Start Metro in one terminal:

```bash
npm run start
```

With an iOS Simulator running, build the native app and run the suite in another
terminal:

```bash
npm run ios -- --no-bundler
maestro test .maestro
```

All iOS releases should pass this Maestro suite before upload to App Store
Connect. Maestro validates the native UI and permission flow in the simulator;
real barcode-camera decoding must also be checked on a physical iPhone.

### Why the project keeps both Maestro and Cypress

The two suites protect different parts of the app and are intentionally kept
together:

- **Maestro** exercises the installed native iOS app as a user would. It covers
  navigation, the custom camera explanation, Apple's permission states, manual
  entry, and returning from Settings.
- **Cypress** supplies a generated barcode video to the web camera stream. This
  exercises Expo's real barcode decoder plus controlled API success/failure,
  repeat scans, verdict math, saved history, listing copy, and marketplace
  handoffs without requiring a person to hold a barcode in front of a phone.
- **Physical iPhone testing** remains the final hardware check for focus,
  lighting, camera framing, and real barcode recognition.

Keeping all three layers makes failures easier to locate: Maestro catches iOS
integration regressions, Cypress catches deterministic scanner and workflow
regressions, and the physical-device check catches camera-hardware behavior.

Run `npm test` for native iOS scene configuration, startup, scanner lifecycle,
saved history, verdict, and backend HTTP regression checks. Install backend
dependencies first with `npm --prefix backend install`. Run `npx expo export --platform ios` to check the release
bundle before building. TestFlight needs a new EAS build and upload to include
these fixes; an existing installed build will still contain the old code.

For builds using the iOS 27 SDK, keep `expo-build-properties` configured with
`ios.enableSceneSupport: true` while this app uses Expo SDK 57. This config
generates both the scene manifest and the AppDelegate changes needed to launch
on iOS 27. Expo Go and iOS 26 testing cannot detect the missing-scene assertion
that caused the build 4 rejection. See [the crash diagnosis](store/build-5-launch-fix.md)
for evidence and release validation steps.

Point it at the backend:

```bash
# .env in this folder (create it)
EXPO_PUBLIC_API_URL=http://<your-computer-ip>:3001
```

## 2. Run the backend locally

```bash
cd backend
cp .env.example .env   # fill in keys when you have them
npm install
npm start
```

Without any keys it still works: UPC lookup uses the free upcitemdb trial tier
(~100/day) and `/api/comps` answers 501 so the app falls back to manual
resale-price entry.

The backend is pinned to the tested Node 24.18.0 runtime and loads `backend/.env` automatically;
existing environment variables take precedence. Browser requests from localhost
are allowed. Set `CORS_ORIGINS` to a comma-separated list of additional web
origins if needed. Provider requests time out after 12 seconds and failures
include the provider and upstream HTTP status for diagnosis.

### Local camera and API tests with Cypress

Run the backend and Expo web app in separate terminals:

```bash
npm run backend
npm run web
```

Open http://localhost:8081 to use your computer's camera. The default API URL
is http://localhost:3001. For an iPhone, use Expo Go and set
`EXPO_PUBLIC_API_URL` to your computer's LAN address as shown above.

```bash
npx cypress install
npm run test:e2e
```

Chrome must be installed. The tests generate a video of UPC `049000028911`
(EAN-13 `0049000028911`) and supply it as Chrome's camera stream. Expo's real
barcode decoder runs against those frames. The regular suite controls API
responses to check successful lookup, repeat scanning, API failure, denied
camera access, profit calculation, and saved history.

For the explicit `:live` suite, start a separate Expo instance pointed at the
hosted production backend, then run Cypress against that instance:

```bash
EXPO_PUBLIC_API_URL=https://resale-scanner-app.onrender.com npx expo start --web --port 8082
# In another terminal:
npm run test:e2e:live -- --config baseUrl=http://localhost:8082
```

The live suite checks the actual hosted request origin, product lookup,
automatic sold comps, calculation/history, listing copy and marketplace
handoffs. Each full run uses at most one UPC lookup and one sold-comps request.
It does not stub API responses. Clipboard writes and marketplace window opens
are intercepted so no external listing is posted. Screenshots are saved in
`cypress/screenshots/`. To recheck only calculation/history/listing without
using more provider quota, add `--expose workflowOnly=true` to the live command.

When running from an Electron-based terminal that sets `ELECTRON_RUN_AS_NODE`,
clear it first: `env -u ELECTRON_RUN_AS_NODE npm run test:e2e`. For a custom
Cypress installation cache, pass the same `CYPRESS_CACHE_FOLDER` when installing
and running. These browser tests do not validate a physical iPhone's camera;
perform a physical barcode scan in Expo Go for native camera validation.

## 3. Deploy the backend (when ready)

Any Node host works — Render, Railway, Fly.io, or a $5 VPS. Set the same
env vars there, then set `EXPO_PUBLIC_API_URL` to its public URL in your
EAS build profile (`eas.json`).

## 4. Sold-price data (the real upgrade)

eBay's official API does **not** expose sold prices (restricted). The backend
is already wired for **CompsAPI** (`backend/server.js` → `fetchSoldComps()`),
which returns real eBay sold listings with true closing prices on Best Offer
sales — verified working. Get a free key (100 requests/month, no card) at
https://app.compsapi.com, then:

1. Put the key in the backend `.env` as `SOLD_API_KEY`
   (`SOLD_API_URL` already defaults to `https://api.compsapi.com`).
2. Redeploy the backend. The app's "Auto comps" button starts returning real
   sold medians immediately — no app update needed.

Paid plans start at $9/mo when you scan real volume.

## 5. Build for the App Store (EAS, no Mac needed)

```bash
npm install -g eas-cli
eas login
eas build:configure        # creates eas.json
```

**Apple credentials:** on the first iOS build, EAS asks for your Apple
Developer account. You enter your Apple ID in *your* terminal — the
credentials stay between you and Expo/Apple. EAS then handles certificates
and provisioning profiles for you.

```bash
eas build --platform ios --profile production   # cloud build → .ipa
eas submit --platform ios                       # uploads to App Store Connect
```

Fill in the App Store listing (screenshots, description, "What's New") in
App Store Connect. `app.json` already has the bundle ID
`com.fabrod.resalescanner` and the camera permission text — change the name /
bundle ID there before your first production build if you want.

## 6. Costs (honest)

| Item | Cost |
|---|---|
| Apple Developer | $99/yr (you have this) |
| upcitemdb | free trial → paid tier if you exceed 100/day |
| Sold-data API | free tier → ~$9/mo |
| Backend hosting | $0–7/mo (free tiers exist) |
| EAS builds | free tier → paid if you build constantly |

## Verdict math

`profit = resale − (resale × fee%) − shipping − store price`
`margin = profit ÷ store price`

- profit ≥ min profit (default $5) → **BUY**
- profit > $0 → **MAYBE**
- otherwise → **SKIP**

All three inputs (fee %, shipping, min profit) are adjustable in Settings.
