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

        const bodyText = await page.evaluate(() => document.body.innerText);
        // Find lines with 第122 or 第123
        const lines = bodyText.split('\n').filter(l => l.includes('122') || l.includes('123'));
        console.log("Chapters 122-123:");
        lines.forEach(l => console.log(l.trim()));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
})();
