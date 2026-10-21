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

## 1. Run the app locally

```bash
npm install
npx expo start
# scan the QR with Expo Go on your iPhone
```

After changing the entry point, restart Metro with `npx expo start --clear`.
Use Expo Go compatible with this project's Expo SDK 57. The iOS Simulator
can test manual entry; test barcode scanning on a physical device.

Run `npm test` for native iOS scene configuration, startup, scanner lifecycle,
saved history, and verdict regression checks. Run `npx expo export --platform ios` to check the release
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
