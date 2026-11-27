// The brittle Excalidraw integrations (hidden UI, font registration) against a real
// build in a real browser. Needs `npx playwright install chromium`. Slow (~1–2 min).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { mime } from '../../src/vite.js'

const showcase = fileURLToPath(new URL('../../examples/showcase', import.meta.url))
const bin = fileURLToPath(new URL('../../bin/deck.js', import.meta.url))
const FONTS = ['Liberation Sans', 'Virgil', 'Nunito', 'Cascadia', 'Excalifont']

let server, browser, page
const pageErrors = []

const uiDisplay = () =>
  page.evaluate(() => getComputedStyle(document.querySelector('.layer-ui__wrapper')).display)

before(async () => {
  execFileSync(process.execPath, [bin, 'build'], { cwd: showcase, stdio: 'pipe' })
  const dist = join(showcase, 'dist')
  server = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0])
    const file = join(dist, rel === '/' ? 'index.html' : rel)
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.statusCode = 404
      return res.end()
    }
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : mime(file)
    res.setHeader('content-type', type)
    createReadStream(file).pipe(res)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  browser = await chromium.launch()
  page = await browser.newPage()
  page.on('pageerror', (e) => pageErrors.push(e))
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.waitForSelector('.layer-ui__wrapper', { state: 'attached', timeout: 30_000 })
}, { timeout: 180_000 })

after(async () => {
  await browser?.close()
  server?.close()
})

test('all five font families register and load', { timeout: 60_000 }, async () => {
  await page.waitForFunction(
    (fonts) => fonts.every((f) => document.fonts.check(`32px "${f}"`)),
    FONTS,
    { timeout: 45_000 }
  )
})

test('presenting hides the Excalidraw UI', { timeout: 30_000 }, async () => {
  assert.equal(await uiDisplay(), 'none')
})

test('e enters edit mode (UI visible), e again returns to presenting', { timeout: 30_000 }, async () => {
  await page.keyboard.press('e')
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.layer-ui__wrapper')).display !== 'none', { timeout: 10_000 })
  await page.keyboard.press('e')
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.layer-ui__wrapper')).display === 'none', { timeout: 10_000 })
})

test('keyboard advances and writes the position to the hash', { timeout: 30_000 }, async () => {
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => /^#\d+\.\d+$/.test(location.hash), { timeout: 10_000 })
})

test('editing the hash navigates in place, no reload', { timeout: 30_000 }, async () => {
  // wait out any camera flight from the previous test: the overlay must hold still
  await page.waitForFunction(
    () => {
      const x = document.querySelector('img').getBoundingClientRect().x
      if (window.__settle?.x === x && performance.now() - window.__settle.t > 500) return true
      if (window.__settle?.x !== x) window.__settle = { x, t: performance.now() }
      return false
    },
    { timeout: 15_000, polling: 100 }
  )
  await page.evaluate(() => {
    window.__x = document.querySelector('img').getBoundingClientRect().x
    location.hash = '#5.0'
  })
  // the camera flies to the new slide; the media overlay follows it
  await page.waitForFunction(() => document.querySelector('img').getBoundingClientRect().x !== window.__x, { timeout: 10_000 })
})

test('no page errors, no deck error banner', async () => {
  assert.equal(await page.$('.error'), null)
  assert.deepEqual(pageErrors, [])
})
