/**
 * Resale Scanner backend — the API-key proxy.
 *
 * Why this exists: API keys (sold-data provider, paid UPC tiers)
 * must never live inside the mobile app, where anyone can extract
 * them. The app talks to these endpoints; this server talks to the
 * paid providers with the keys from environment variables.
 *
 * Endpoints:
 *   GET /api/lookup?upc=XXXX   → product title/brand/image
 *   GET /api/comps?q=QUERY     → sold-price comps, or 501 when no
 *                                sold-data provider is configured
 *                                (app then falls back to manual entry)
 */

const express = require('express');
const path = require('node:path');

function loadLocalEnvironment(filename = path.join(__dirname, '.env')) {
  try {
    // Existing deployment environment variables take precedence over .env.
    process.loadEnvFile(filename);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

loadLocalEnvironment();

const app = express();
const PORT = process.env.PORT || 3001;

const UPCITEMDB_KEY = process.env.UPCITEMDB_KEY || ''; // paid tier key; empty = free trial endpoint

// Sold-price data: CompsAPI (https://compsapi.com) — eBay sold listings
// with true closing prices on Best Offer sales. Free key: 100 req/month,
// no card: https://app.compsapi.com. Paid plans from $9.
const SOLD_API_KEY = process.env.SOLD_API_KEY || '';
const SOLD_API_URL = process.env.SOLD_API_URL || 'https://api.compsapi.com';
const configuredOrigins = new Set((process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean));
const PROVIDER_TIMEOUT_MS = 12000;
const UPC_ERROR_CODES = new Set(['AUTH_ERR', 'EXCEED_LIMIT', 'TOO_FAST']);
const NETWORK_ERROR_CODES = new Set([
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
  'ENETUNREACH', 'EHOSTUNREACH', 'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID', 'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
]);

app.use((req, res, next) => {
  const origin = req.get('Origin');
  res.vary('Origin');
  if (origin && (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin) || configuredOrigins.has(origin))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

async function fetchProviderJson(provider, url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
    if (!response.ok) {
      const error = new Error('upstream response failed');
      error.safeUpstreamDetails = {};
      if (provider === 'upcitemdb') {
        // Only documented error codes and numeric quota metadata are retained.
        // Provider messages may contain account information, so never log them.
        for (const [header, field] of [
          ['x-ratelimit-remaining', 'rateLimitRemaining'],
          ['x-ratelimit-reset', 'rateLimitReset'],
        ]) {
          const value = response.headers.get(header);
          if (value !== null && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) {
            error.safeUpstreamDetails[field] = Number(value);
          }
        }
        const body = await response.json().catch(() => null);
        if (UPC_ERROR_CODES.has(body?.code)) error.safeUpstreamDetails.upstreamCode = body.code;
      }
      throw error;
    }
    return await response.json();
  } catch (error) {
    // Never include provider URLs, response bodies or authorization headers.
    const timeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    const diagnostic = { provider, reason: timeout ? 'timeout' : 'upstream_failure' };
    if (response) diagnostic.upstreamStatus = response.status;
    Object.assign(diagnostic, error.safeUpstreamDetails);
    const networkCode = [error.cause?.code, error.code].find((code) => NETWORK_ERROR_CODES.has(code));
    if (networkCode) diagnostic.networkCode = networkCode;
    console.warn('Provider request failed', diagnostic);
    const failure = new Error('provider request failed');
    failure.status = timeout ? 504 : 502;
    failure.diagnostic = diagnostic;
    throw failure;
  }
}

function sendProviderFailure(res, error, message) {
  res.status(error.status || 502).json({ error: message, ...error.diagnostic });
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Privacy policy (public page for the App Store listing) ------------------
app.get('/privacy', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — Resale Scanner</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1a1a2e}h1{font-size:28px}h2{font-size:20px;margin-top:28px}ul{padding-left:20px}</style>
</head><body>
<h1>Privacy Policy — Resale Scanner</h1>
<p><strong>Effective date:</strong> October 15, 2026<br><strong>Contact:</strong> fabrod035@gmail.com</p>
<p>Resale Scanner ("the app") helps you scan product barcodes in stores, estimate resale value, and draft marketplace listings. This policy explains what information the app touches.</p>
<h2>1. What the app does with your camera</h2>
<p>The app requests camera access solely to scan barcodes while you use the Scanner screen. Barcode detection happens on your device. Camera images and video frames are <strong>not</strong> recorded, stored, or transmitted anywhere.</p>
<h2>2. What is transmitted</h2>
<p>When you scan a barcode or type a product name, the app sends only the product identifier to the app backend so it can return product details and sold-price information:</p>
<ul>
<li><strong>Barcode numbers (UPC/EAN)</strong> are sent to the UPC lookup service (upcitemdb) to identify the product.</li>
<li><strong>Product names/queries</strong> are sent to the sold-price service (CompsAPI) to retrieve eBay sold-listing data.</li>
</ul>
<p>These requests contain no name, email, account, device identifier, or location data. Scan history is never uploaded.</p>
<h2>3. What stays on your device</h2>
<p>Your scan history, verdict settings (fee %, shipping, minimum profit), and app preferences are stored locally on your device only. Clearing the app's data or deleting the app removes them.</p>
<h2>4. What we do NOT do</h2>
<ul>
<li>No accounts, no sign-in, no contact collection.</li>
<li>No analytics, tracking, or advertising SDKs.</li>
<li>No sale, rental, or sharing of your information with anyone.</li>
<li>No location tracking.</li>
</ul>
<h2>5. Third-party services</h2>
<p>The app retrieves product data through the services named in Section 2, via the app's backend. Their own privacy policies apply to data they receive (a barcode number or product query only).</p>
<h2>6. Children</h2>
<p>The app is not directed at children under 13 and collects no personal information from anyone.</p>
<h2>7. Changes</h2>
<p>If this policy changes, the updated version will be posted at this URL with a new effective date.</p>
</body></html>`);
});

// --- UPC → product ---------------------------------------------------------
app.get('/api/lookup', async (req, res) => {
  const upc = String(req.query.upc || '').replace(/\D/g, '');
  if (!upc) return res.status(400).json({ error: 'missing upc' });

  try {
    const endpoint = UPCITEMDB_KEY
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${upc}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`;
    const headers = UPCITEMDB_KEY ? { user_key: UPCITEMDB_KEY, key_type: '3scale' } : {};
    const data = await fetchProviderJson('upcitemdb', endpoint, { headers });
    const item = data.items && data.items[0];
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({
      title: item.title || '',
      brand: item.brand || '',
      image: (item.images && item.images[0]) || null,
    });
  } catch (e) {
    sendProviderFailure(res, e, 'lookup failed');
  }
});

// --- Sold-price comps --------------------------------------------------------
// CompsAPI: GET {SOLD_API_URL}/v1/sold?q=...&days=90&size=60&best_offer=1
// with `Authorization: Bearer <key>`.
// Response items carry { title, price, best_offer, last_sold, ... } where
// price is the TRUE closing price even on accepted Best Offer sales.
// We compute the median ourselves from documented fields so the app
// never depends on undocumented response shapes.
async function fetchSoldComps(query) {
  const params = new URLSearchParams({ q: query, days: '90', size: '60', best_offer: '1' });
  const r = await fetch(`${SOLD_API_URL}/v1/sold?${params}`, {
    headers: { Authorization: `Bearer ${SOLD_API_KEY}` },
  });
  if (!r.ok) throw new Error(`sold-data provider error ${r.status}`);
  const data = await r.json();
  const items = (data.items || []).filter((i) => typeof i.price === 'number');
  if (!items.length) return { median: null, count: 0, sales: [] };
  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return {
    median: Math.round(median * 100) / 100,
    count: data.count ?? items.length,
    sales: items.slice(0, 10).map((i) => ({
      price: i.price,
      title: i.title,
      date: i.last_sold,
      bestOffer: !!i.best_offer,
    })),
  };
}

app.get('/api/comps', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing q' });
  if (!SOLD_API_KEY) {
    // No provider key configured → the app falls back to manual entry.
    return res.status(501).json({ manual: true });
  }
  try {
    res.json(await fetchSoldComps(q));
  } catch (e) {
    res.status(502).json({ error: 'comps failed' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`resale-scanner backend on :${PORT}`));
}

module.exports = { app, loadLocalEnvironment };
