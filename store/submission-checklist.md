# Store-readiness checklist — Resale Scanner

Status as of 2026-10-15 12:35 EDT. Your three moves from chat, plus the submission prep already done for you.

## Your moves

1. **CompsAPI key** — free at https://app.compsapi.com · **100 requests/month, no card required** (verified 2026-10-15 against CompsAPI's own docs and client examples; paid plans from $9/mo). Put it in the backend `.env` as `SOLD_API_KEY`, redeploy the backend — the app's "Auto comps" button starts returning real sold medians with no app update.
2. **Reconnect GitHub** — say the word, get the secure link, push (2 local commits ready, working tree clean).
3. **EAS build + submit** — `eas build --platform ios --profile production`, then `eas submit`. Apple ID typed in *your* terminal only.

Plus one backend deploy first: any Node host (Render/Railway/Fly), then set the public URL as `EXPO_PUBLIC_API_URL` in `eas.json`'s production profile (currently a placeholder).

## Already prepared for you (in `store/`)

- **privacy-policy.md** — draft matching the actual codebase: camera frames processed on-device (never transmitted), barcode numbers → upcitemdb, product queries → CompsAPI, history/settings in on-device AsyncStorage, no accounts/analytics/ads. Needs: effective date + support email, then host at a public URL and paste into App Store Connect → Privacy Policy URL (required before submission).
- **app-store-listing.md** — copy/paste draft: name, subtitle, description, keywords (100-char compliant), category (Shopping), age rating (4+), 6.9" screenshot specs (1290×2796 or 1320×2868 required; icon 1024×1024 PNG).
- **App Review note** included in the listing draft (backend URL is build-time config; camera is on-device scanning only).

## Decide before first production build ⚠️

Bundle ID is `com.fabrod.resalescanner` — **cannot be changed after the first submission**. Rename in `app.json` + `eas.json` first if you want your own brand.

## After the build

TestFlight internal test → submit for review in App Store Connect → typically 24–48h review. Export compliance: the app uses only standard HTTPS, so answer "No" to the encryption question (standard exemption).
