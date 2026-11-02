const { defineConfig } = require('cypress');
const path = require('node:path');

module.exports = defineConfig({
  viewportWidth: 430,
  viewportHeight: 932,
  video: false,
  defaultCommandTimeout: 15000,
  e2e: {
    baseUrl: 'http://localhost:8081',
    supportFile: false,
    specPattern: 'cypress/e2e/*.cy.js',
    setupNodeEvents(on) {
      on('before:browser:launch', (browser, options) => {
        if (browser.family !== 'chromium' || browser.name === 'electron') {
          throw new Error('Camera tests require Chrome or another Chromium browser.');
        }
        options.args.push(
          '--use-fake-device-for-media-stream',
          '--use-fake-ui-for-media-stream',
          `--use-file-for-fake-video-capture=${path.resolve('cypress/fixtures/product-barcode.y4m')}`,
        );
        return options;
      });
    },
  },
});
