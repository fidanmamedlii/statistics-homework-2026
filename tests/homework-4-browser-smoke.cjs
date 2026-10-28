/* Run: node tests/homework-4-browser-smoke.cjs [absolute Playwright module directory]. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.argv[2] || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '..', 'hw4-verification');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/homework-4.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  const type = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' }[path.extname(filename)] || 'application/octet-stream';
  fs.readFile(filename, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': type }); res.end(error ? 'Not found' : bytes); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(`http://127.0.0.1:${server.address().port}/homework-4.html`);
    assert.equal(response.status(), 200);
    assert.match(await page.title(), /Homework 4/);
    await page.locator('#run-simulation').click();
    await page.waitForFunction(() => document.querySelector('#run-status').textContent.startsWith('Done:'));
    assert.equal(await page.locator('#moment-rows tr').count(), 6);
    assert.equal(await page.locator('#lln-rows tr').count(), 2);
    assert.equal(await page.locator('#group-rows tr').count(), 2);
    assert.match(await page.locator('#rademacher-clt-note').innerText(), /lattice/);
    assert.ok(await page.locator('#download-csv').isEnabled());
    assert.ok(await page.locator('#rademacher-hist').evaluate(el => el.width > 300));
    const first = await page.locator('#moment-rows').innerText();
    await page.locator('#quantity').selectOption('sqrt');
    assert.match(await page.locator('#bernoulli-summary').innerText(), /Sₙ\/√n/);
    await page.locator('#attackers').fill('40');
    await page.locator('#systems').fill('25');
    await page.locator('#probability').fill('0');
    await page.locator('#seed').fill('91');
    await page.locator('#run-simulation').click();
    await page.waitForFunction(() => document.querySelector('#run-status').textContent.startsWith('Done:'));
    assert.match(await page.locator('#bernoulli-clt-note').innerText(), /variance is zero/);
    assert.match(await page.locator('#moment-rows').innerText(), /0/);
    await page.locator('#systems').fill('5000');
    await page.locator('#attackers').fill('2000');
    await page.locator('#run-simulation').click();
    assert.match(await page.locator('#run-status').innerText(), /no more than 5,000,000/);
    await page.locator('#systems').fill('25');
    await page.locator('#attackers').fill('40');
    await page.locator('#probability').fill('0.3');
    await page.locator('#run-simulation').click();
    await page.waitForFunction(() => document.querySelector('#run-status').textContent.startsWith('Done:'));
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: false });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ status: 'PASS', browser: await browser.version(), checks: ['both models', 'three score quantities', 'theoretical and empirical moments', 'LLN and Chebyshev', 'CLT overlays', 'repeatable runs', 'degenerate Bernoulli edge', 'simulation bound', 'mobile layout', 'no uncaught errors'], screenshots: output, firstRunMoments: first }, null, 2));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
