const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const userDataDir = path.join(require('os').homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, channel: 'chrome', viewport: null
    });
    let page = context.pages()[0] || await context.newPage();

    try {
        console.log("🌐 导航到管理页面...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage");
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log("📖 点击小说...");
        await page.locator('text="重生1982：我有一片禁忌海"').first().click();
        await page.waitForTimeout(3000);

        console.log("📖 点击章节管理...");
        await page.locator('text=章节管理').first().click({ force: true });
        await page.waitForSelector('text=新建章节', { timeout: 30000 });
        await page.waitForTimeout(1500);

        console.log("[volume] looking for 第四卷：深海之种");
        try {
            await page.locator('text="第四卷：深海之种"').first().click();
            await page.waitForTimeout(1500);
        } catch (e) {
            console.log("Volume tab not found, continuing...");
        }

        console.log("👉 点击新建章节...");
        await page.locator('text=新建章节').first().click();
        await page.waitForTimeout(5000);

        // Check current URL
        console.log("Current URL:", page.url());
        
        // Take screenshot
        await page.screenshot({ path: '/tmp/fanqie_debug.png', fullPage: true });
        console.log("Screenshot saved to /tmp/fanqie_debug.png");

        // Check all visible elements
        const pageInfo = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input, textarea')).map(el => ({
                tag: el.tagName,
                placeholder: el.placeholder,
                type: el.type,
                visible: el.offsetParent !== null
            }));
            const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
                text: b.innerText.trim(),
                visible: b.offsetParent !== null
            }));
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .arco-modal, .modal')).map(d => ({
                text: d.innerText.substring(0, 200),
                visible: d.offsetParent !== null
            }));
            return { inputs, buttons, dialogs, bodyText: document.body.innerText.substring(0, 1000) };
        });
        console.log("Page info:", JSON.stringify(pageInfo, null, 2));

    } catch (e) {
        console.error("❌ 发生错误:", e);
    } finally {
        console.log("浏览器暂不关闭");
        process.exit(0);
    }
})();
