import { API_BASE_URL } from './api';

/**
 * Sold-price comps provider.
 *
 * Real automatic comps come from a third-party sold-data API
 * (eBay's official API does not expose sold prices). The key lives
 * on the backend. Until a key is configured, the backend answers
 * 501 and the app falls back to manual entry (user checks the
 * eBay sold tab and types the observed price).
 *
 * Returns { median, count, sales: [{price, title, date}] }
 * or { manual: true } when no provider is configured.
 */
export async function getSoldComps(query) {
  const res = await fetch(
    `${API_BASE_URL}/api/comps?q=${encodeURIComponent(query)}`
  );
  if (res.status === 501) return { manual: true };
  if (!res.ok) throw new Error(`comps request failed (${res.status})`);
  return res.json();
}
