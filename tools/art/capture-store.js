// Captures the raw store screenshots (1290x2796) from the web build served at http://localhost:8765.
// Needs: npm i -D playwright-core, then: npx expo export -p web, serve dist/ on port 8765,
//   node tools/art/capture-store.js <out folder>   (then python3 tools/art/store-screens.py <out folder>)
// Captures raw store screenshots (1290x2796) from the web build.
const { chromium } = require('playwright-core');
const out = process.argv[2];
const only = process.argv[3];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    const stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 1, 7: 3, 8: 2 };
    localStorage.setItem('sheepdog-rush/progress/v1', JSON.stringify({ stars }));
    localStorage.setItem('sheepdog-rush/settings/v1', JSON.stringify({ sound: false, music: false, haptics: true }));
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto('http://localhost:8765/', { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };
  const want = (n) => !only || only.split(',').includes(n);
  if (want('1-start')) await shot('1-start');
  await page.getByText('Play', { exact: true }).click();
  await page.waitForTimeout(1500);
  if (want('5-levels')) await shot('5-levels');
  const open = async (n) => { await page.getByText(String(n), { exact: true }).first().click(); await page.waitForTimeout(4000); await page.mouse.click(215, 700); };
  const back = async () => { await page.mouse.click(34, 30); await page.waitForTimeout(600); await page.getByText('Levels', { exact: true }).last().click(); await page.waitForTimeout(1500); };

  if (want('2-play')) {
    await open(3);
    // Dog right behind the flock, sheep running up towards the bridge.
    await page.evaluate(() => {
      const w = globalThis.__sheepdogWorld;
      w.sheep.forEach((s, i) => { s.x = 300 + (i % 3) * 22 - 22; s.y = 540 + Math.floor(i / 3) * 24; });
      w.dog.x = 330; w.dog.y = 660; w.target = { x: 325, y: 600 }; w.touching = true; w.started = true;
    });
    await page.waitForTimeout(9000);
    await shot('2-play');
    await back();
  }
  if (want('3-wolf')) {
    await open(9);
    await page.evaluate(() => {
      const w = globalThis.__sheepdogWorld;
      w.sheep.forEach((s, i) => { s.x = 250 + (i % 4) * 22; s.y = 600 + Math.floor(i / 4) * 24; });
      w.dog.x = 250; w.dog.y = 700; w.target = { x: 260, y: 700 }; w.touching = true; w.started = true;
    });
    await page.waitForTimeout(10000);
    await page.evaluate(() => {
      const w = globalThis.__sheepdogWorld;
      w.elapsed = w.wolf.appearAt - 0.05; w.wolf.x = 300; w.wolf.y = 545;
    });
    await page.waitForTimeout(2500);
    await shot('3-wolf');
    await back();
  }
  if (want('4-win')) {
    await open(4);
    await page.waitForTimeout(8000);
    await page.evaluate(() => {
      const w = globalThis.__sheepdogWorld; const r = w.penInner;
      w.sheep.forEach((s, i) => { s.x = r.x + 20 + (i % 4) * 30; s.y = r.y + 25 + Math.floor(i / 4) * 30; });
    });
    await page.getByText('Well done!', { exact: true }).waitFor({ timeout: 120000 });
    await page.waitForTimeout(1600);
    await shot('4-win');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
