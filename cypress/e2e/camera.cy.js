const product = { title: 'Diet Coke Soda Soft Drink, 12 fl oz, 12 Pack', brand: 'Diet Coke', image: null };
const barcodePattern = /\/api\/lookup\?upc=0?049000028911$/;

function openScanner(options = {}) {
  cy.visit('/', options);
  // Depending on the existing browser permission, Expo may first show this button.
  cy.contains(/Continue|Point at the product barcode|Looking up product/).should('be.visible');
  cy.get('body').then(($body) => {
    if ($body.text().includes('Continue')) cy.contains('Continue').click();
  });
}

describe('camera barcode flow (real video and decoder, controlled API responses)', () => {
  it('decodes the barcode, looks it up once, calculates profit and saves history', () => {
    cy.intercept('GET', '**/api/lookup?*', { statusCode: 200, body: product, delay: 700 }).as('lookup');
    openScanner();
    cy.wait('@lookup').then(({ request }) => expect(request.url).to.match(barcodePattern));
    cy.contains(product.title).should('be.visible');
    cy.get('video').should('not.exist');
    cy.get('@lookup.all').should('have.length', 1);
    cy.get('input[placeholder="0.00"]').eq(0).type('10');
    cy.get('input[placeholder="0.00"]').eq(1).type('30');
    cy.contains('Run the numbers').click();
    cy.contains('BUY').should('be.visible');
    cy.contains('Profit: $16.02').should('be.visible');
    cy.contains('[dir="auto"]:visible', /^History$/).click();
    cy.contains('Scan history').should('be.visible');
    cy.contains('[dir="auto"]:visible', product.title).should('be.visible');
    cy.screenshot('camera-product-verdict-history');
  });

  it('releases the camera on navigation and scans again after returning', () => {
    cy.intercept('GET', '**/api/lookup?*', { statusCode: 200, body: product }).as('lookup');
    openScanner();
    cy.wait('@lookup');
    cy.contains(product.title).should('be.visible');
    cy.get('video').should('not.exist');
    cy.get('[aria-label*="back" i]').filter(':visible').first().click();
    cy.wait('@lookup').then(({ request }) => expect(request.url).to.match(barcodePattern));
    cy.contains(product.title).should('be.visible');
    cy.get('@lookup.all').should('have.length', 2);
  });

  it('keeps the price check usable when the lookup API fails', () => {
    cy.intercept('GET', '**/api/lookup?*', { statusCode: 502, body: { error: 'lookup failed' } }).as('lookup');
    openScanner();
    cy.wait('@lookup');
    cy.contains('Unknown product').should('be.visible');
    cy.contains('Product not found in the catalog').should('be.visible');
    cy.get('input[placeholder="0.00"]').should('have.length', 2);
  });

  it('allows manual UPC entry when camera permission is denied', () => {
    cy.intercept('GET', '**/api/lookup?*', { statusCode: 200, body: product }).as('lookup');
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win.navigator.permissions, 'query').callsFake(async () => ({ state: 'denied' }));
        cy.stub(win.navigator.mediaDevices, 'getUserMedia').rejects(new win.DOMException('Permission denied', 'NotAllowedError'));
      },
    });
    cy.contains('Camera access is turned off').should('be.visible');
    cy.get('video').should('not.exist');
    cy.contains('Enter manually instead').click();
    cy.get('input[placeholder="e.g. 012345678905"]').type('049000028911');
    cy.contains('Look up UPC').click();
    cy.wait('@lookup').then(({ request }) => expect(request.url).to.include('upc=049000028911'));
    cy.contains(product.title).should('be.visible');
  });
});
