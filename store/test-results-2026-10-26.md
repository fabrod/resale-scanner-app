# Production API and app workflow checks — October 26, 2026

Testing finished against the local web app at `http://localhost:8082`, built
with `EXPO_PUBLIC_API_URL=https://resale-scanner-app.onrender.com`. The live
tests assert that API requests reach that hosted origin. The camera uses a
generated barcode video through Chrome's camera stream and Expo's actual
decoder. This does not constitute a physical iPhone or installed TestFlight test.

| Check | Result |
| --- | --- |
| Camera decoding, one lookup and calculation/history with controlled API responses | Passed |
| Camera release on navigation and repeat scan | Passed |
| API failure fallback retains manual price check | Passed |
| Manual UPC entry after denied camera permission | Passed |
| Actual hosted barcode identification | Failed: upstream daily quota exhausted |
| Actual hosted automatic sold comps and resale-price field update | Passed: Nike Air Force 1 median $64.12 |
| Manual product calculation, saved history, listing copy and marketplace handoffs | Passed |

The manual calculation used store price $10 and resale $30 and displayed BUY,
profit $16.02. Saved history included the same product and prices. The listing
screen retained title, $30 asking price and condition. The copy handler supplied
those details to the browser clipboard stub. eBay sold search and the eBay,
Facebook Marketplace and Poshmark handoff URLs were verified using a browser
window-open stub. No external listing was published and no real clipboard
content was overwritten by the test.

The first Cypress run passed five of seven tests. The live UPC test failed
because production returned the error below. The listing test initially hit
an unsupported test selector; its selector was corrected and that workflow
was rerun successfully with both provider tests skipped to avoid consuming
more quota. Final outcomes across the checks: six passed, one provider-blocked.

The hosted product lookup for EAN `0049000028911` returned HTTP 502 with:

```json
{
  "provider": "upcitemdb",
  "upstreamStatus": 429,
  "upstreamCode": "EXCEED_LIMIT",
  "rateLimitRemaining": 0,
  "rateLimitReset": 1793093592
}
```

The provider reports the next reset as **Tuesday, October 27, 2026 at 5:33 AM
Eastern**. This is a reported reset, not a guarantee of future availability.
The October 26 reset did not provide usable quota at the time of testing.
The user confirmed the app still uses the free daily quota. The diagnostic
response confirms the current remaining quota is zero; it does not identify
which callers consumed it. The backend health endpoint returned HTTP 200.

Quota use for this session: one direct hosted lookup, one Cypress hosted lookup
(both rejected), and one successful hosted sold-comps request. Controlled tests
stubbed lookup responses. The workflow rerun made no provider calls.

One existing cosmetic issue was found: the listing preview/clipboard heading
can duplicate the brand, for example `Nike Nike Air Force 1`. It was recorded
without changing the mobile app while the submitted build is in review.

Only local test/documentation files were updated in this session. No production
deploy, app binary upload, App Store Connect edit or marketplace post was made.
The previously deployed backend commit remains `8c9bfa8`.

Commands used:

```bash
node scripts/generate-camera-fixture.cjs
env -u ELECTRON_RUN_AS_NODE CYPRESS_CACHE_FOLDER=/tmp/resale-scanner-cypress npx cypress run --browser chrome --config baseUrl=http://localhost:8082,screenshotsFolder=cypress/screenshots/production-2026-10-26
env -u ELECTRON_RUN_AS_NODE CYPRESS_CACHE_FOLDER=/tmp/resale-scanner-cypress npx cypress run --browser chrome --spec cypress/e2e/live-api.cy.js --expose workflowOnly=true --config baseUrl=http://localhost:8082,screenshotsFolder=cypress/screenshots/workflow-2026-10-26
```
