# Privacy Policy — Resale Scanner

**Effective date:** October 15, 2026
**Contact:** fabrod035@gmail.com

Resale Scanner ("the app") helps you scan product barcodes in stores, estimate resale value, and draft marketplace listings. This policy explains what information the app touches.

## 1. What the app does with your camera

The app requests camera access solely to scan barcodes while you use the Scanner screen. Barcode detection happens on your device. Camera images and video frames are **not** recorded, stored, or transmitted anywhere.

## 2. What is transmitted

When you scan a barcode or type a product name, the app sends only the product identifier to your app backend so it can return product details and sold-price information:

- **Barcode numbers (UPC/EAN)** are sent to the UPC lookup service (upcitemdb) to identify the product.
- **Product names/queries** are sent to the sold-price service (CompsAPI) to retrieve eBay sold-listing data.

These requests contain no name, email, account, device identifier, or location data. Scan history is never uploaded.

## 3. What stays on your device

Your scan history, verdict settings (fee %, shipping, minimum profit), and app preferences are stored locally on your device only. Clearing the app's data or deleting the app removes them.

## 4. What we do NOT do

- No accounts, no sign-in, no contact collection.
- No analytics, tracking, or advertising SDKs.
- No sale, rental, or sharing of your information with anyone.
- No location tracking.

## 5. Third-party services

The app retrieves product data through the services named in Section 2, via the app's backend. Their own privacy policies apply to data they receive (a barcode number or product query only).

## 6. Children

The app is not directed at children under 13 and collects no personal information from anyone.

## 7. Changes

If this policy changes, the updated version will be posted at this URL with a new effective date.

---

*Draft prepared 2026-10-15 from the actual codebase (camera scanning on-device, AsyncStorage history, no analytics/accounts). Host this file at a public URL and paste the URL into App Store Connect → App Information → Privacy Policy URL.*
