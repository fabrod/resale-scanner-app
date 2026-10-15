/**
 * Verdict engine: pure functions, no I/O.
 * storePrice  - what the store charges (e.g. Marshalls price)
 * resalePrice - observed/anticipated resale price (sold comps)
 * feePct      - marketplace fee percent (eBay ~13.25%)
 * shippingCost- what you pay to ship it to the buyer
 * minProfit   - your personal "worth it" threshold in dollars
 */
export function computeVerdict({
  storePrice,
  resalePrice,
  feePct = 13.25,
  shippingCost = 0,
  minProfit = 5,
}) {
  const store = Number(storePrice) || 0;
  const resale = Number(resalePrice) || 0;
  const feeRate = Number(feePct) || 0;
  const ship = Number(shippingCost) || 0;
  const threshold = Number(minProfit) || 0;

  const fees = resale * (feeRate / 100);
  const net = resale - fees - ship;
  const profit = net - store;
  const margin = store > 0 ? (profit / store) * 100 : 0;

  const verdict = profit >= threshold ? 'BUY' : profit > 0 ? 'MAYBE' : 'SKIP';

  return { profit, margin, fees, net, verdict };
}

export const VERDICT_COLORS = {
  BUY: '#16a34a',
  MAYBE: '#ca8a04',
  SKIP: '#dc2626',
};

export function formatMoney(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}
