# Hosted product lookup diagnosis — October 25, 2026

The hosted backend's 502 is caused by UPCitemdb's exhausted free daily quota.
After deploying safe provider diagnostics, a lookup for EAN `0049000028911`
returned:

```json
{
  "error": "lookup failed",
  "provider": "upcitemdb",
  "reason": "upstream_failure",
  "upstreamStatus": 429,
  "rateLimitRemaining": 0,
  "rateLimitReset": 1793007087,
  "upstreamCode": "EXCEED_LIMIT"
}
```

The provider documents `EXCEED_LIMIT` as exceeding the daily request limit.
Its free tier uses a quota primarily per IP; paid plans use application quotas.
Render uses shared outbound addresses, which may explain why the hosted quota
is exhausted while the laptop's direct request succeeds. Shared use is a
plausible contributor, not independently proven consumption by other services.

The provider's reported reset is **Monday, October 26, 2026 at 5:31:27 AM EDT**.
Waiting may restore free access temporarily; it does not resolve production
capacity. No further requests should be sent just to repeat the known failure.

The current Render configuration has `SOLD_API_KEY` and no `UPCITEMDB_KEY`.
Adding a purchased UPCitemdb key as `UPCITEMDB_KEY` selects the authenticated
lookup endpoint automatically. As checked on October 25, the official DEV
plan is $99/month with 20,000 lookups/day. No subscription was purchased.
Caching can reduce repeated requests but cannot restore uncached lookups once
the current quota is exhausted.

Backend-only commits were published and deployed on Render:

- `944176438cae9ab41b8101d158f3e7a2002a014e`: safe upstream diagnostics, request
  timeout, local env loading, localhost CORS, backend dependency lock and tests.
- `8c9bfa8774fd5548bc09745eef536ffe2c580e4e`: pin Node to tested version 24.18.0.

All 19 regression tests passed before deployment. Render reports the final
commit live; `/health` returns HTTP 200. The successful product response shape
is unchanged, and sold-comps code matches its prior implementation. Diagnostic
fields are allowlisted; API keys, raw provider messages, URLs and response
bodies are excluded.

No mobile files or Cypress files were published in those commits. No new iOS
build was uploaded, and no App Store Connect submission was edited. Apple uses
the live backend during review, so the existing quota failure can affect
product identification even though the submitted binary remains unchanged.

Sources:

- [UPCitemdb quota rules](https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/)
- [UPCitemdb error meanings](https://www.upcitemdb.com/wp/docs/main/development/responses/)
- [UPCitemdb API plans](https://www.upcitemdb.com/api/)
- [Render outbound addresses](https://render.com/docs/outbound-ip-addresses)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
