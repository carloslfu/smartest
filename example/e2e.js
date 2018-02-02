const { smartest, contextBuiler } = require('../lib')
const devices = require('puppeteer/DeviceDescriptors')
const iPhone = devices['iPhone 6']

smartest({
  path: 'e2e',
  src: 'app',
  matching: '**/*.e2e.js',
  headless: true, // true by default
  init: async page => {
    await page.emulate(iPhone)
    console.log('\n--- Test suite loaded\n')
  },
  controlTest: async ({ should, page }) => {
    // Load example page
    await should('Load example page (control)', async () => {
      await page.goto('https://example.com')
    })
  },
})
