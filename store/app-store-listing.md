# App Store Connect listing — Resale Scanner (draft)

Copy/paste into App Store Connect → App Information + Version Information. Review and adjust tone before submitting.

## App Information

- **Name:** Resale Scanner *(30 chars max — fits)*
- **Primary category:** Shopping
- **Secondary category:** Utilities *(optional)*
- **Content rights:** confirm you own the icon/screenshots

## Version 1.0 information

- **Subtitle (30 chars max):** Scan it. Price it. Profit.
- **Promotional text (170 chars max, editable anytime):**
  Scan any barcode in-store and know in seconds whether it's worth flipping — real eBay sold prices, profit math, and listing copy ready to paste.
- **Description:**
  Resale Scanner turns your phone into a sourcing assistant.

  Scan any product barcode in-store and get an instant BUY / MAYBE / SKIP verdict based on real eBay sold prices — not asking prices — minus your fees, shipping, and minimum profit.

  • Barcode + manual UPC entry for stickered clothing tags
  • Real sold-price comps with true closing values (incl. Best Offer sales)
  • Profit and margin math with your own fee, shipping & profit thresholds
  • Scan history so you never re-check the same item twice
  • One-tap listing drafts for eBay, Poshmark, and Facebook Marketplace

  Built for thrifters, clearance hunters, and resellers who source at Marshalls, TJ Maxx, Target, and everywhere in between.

- **Keywords (100 chars max, comma-separated, no spaces needed):**
  reselling,flip,arbitrage,barcode scanner,upc,ebay,poshmark,sold comps,thrift,profit calculator
- **Support URL:** [your support page or email page]
- **Marketing URL:** [optional]
- **Privacy Policy URL:** [URL where you host store/privacy-policy.md]
- **Copyright:** [your name or company — must match your Apple Developer account]
- **Age rating:** 4+ *(no objectionable content; complete the questionnaire in Connect)*
- **What's New (1.0):** Initial release — scan, verdict, history, and listing drafts.

## Screenshots (App Store Connect → Media)

Ready-made set in `store/screenshots/` (1290×2796 PNG, 6.7" display — accepted for the 6.5"/6.9" slots):

1. `screenshot-1-scanner.png` — "Scan it in the aisle"
2. `screenshot-2-verdict.png` — "Know your profit before you buy"
3. `screenshot-3-listit.png` — "List it in seconds"

Upload order above. Add 1–2 more later from a real device build if you want (History, Settings).

- **App icon:** `assets/icon.png` — 1024×1024 PNG, no transparency, square corners (Apple masks it)

## App Review notes (optional but useful)

> The app requires a backend URL configured at build time. All demo functionality in the submitted build works with the bundled configuration. Camera permission is used only for on-device barcode scanning.

## ⚠️ Decide before the first production build

`app.json` currently uses bundle ID **`com.fabrod.resalescanner`**. A bundle ID **cannot be changed after the first App Store submission** — if you want your own brand/seller name in it, change it in `app.json` (and `eas.json`) *before* running `eas build --platform ios --profile production`.
