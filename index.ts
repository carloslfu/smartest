const path = require('path')
const fs = require('fs-jetpack')
import { launch, Page } from 'puppeteer'

const delayMS = ms => new Promise(s => setTimeout(() => s(), ms))

export interface SmartestOptions {
  /** Output folder path */
  path: string
  /** Source folder path */
  src: string
  /** Pattern for files (glob) */
  matching: string
  /** Run test in a headless Chrome (Puppeteer). Default true */
  headless?: boolean
  /** Suite initialization */
  init: {
    (page: Page): Promise<void>
  }
  /** Control test */
  controlTest?: {
    (ctx: Context): Promise<void>
  }
}

export  interface SmartestBuilder {
  (options: SmartestOptions): Promise<void>
}

/** Context contain Puppeter page instance and some helpers */
export interface Context {
  page
  should: { (msg: string, fn: ImperativeAsyncFn, takeScreenshots?: boolean): Promise<void> }
  prepare: { (fn: ImperativeAsyncFn): Promise<void> }
  equal: { (a, b, msg: string): Promise<void> }
  delayMS: { (ms: number): Promise<any> }
}

export interface ImperativeAsyncFn {
  (): Promise<void>
}

/** Module contains a set of tests */
export interface ModuleFn {
  (ctx: Context): Promise<void>
}

export const smartest: SmartestBuilder = async opts => {

  fs.dir(path.join(opts.path, 'screenshots'), { empty: true })

  let files = fs.find(opts.src, { matching: opts.matching })

  const headless = opts.hasOwnProperty('headless') ? opts.headless : true

  const browser = await launch({ headless })

  const page = await browser.newPage()
  if (opts.init) {
    await opts.init(page)
  } else {
    console.log('\n--- Smartest suite loaded\n')
  }

  if (opts.controlTest) {
    const ctx = contextBuiler('_ Control Test', page)
    await opts.controlTest(ctx)
  }

  // Loads all the matching files (modules) in the src folder
  for (let i = 0, file; file = files[i]; i++) {
    let name = file
      .split('/').slice(1).join('_')
      .split('.')
    name = name.slice(0, name.length - 2).join('_')
    const ctx = contextBuiler(name, page)
    let mod: ModuleFn = require(path.join(process.cwd(), file))
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

export const contextBuiler = (name: string, page: Page): Context => {
  let count = 0
  const should = async (msg: string, fn, takeScreenshots = true) => {
    let prefix = takeScreenshots ? `${count} - ` : '-- '
    try {
      await fn()
      console.log('\x1b[32m%s\x1b[0m', `${prefix}${msg}: PASS`)
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
