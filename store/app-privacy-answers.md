# App Privacy answers — Resale Scanner

Fill these into App Store Connect → App Privacy when submitting. Prepared from the actual codebase (2026-10-15).

## Do you collect data from this app? → **No**

- No accounts, no sign-in, no analytics, no advertising SDKs.
- Camera frames are processed on-device for barcode detection only; nothing is recorded, stored, or transmitted.
- Scan history, settings, and preferences live in on-device storage (AsyncStorage) only and are never uploaded.
- Barcode numbers and product-name queries are sent to the app's own backend solely to return product/sold-price results. They contain no name, email, account, device ID, or location, and are not linked to the user. Under Apple's definitions this is not "collection" because the data is not linked to the user's identity and is not used for tracking.

If the reviewer asks about the backend calls, point them at the privacy policy section 2, which names the two services (UPC lookup, sold-price comps) and states exactly what is sent.

## Data types

None — answer "No" to collection for every category (Contact Info, Identifiers, Usage Data, Diagnostics, etc.).

## Tracking

**No** — the app does not track users across apps or websites.

## Third-party SDKs

None embedded in the app binary. (The backend, not the app, calls UPCitemdb and CompsAPI.)
