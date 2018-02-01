const fs = require('fs-jetpack')
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const iPhone = devices['iPhone 6']

const delayMS = ms => new Promise(s => setTimeout(() => s(), ms))

export const smartest = async () => {

  fs.dir('e2e/screenshots', { empty: true })

  let files = fs.find('src', { matching: '**/*.e2e.js' })

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.emulate(iPhone)

  console.log('\n--- Browser Page loaded\n')

  const ctx = contextBuiler('_Test', page)

  // Load example page
  await ctx.should('Load example page (control)', async () => {
    await page.goto('https://example.com')
  })

  // Load all the *.e2e.js files (modules) in the src folder
  for (let i = 0, file; file = files[i]; i++) {
    let name = file
      .split('/').slice(1).join('_')
      .split('.')
    name = name.slice(0, name.length - 2).join('_')
    const ctx = contextBuiler(name, page)
    let mod = require('../' + file)
    console.log(`\nTest: ${file}\n`)
    try {
      await mod(ctx)
    } catch (err) {
      console.error(err)
    }
  }

  await browser.close()

}

// Helpers

export const contextBuiler = (name, page) => {
  let count = 0
  const should = async (msg, fn, takeScreenshots = true) => {
    let prefix = takeScreenshots ? `${count} - ` : '-- '
    try {
      await fn()
      console.log('\x1b[32m%s\x1b[0m', `${prefix}${msg}: DONE`)
      if (takeScreenshots) {
        await page.screenshot({ path: `e2e/screenshots/${name}_${count} - ${msg}.png` })
      }
      // Time guard btween tests
      await delayMS(500)
    } catch (err) {
      console.log('\x1b[31m%s\x1b[0m', `${prefix}${msg}: FAILED`)
      throw err
      // TODO: write logs in a file
    }
    if (takeScreenshots) {
      count++
    }
  }
  return {
    page,
    should,
    prepare: (fn) => should('Prepare', fn, false),
    equal: async (a, b, msg) => {
      if (a !== b) {
        throw (msg ? msg + ': ' : '') + `${a} not equal to ${b}`
      }
    },
    delayMS,
  }
}
