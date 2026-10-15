import { API_BASE_URL } from './api';

/**
 * Identify a product from a UPC/EAN barcode.
 * Goes through our backend proxy so API keys (and future paid tiers)
 * stay server-side. Backend falls back to the free upcitemdb trial tier.
 *
 * Returns { title, brand, image } or null when unknown.
 */
export async function lookupUpc(upc) {
  const code = String(upc || '').replace(/\D/g, '');
  if (!code) return null;

  const res = await fetch(
    `${API_BASE_URL}/api/lookup?upc=${encodeURIComponent(code)}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.title) return null;
  return {
    title: data.title,
    brand: data.brand || '',
    image: data.image || null,
  };
}

/** eBay "sold listings" search URL for manual comp checks. */
export function ebaySoldUrl(query) {
  const q = encodeURIComponent(query);
  return `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
}
