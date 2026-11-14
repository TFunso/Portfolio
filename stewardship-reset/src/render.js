// Renders build/workbook.html -> build/30-Day-Stewardship-Reset.pdf and build/pages/page-XX.png
// Usage: node src/render.js [--no-png]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const root = path.resolve(__dirname, '..');
  const src = 'file://' + path.join(root, 'build', 'workbook.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(src, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // Overflow check: any page whose content runs past its box
  const problems = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.page').forEach((p, i) => {
      const box = p.getBoundingClientRect();
      const foot = p.querySelector('.pfoot');
      const limit = foot ? foot.getBoundingClientRect().top - 2 : box.bottom - 4;
      let maxBottom = 0;
      p.querySelectorAll(':scope > *:not(.pfoot)').forEach(c => { maxBottom = Math.max(maxBottom, c.getBoundingClientRect().bottom); });
      if (maxBottom > limit) out.push(`page ${i + 1} (${p.id || p.className}) overflows by ${Math.round(maxBottom - limit)}px`);
    });
    return out;
  });
  console.log(problems.length ? problems.join('\n') : 'no overflow');

  const pdfPath = path.join(root, 'build', '30-Day-Stewardship-Reset.pdf');
  await page.pdf({ path: pdfPath, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  console.log('pdf', pdfPath, (fs.statSync(pdfPath).size / 1e6).toFixed(2) + 'MB');

  if (!process.argv.includes('--no-png')) {
    const pages = await page.$$('.page');
    const dir = path.join(root, 'build', 'pages');
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < pages.length; i++) {
      await pages[i].screenshot({ path: path.join(dir, `page-${String(i + 1).padStart(2, '0')}.png`) });
    }
    console.log('png pages', pages.length);
  }
  await browser.close();
})();
