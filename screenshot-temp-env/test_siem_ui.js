
const { chromium } = require('playwright');
const http = require('http');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // We need to wait for a SIEM event to arrive over websocket
  const siemEvents = [];
  
  page.on('websocket', ws => {
    console.log(`WebSocket opened: ${ws.url()}`);
    ws.on('framereceived', frame => {
      try {
        const payload = JSON.parse(frame.payload);
        if (payload.type === 'siem_event') {
          siemEvents.push(payload);
          console.log(`Received WS Frame: ${JSON.stringify(payload).substring(0, 100)}...`);
        }
      } catch (e) {
        // ignore parsing errors for binary frames
      }
    });
  });

  await page.goto('http://localhost:3000/auth');
  
  // Login
  await page.locator('input').nth(0).fill('jsmith');
  await page.locator('input').nth(1).fill('Password123');
  await page.click('button:has-text("Sign In")');

  // Wait for session load
  await page.waitForTimeout(2000);
  
  // Enter session
  try {
      await page.click('button:has-text("Resume Engagement")');
      await page.waitForTimeout(2000);
  } catch (e) {
      console.log("Resume button not found, looking for Start mission");
      try {
          await page.click('button:has-text("Start mission")');
          await page.waitForTimeout(2000);
      } catch(e) {}
  }

  // Now trigger the SIEM event on the backend
  console.log("Triggering live SIEM event from backend...");
  const execSync = require('child_process').execSync;
  execSync('docker exec cybersim-backend-1 python /app/trigger_siem_live.py');
  
  // Wait for SIEM row to render
  console.log("Waiting for SIEM row in UI...");
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'siem_row.png', fullPage: true });
  console.log(`Screenshot saved to siem_row.png. Received ${siemEvents.length} SIEM events.`);
  
  await browser.close();
})();
