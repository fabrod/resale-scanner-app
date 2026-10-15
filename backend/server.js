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

const app = express();
const PORT = process.env.PORT || 3001;

const UPCITEMDB_KEY = process.env.UPCITEMDB_KEY || ''; // paid tier key; empty = free trial endpoint

// Sold-price data: CompsAPI (https://compsapi.com) — eBay sold listings
// with true closing prices on Best Offer sales. Free key: 100 req/month,
// no card: https://app.compsapi.com. Paid plans from $9.
const SOLD_API_KEY = process.env.SOLD_API_KEY || '';
const SOLD_API_URL = process.env.SOLD_API_URL || 'https://api.compsapi.com';

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- UPC → product ---------------------------------------------------------
app.get('/api/lookup', async (req, res) => {
  const upc = String(req.query.upc || '').replace(/\D/g, '');
  if (!upc) return res.status(400).json({ error: 'missing upc' });

  try {
    const endpoint = UPCITEMDB_KEY
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${upc}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`;
    const headers = UPCITEMDB_KEY ? { user_key: UPCITEMDB_KEY, key_type: '3scale' } : {};
    const r = await fetch(endpoint, { headers });
    if (!r.ok) return res.status(502).json({ error: 'lookup failed' });
    const data = await r.json();
    const item = data.items && data.items[0];
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json({
      title: item.title || '',
      brand: item.brand || '',
      image: (item.images && item.images[0]) || null,
    });
  } catch (e) {
    res.status(502).json({ error: 'lookup failed' });
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

app.listen(PORT, () => console.log(`resale-scanner backend on :${PORT}`));
