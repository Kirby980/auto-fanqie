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

        // Get the chapter list
        const chapterInfo = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr, [class*="chapter"]');
            const bodyText = document.body.innerText;
            // Find the 123 chapter info
            const lines = bodyText.split('\n');
            const ch123Lines = lines.filter(l => l.includes('123'));
            return {
                first5Chapters: lines.filter(l => l.includes('第1') && l.includes('章')).slice(0, 5),
                ch123: ch123Lines
            };
        });
        console.log("Chapter 123 info:", JSON.stringify(chapterInfo, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit(0);
    }
})();
