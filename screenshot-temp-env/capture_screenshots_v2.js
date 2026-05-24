const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8001/api';
const ROOT = 'C:\\Users\\Mahmo\\OneDrive\\Documents\\Mahmoud\\Graduation Project\\JUTerminal1';
const FINAL_SCREENSHOT_DIR = path.join(ROOT, 'docs', 'final-report', 'evidence', 'screenshots');

async function capture() {
  console.log('Starting high-fidelity capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 }, // Slightly larger for better detail
    deviceScaleFactor: 2 // High DPI for crisp text
  });
  const page = await context.newPage();

  // Helper to wait for the HUD boot sequence
  const waitForHudBoot = async (context = '') => {
    console.log(`Waiting for HUD boot sequence to finish ${context}...`);
    try {
        await page.waitForSelector('.boot-console-line', { state: 'attached', timeout: 5000 });
        await page.waitForSelector('text=WELCOME OPERATOR', { timeout: 15000 });
        await page.waitForTimeout(2000); // Animation fade out
    } catch (err) {
        console.log(`Boot sequence not detected or already finished ${context}.`);
    }
  };

  // Helper to ensure workspace is ready (ROE ack, Readiness dismissed)
  const ensureWorkspaceReady = async (role) => {
    console.log(`Ensuring ${role} workspace is ready...`);
    
    // 0. Handle any open modals (like the "Mission Protocol" modal for beginners)
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1000);
    
    // 1. Handle ROE
    const roeCheckbox = page.locator('input[type="checkbox"]');
    if (await roeCheckbox.count() > 0) {
        console.log('ROE found, acknowledging...');
        // Use force click to toggle checkbox
        await roeCheckbox.first().click({ force: true });
        const roeButton = page.locator('button:has-text("Acknowledge")');
        if (await roeButton.count() > 0) {
            await roeButton.first().click({ force: true });
            await page.waitForTimeout(2000);
        }
    }

    // 2. Handle Mission Readiness Overlay
    console.log('Force-overriding readiness checks via API...');
    await page.request.post(`${API_URL}/sessions/${sessionId}/override`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).catch(err => console.log('Override API failed:', err));
    
    console.log('Waiting for Mission Readiness Overlay to disappear...');
    try {
        await page.waitForSelector('text=MISSION READINESS REPORT', { state: 'detached', timeout: 25000 });
        console.log('Overlay disappeared.');
    } catch (err) {
        console.log('Overlay did not disappear within timeout, trying escape...');
        await page.keyboard.press('Escape').catch(() => {});
    }
    
    await page.waitForTimeout(2000);
  };

  if (!fs.existsSync(FINAL_SCREENSHOT_DIR)) {
      fs.mkdirSync(FINAL_SCREENSHOT_DIR, { recursive: true });
  }

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 1. Landing Page
  console.log('Capturing Landing Page...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await waitForHudBoot('on Landing');
  await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'landing-page.png') });

  // 2. Auth Page
  console.log('Capturing Auth Page...');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle', timeout: 60000 });
  await waitForHudBoot('on Auth');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'auth-page.png') });

  // Login
  console.log('Logging in as admin...');
  const usernameInput = page.locator('input[placeholder="Enter operator username"]');
  const passwordInput = page.locator('input[placeholder="Enter security key"]');
  const loginButton = page.locator('button:has-text("INITIALIZE INTERFACE")');

  try {
      await page.waitForSelector('input[placeholder="Enter operator username"]', { state: 'visible', timeout: 20000 });
  } catch (err) {
      console.error('Failed to find username input. Current URL:', page.url());
      await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'debug-auth-fail.png') });
      throw err;
  }

  await usernameInput.fill('admin');
  await passwordInput.fill('CyberSimAdmin!');
  
  const loginPromise = page.waitForResponse(resp => resp.url().includes('/api/auth/login'));
  await loginButton.click();
  
  try {
      const response = await loginPromise;
      if (response.status() !== 200) {
          console.log('Login failed, trying register...');
          await page.click('button:has-text("Register")');
          await page.waitForTimeout(1000);
          await usernameInput.fill('admin');
          await passwordInput.fill('CyberSimAdmin!');
          await loginButton.click();
          await page.waitForTimeout(5000);
      }
  } catch (err) {
      console.warn('Login response intercept failed');
  }

  await page.waitForTimeout(3000);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  console.log('Token Captured:', !!token);
  if (!token) throw new Error('Token not found after login');

  // 3. Scenario Dashboard
  console.log('Capturing Dashboard...');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await waitForHudBoot('on Dashboard');
  await page.waitForSelector('.card-v3', { state: 'visible', timeout: 20000 });
  
  const firstCard = page.locator('.card-v3').first();
  if (await firstCard.count() > 0) {
      await firstCard.hover();
      await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'dashboard-scenarios.png') });

  // 4. Instructor Dashboard
  console.log('Capturing Instructor Dashboard...');
  await page.goto(`${BASE_URL}/instructor`, { waitUntil: 'networkidle' });
  await waitForHudBoot('on Instructor');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'instructor-dashboard.png') });

  // 5. API Docs
  console.log('Capturing API Docs...');
  await page.goto(`http://localhost:8001/api/docs`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.swagger-ui', { state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'api-docs.png') });

  // 6. Red Workspace
  console.log('Capturing Red Workspace...');
  const sessionRes = await page.request.post(`${API_URL}/sessions/start`, {
    data: { scenario_id: 'SC-01', role: 'red' },
    headers: { 'Authorization': `Bearer ${token}` }
  });
  let sessionId;
  const sessionData = await sessionRes.json();
  console.log('Session Start Response:', sessionRes.status(), sessionData);
  
  if (sessionRes.ok()) {
      sessionId = sessionData.id;
  } else if (sessionData.detail?.session_id) {
      sessionId = sessionData.detail.session_id;
      console.log('Using existing session:', sessionId);
  } else {
      console.error('FAILED TO START SESSION:', sessionData);
  }

  if (sessionId) {
      await page.goto(`${BASE_URL}/session/${sessionId}/red`, { waitUntil: 'networkidle' });
      await waitForHudBoot('on Red Workspace');
      await ensureWorkspaceReady('Red');

      await page.focus('.xterm-helper-textarea').catch(() => {});
      await page.keyboard.type('whoami\n');
      await page.waitForTimeout(1000);
      await page.keyboard.type('uname -a\n');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'red-workspace-terminal.png') });

      const aiTutor = page.locator('.hud-glass-crimson, .hud-glass-cyan, .hud-glass-amber').filter({ hasText: 'AI Tutor' });
      if (await aiTutor.count() > 0) {
          await aiTutor.first().screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'ai-tutor-panel.png') });
      }

      // 7. Blue Workspace
      console.log('Capturing Blue Workspace...');
      await page.goto(`${BASE_URL}/session/${sessionId}/blue`, { waitUntil: 'networkidle' });
      await waitForHudBoot('on Blue Workspace');
      await ensureWorkspaceReady('Blue');

      const alert = page.locator('.siem-event-row').first();
      if (await alert.count() > 0) {
          await alert.click();
          await page.waitForTimeout(1000);
      }
      
      const forensicsTab = page.locator('button:has-text("Forensics")');
      if (await forensicsTab.count() > 0) {
          await forensicsTab.first().click();
          await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'blue-workspace-siem.png') });

      // 8. Debrief
      console.log('Capturing Debrief...');
      await page.goto(`${BASE_URL}/session/${sessionId}/debrief`, { waitUntil: 'networkidle' });
      await waitForHudBoot('on Debrief');
      await page.waitForTimeout(3000);
      
      const node = page.locator('.killchain-node').first();
      if (await node.count() > 0) {
          await node.click();
          await page.waitForTimeout(1000);
      }
      
      await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'debrief-killchain.png') });
  }

  // 9. Docker Status
  console.log('Capturing Docker Status...');
  await page.goto(`${API_URL}/health/readiness`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(FINAL_SCREENSHOT_DIR, 'docker-services.png') });

  console.log('Capture complete!');
  await browser.close();
}

capture().catch(err => {
    console.error('Capture failed:', err);
    process.exit(1);
});
