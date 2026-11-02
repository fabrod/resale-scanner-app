// Explicit live check: point Expo's EXPO_PUBLIC_API_URL at this hosted backend.
// A complete run sends one UPC lookup and one sold-comps request. API responses
// are never replaced; browser clipboard and window.open are stubbed for handoffs.
const HOSTED_API_ORIGIN = 'https://resale-scanner-app.onrender.com';
const MANUAL_PRODUCT = 'Nike Air Force 1';
const VISIBLE_TEXT = '[dir="auto"]:visible';
// Recheck browser-only workflow changes without consuming provider quota again.
const providerTest = Cypress.expose('workflowOnly') ? it.skip : it;

function enterManualProduct() {
  cy.visit('/', {
    onBeforeLoad(win) {
      // Avoid an incidental barcode lookup in tests of manual entry and comps.
      const queryPermission = win.navigator.permissions.query.bind(win.navigator.permissions);
      cy.stub(win.navigator.permissions, 'query').callsFake((descriptor) => descriptor.name === 'camera'
        ? Promise.resolve({ state: 'denied' })
        : queryPermission(descriptor));
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').rejects(new win.DOMException('Permission denied', 'NotAllowedError'));
      cy.stub(win, 'open').as('externalOpen');
      cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboardWrite');
    },
  });
  cy.contains('Camera access is turned off').should('be.visible');
  cy.contains('Enter manually instead').click();
  cy.get('input[placeholder="e.g. Nike"]').type('Nike');
  cy.get('input[placeholder="e.g. Dri-FIT polo shirt navy M"]').type('Air Force 1');
  cy.contains(VISIBLE_TEXT, /^Continue$/).click();
  cy.contains(VISIBLE_TEXT, MANUAL_PRODUCT).should('be.visible');
  cy.get('video').should('not.exist');
}

describe('hosted API and product workflow', { retries: 0 }, () => {
  providerTest('identifies a real product from camera video through the hosted lookup API', () => {
    let lookupRequests = 0;
    cy.intercept('GET', '**/api/lookup?*', (request) => {
      expect(new URL(request.url).origin, 'lookup backend').to.equal(HOSTED_API_ORIGIN);
      lookupRequests += 1;
      if (lookupRequests > 1) {
        request.destroy();
        throw new Error('A single camera scan must not consume multiple UPC lookups.');
      }
      request.continue();
    }).as('liveLookup');
    cy.visit('/');
    cy.contains(/Continue|Point at the product barcode|Looking up product|Worth it\?/).should('be.visible');
    cy.get('body').then(($body) => {
      if ($body.text().includes('Continue')) cy.contains('Continue').click();
    });
    cy.wait('@liveLookup', { timeout: 45000 }).then(({ request, response }) => {
      const url = new URL(request.url);
      expect(url.origin).to.equal(HOSTED_API_ORIGIN);
      expect(url.searchParams.get('upc')).to.match(/^0?049000028911$/);
      expect(response, 'hosted lookup response').to.exist;
      expect(response.statusCode, JSON.stringify(response.body)).to.equal(200);
      expect(response.body.title).to.match(/Diet\s*Coke/i);
    });
    cy.contains(VISIBLE_TEXT, /Diet\s*Coke/i).should('be.visible');
    cy.contains('Product not found in the catalog').should('not.exist');
    cy.get('video').should('not.exist');
    cy.get('@liveLookup.all').should('have.length', 1);
    cy.screenshot('live-camera-api-product');
  });

  providerTest('requests automatic sold comps once from the hosted API and applies its median', () => {
    let compsRequests = 0;
    cy.intercept('GET', '**/api/comps?*', (request) => {
      expect(new URL(request.url).origin, 'sold-comps backend').to.equal(HOSTED_API_ORIGIN);
      compsRequests += 1;
      if (compsRequests > 1) {
        request.destroy();
        throw new Error('Only one live sold-comps request is allowed per test run.');
      }
      request.continue();
    }).as('liveComps');
    enterManualProduct();
    cy.contains(VISIBLE_TEXT, /^Auto comps$/).click();
    cy.wait('@liveComps', { timeout: 45000 }).then(({ request, response }) => {
      const url = new URL(request.url);
      expect(url.origin).to.equal(HOSTED_API_ORIGIN);
      expect(url.searchParams.get('q')).to.equal(MANUAL_PRODUCT);
      expect(response, 'hosted sold-comps response').to.exist;
      expect(response.statusCode, JSON.stringify(response.body)).to.equal(200);
      expect(response.body.count, 'number of comparable sales').to.be.a('number').and.to.be.at.least(0);
      expect(Number.isInteger(response.body.count)).to.equal(true);
      expect(response.body.sales).to.be.an('array');
      expect(response.body.sales.length).to.be.at.most(response.body.count);
      if (response.body.count > 0) {
        expect(response.body.median, 'sold-price median').to.be.a('number').and.to.be.greaterThan(0);
        expect(Number.isFinite(response.body.median)).to.equal(true);
        cy.get('input[placeholder="0.00"]').eq(1).should('have.value', String(response.body.median));
      } else {
        expect(response.body.median, 'no median without sold records').to.equal(null);
        cy.get('input[placeholder="0.00"]').eq(1).should('have.value', '');
        cy.log('Sold provider responded successfully with no comparable sales.');
      }
    });
    cy.get('@liveComps.all').should('have.length', 1);
    cy.screenshot('live-sold-comps');
  });

  it('calculates profit, saves history and prepares marketplace listing handoffs', () => {
    enterManualProduct();
    cy.get('input[placeholder="0.00"]').eq(0).type('10');
    cy.get('input[placeholder="0.00"]').eq(1).type('30');
    cy.contains(VISIBLE_TEXT, /^Run the numbers$/).click();
    cy.contains(VISIBLE_TEXT, /^BUY$/).should('be.visible');
    cy.contains(VISIBLE_TEXT, 'Profit: $16.02').should('be.visible');
    cy.contains(VISIBLE_TEXT, /^History$/).click();
    cy.contains('Scan history').should('be.visible');
    cy.contains(VISIBLE_TEXT, MANUAL_PRODUCT).should('be.visible');
    cy.contains(VISIBLE_TEXT, /Store \$10\.00 → Resale \$30\.00/).should('be.visible');
    cy.screenshot('live-product-history');

    cy.get('[aria-label*="back" i]').filter(':visible').first().click();
    cy.contains(VISIBLE_TEXT, /^Check eBay sold$/).click();
    cy.get('@externalOpen').should('have.been.calledOnce').its('firstCall.args.0').then((value) => {
      const url = new URL(value);
      expect(url.origin).to.equal('https://www.ebay.com');
      expect(url.searchParams.get('_nkw')).to.equal(MANUAL_PRODUCT);
      expect(url.searchParams.get('LH_Sold')).to.equal('1');
      expect(url.searchParams.get('LH_Complete')).to.equal('1');
    });
    cy.contains(VISIBLE_TEXT, 'List it for sale →').click();
    cy.contains(VISIBLE_TEXT, /^Your listing$/).should('be.visible');
    cy.get('textarea:visible').should('have.value', MANUAL_PRODUCT);
    cy.get('input:visible').eq(0).should('have.value', '30');
    cy.get('input:visible').eq(1).should('have.value', 'New with tags');
    cy.contains(VISIBLE_TEXT, /Condition: New with tags/).should('be.visible');
    cy.contains(VISIBLE_TEXT, /Price: \$30\.00/).should('be.visible');
    cy.contains(VISIBLE_TEXT, /^Copy for eBay$/).click();
    cy.get('@clipboardWrite').should('have.been.calledOnce').its('firstCall.args.0').then((copy) => {
      expect(copy).to.include(MANUAL_PRODUCT);
      expect(copy).to.include('Condition: New with tags');
      expect(copy).to.include('Price: $30.00');
    });

    const marketplaceUrls = [
      'https://www.ebay.com/sl/sell',
      'https://www.facebook.com/marketplace/create/item',
      'https://poshmark.com/',
    ];
    cy.get(VISIBLE_TEXT).filter((_index, element) => element.textContent === 'Open').should('have.length', 3);
    marketplaceUrls.forEach((url, index) => {
      cy.get(VISIBLE_TEXT).filter((_index, element) => element.textContent === 'Open').eq(index).click();
      cy.get('@externalOpen').its('lastCall.args.0').should('equal', url);
    });
    cy.get('@externalOpen').should('have.callCount', 4);
    cy.contains(VISIBLE_TEXT, /^Your listing$/).should('be.visible');
    cy.screenshot('live-product-listing-handoffs');
  });
});
