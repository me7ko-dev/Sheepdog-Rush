// Captures the raw store screenshots (1290x2796) from the web build served at http://localhost:8765.
// Needs: npm i -D playwright-core, then: npx expo export -p web, serve dist/ on port 8765,
//   node tools/art/capture-store.js <out folder> [names]   (then python3 tools/art/store-screens.py <out folder>)
const { chromium } = require('playwright-core');
const out = process.argv[2];
const only = process.argv[3];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    const stars = {};
    const times = {};
    for (let i = 1; i <= 26; i++) {
      stars[i] = [3, 3, 3, 2, 3, 3][i % 6];
      times[i] = 25 + i * 4.5;
    }
    localStorage.setItem('sheepdog-rush/progress/v1', JSON.stringify({ stars, times }));
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
  if (want('5-levels')) { await page.mouse.move(215, 600); await page.mouse.wheel(0, 1650); await page.waitForTimeout(1200); await shot('5-levels'); await page.mouse.wheel(0, -2000); await page.waitForTimeout(800); }
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
  if (want('6-autumn')) {
    await open(16);
    await page.evaluate(() => {
      const w = globalThis.__sheepdogWorld;
      w.sheep.forEach((s, i) => { s.x = 250 + (i % 3) * 24; s.y = 860 + Math.floor(i / 3) * 24; });
      w.dog.x = 330; w.dog.y = 960; w.target = { x: 320, y: 950 }; w.touching = true; w.started = true;
    });
    await page.waitForTimeout(10000);
    await page.getByLabel('WOOF!').click();
    await page.waitForTimeout(900);
    await shot('6-autumn');
    await back();
  }
  if (want('8-winter')) {
    await page.mouse.move(215, 600); await page.mouse.wheel(0, 2400); await page.waitForTimeout(800);
    await open(22);
    // The flock sliding across the frozen pond towards the barn yard.
    const place = () =>
      page.evaluate(() => {
        const w = globalThis.__sheepdogWorld;
        w.sheep.forEach((s, i) => {
          s.x = 180 + (i % 3) * 26;
          s.y = 330 + Math.floor(i / 3) * 26;
          s.vx = 25;
          s.vy = -70;
          s.panic = 1;
        });
        w.dog.x = 215; w.dog.y = 450; w.target = { x: 215, y: 430 }; w.touching = true; w.started = true;
      });
    await place();
    await page.waitForTimeout(5000);
    await place();
    await page.waitForTimeout(700);
    await shot('8-winter');
    await back();
    await page.mouse.wheel(0, -4000); await page.waitForTimeout(600);
  }
  if (want('7-kennel')) {
    await page.getByText('‹ Back', { exact: true }).click();
    await page.waitForTimeout(1500);
    await page.getByText('Kennel', { exact: true }).click();
    await page.waitForTimeout(2000);
    await page.getByLabel('Husky').click();
    await page.getByLabel('Scarf').click();
    await page.getByLabel('Beanie').click();
    await page.waitForTimeout(5000);
    await shot('7-kennel');
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
