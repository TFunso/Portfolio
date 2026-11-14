// Renders every .scene in src/scenes.html to a PNG (Etsy scenes -> listing-images/, ads -> ads/)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(root, 'src', 'scenes.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  for (const s of await p.$$('.scene')) {
    const id = await s.getAttribute('id');
    const dir = id.startsWith('etsy') ? 'listing-images' : 'ads';
    // Etsy scenes 1500x1125 @2 = 3000x2250; ads @2 = 1080 wide (Pinterest 1000 wide)
    await s.screenshot({ path: path.join(root, dir, id + '.png') });
    console.log(dir + '/' + id + '.png');
  }
  await b.close();
})();
