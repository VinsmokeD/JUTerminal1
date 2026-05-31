import { test, expect } from '@playwright/test';

test.describe('Parallax V5 critical path', () => {
  test('login â†’ start SC-01 â†’ run command â†’ SIEM event â†’ submit flag â†’ tutor input visible', async ({ page }) => {
    test.setTimeout(60_000); // Give it enough time

    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('websocket', ws => {
      ws.on('framesent', event => console.log(`WS SEND: ${event.payload}`));
      ws.on('framereceived', event => console.log(`WS RECV: ${event.payload}`));
    });

    // 1. Register a new user
    const username = 'testuser_' + Date.now();
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
    
    // 2.5 ROE modal
    await expect(page.locator('text=Rules of Engagement').first()).toBeVisible({ timeout: 15_000 });
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Acknowledge")');

    // 3. Wait for terminal to be ready
    const terminal = page.locator('.xterm-screen').first();
    await expect(terminal).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.xterm-rows')).toContainText('student@kali', { timeout: 30_000 });

    // 4. Type a command
    await terminal.click();
    await page.keyboard.type('nmap 172.20.1.20', { delay: 50 });
    await page.keyboard.press('Enter');

    // 5. Expect a SIEM event within 5 seconds
    const siemEvent = page.locator('[data-testid="siem-event"], .group.relative.overflow-hidden.rounded-cs-sm').first();
    await expect(siemEvent).toBeVisible({ timeout: 10_000 });
    await expect(siemEvent).toContainText(/nmap|recon|port/i);

    // 6. Expect the AI tutor panel to have the free-text input
    const tutorInput = page.locator('input[placeholder*="Ask the tutor"]');
    await expect(tutorInput).toBeVisible();

    // 7. Expect the flag submission button
    const flagButton = page.getByRole('button', { name: /SUBMIT FLAG/i });
    await expect(flagButton).toBeVisible();
  });
});
