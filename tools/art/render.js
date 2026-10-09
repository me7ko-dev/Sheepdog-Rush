// Renders tools/art/scene.ts in a browser and saves the picture.
// Needs: npm i -D playwright-core esbuild, a Chromium, then:
//   npx esbuild tools/art/scene.ts --bundle --format=iife --outfile=<dir>/scene.js
//   (put an index.html with <canvas id="c"> and <script src="scene.js"> in <dir>)
//   node tools/art/render.js <dir> icon|sheep|banner <width> <height> <out.png>
// Set CHROMIUM=/path/to/chromium if Playwright can't find one.
const { chromium } = require('playwright-core');
const fs = require('fs');
const [,, dir, mode, w, h, out] = process.argv;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('pageerror', (e) => console.log('ERR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.goto(`file://${dir}/index.html?mode=${mode}&hill=${process.env.HILL ?? 1}&w=${w}&h=${h}`);
  await page.waitForFunction(() => window.artReady === true, null, { timeout: 120000 });
  const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', out);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
