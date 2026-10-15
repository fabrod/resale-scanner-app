/**
 * Marketplace deep links + listing copy builder.
 * Direct create-listing routes are used where verified; Poshmark
 * listings are created in-app via its Sell button.
 */
export const MARKETPLACES = [
  {
    id: 'ebay',
    name: 'eBay',
    createUrl: 'https://www.ebay.com/sl/sell',
  },
  {
    id: 'facebook',
    name: 'Marketplace',
    createUrl: 'https://www.facebook.com/marketplace/create/item',
  },
  {
    id: 'poshmark',
    name: 'Poshmark',
    createUrl: 'https://poshmark.com',
    hint: 'Tap Sell in the Poshmark app, then paste.',
  },
];

export function buildListingCopy({ title, brand, resalePrice, storePrice, condition = 'New with tags' }) {
  const price = Number(resalePrice) || 0;
  const lines = [
    title || 'Resale item',
    '',
    `Brand: ${brand || '—'}`,
    `Condition: ${condition}`,
    `Price: $${price.toFixed(2)}`,
    '',
    'Authentic item sourced from a major US retailer. Ships quickly from a smoke-free home. Feel free to ask questions!',
  ];
  return {
    title: `${brand ? brand + ' ' : ''}${title || 'Item'} — $${price.toFixed(2)}`,
    body: lines.join('\n'),
  };
}
