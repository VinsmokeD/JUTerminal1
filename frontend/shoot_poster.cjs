const { chromium } = require('playwright');
(async () => {
  const fileUrl = 'file:///C:/Users/mmjal/Documents/JUTerminal1/docs/final-report/presentation/parallax_poster_a2.html';
  let browser, used='';
  for (const ch of ['msedge','chrome']) {
    try { browser = await chromium.launch({ channel: ch }); used=ch; break; }
    catch(e){ /* try next */ }
  }
  if(!browser){ console.log('NO_BROWSER'); process.exit(2); }
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const p = document.getElementById('poster');
    return {
      posterW: p.offsetWidth, posterH: p.offsetHeight, ratio:(p.offsetHeight/p.offsetWidth).toFixed(4),
      transform: p.style.transform,
      qrHeadRects: document.getElementById('qr-head').querySelectorAll('rect').length,
      qrFootRects: document.getElementById('qr-foot').querySelectorAll('rect').length,
      loopExists: !!document.querySelector('.loop-wrap svg'),
      panels: document.querySelectorAll('.panel').length,
      scenarios: document.querySelectorAll('.scn').length,
      stats: document.querySelectorAll('.stat').length,
      authors: document.querySelectorAll('.author').length
    };
  });
  await page.locator('#poster').screenshot({ path: 'C:/Users/mmjal/Documents/JUTerminal1/docs/final-report/presentation/_poster_preview.png' });
  console.log('CHANNEL:', used);
  console.log(JSON.stringify(info, null, 2));
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
