const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const userDataDir = path.join(require('os').homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, channel: 'chrome', viewport: null
    });
    let page = context.pages()[0] || await context.newPage();

    try {
        await page.goto("https://fanqienovel.com/main/writer/book-manage");
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        await page.locator('text="重生1982：我有一片禁忌海"').first().click();
        await page.waitForTimeout(3000);

        await page.locator('text=章节管理').first().click({ force: true });
        await page.waitForSelector('text=新建章节', { timeout: 30000 });
        await page.waitForTimeout(1500);

        // Get full body text and search for the area around chapter 123
        const bodyText = await page.evaluate(() => document.body.innerText);
        // Find the section containing chapter 123
        const idx = bodyText.indexOf('第123章');
        if (idx !== -1) {
            // Extract 500 chars around it
            const start = Math.max(0, idx - 100);
            const end = Math.min(bodyText.length, idx + 500);
            console.log("=== Chapter 123 Context ===");
            console.log(bodyText.substring(start, end));
        } else {
            console.log("Chapter 123 not found!");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
})();
