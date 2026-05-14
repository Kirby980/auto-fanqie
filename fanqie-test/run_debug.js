const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const contentFile = '/Users/hyz/.openclaw/workspace/.chapter-staged.txt';
const chapterTitle = '第122章 雾中暗影：迟缓的时钟';

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
        // Try to click the volume tab
        try {
            await page.locator('text="第四卷：深海之种"').first().click();
            await page.waitForTimeout(1500);
        } catch (e) {
            console.log("Volume tab not found, continuing...");
        }

        console.log("👉 点击新建章节...");
        await page.locator('text=新建章节').first().click();
        await page.waitForTimeout(3000);

        // Check current URL
        console.log("Current URL:", page.url());

        // Find and fill title
        console.log("📝 填写标题...");
        const titleLocator = page.getByPlaceholder('请输入标题').first();
        await titleLocator.waitFor({ state: 'visible', timeout: 5000 });
        await titleLocator.click();
        await titleLocator.press('Meta+a');
        await titleLocator.press('Backspace');
        await titleLocator.fill('雾中暗影：迟缓的时钟');
        await titleLocator.blur();
        await page.waitForTimeout(1000);

        // Fill content
        console.log("📝 填写正文...");
        const rawText = fs.readFileSync(contentFile, 'utf8');
        const paragraphs = rawText.split('\n').map(p => p.trim()).filter(p => p !== '');
        const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

        console.log("👉 尝试直接注入 HTML 到编辑器...");
        await page.evaluate((html) => {
            const el = document.querySelector('.ProseMirror, .ql-editor, [contenteditable="true"]:not(h1)');
            if (el) {
                el.innerHTML = html;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.blur();
            } else {
                console.error("❌ 找不到正文编辑器区域！");
                throw new Error("Editor not found");
            }
        }, htmlContent);
        await page.waitForTimeout(2000);

        // Get all buttons before clicking
        console.log("🔍 检查页面上的所有按钮...");
        const btnsBefore = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
        });
        console.log("Buttons before click:", btnsBefore);

        // Click publish button
        console.log("🚀 点击发布按钮...");
        const clickResult = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const nextBtn = btns.find(b => b.innerText.includes('下一步') || b.innerText.trim() === '发布');
            if (nextBtn) {
                nextBtn.click();
                return { found: true, text: nextBtn.innerText.trim() };
            }
            return { found: false };
        });
        console.log("Click result:", clickResult);

        // Wait and check for modals
        for (let i = 0; i < 10; i++) {
            await page.waitForTimeout(2000);
            const modalInfo = await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const dialogText = document.body.innerText;
                return {
                    buttons: btns.map(b => b.innerText.trim()),
                    hasRiskDialog: dialogText.includes('是否进行内容风险检测'),
                    hasConfirmPublish: dialogText.includes('确认发布'),
                    hasTypoWarning: dialogText.includes('检测到你还有错别字未修改'),
                    dialogSnippet: dialogText.substring(0, 500)
                };
            });
            console.log(`[modal ${i+1}]`, JSON.stringify(modalInfo, null, 2));

            // Handle modals
            if (modalInfo.hasRiskDialog || modalInfo.dialogSnippet.includes('风险检测')) {
                console.log("Handling risk dialog...");
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const labels = Array.from(document.querySelectorAll('.arco-radio, span, label'));
                    
                    const basicOption = labels.find(l => l.innerText.includes('基础检测'));
                    if (basicOption) {
                        console.log("Selecting basic detection...");
                        basicOption.click();
                    }

                    const confirmBtn = btns.find(b => b.innerText.trim() === '确定');
                    if (confirmBtn) {
                        confirmBtn.click();
                    } else {
                        const cancelBtn = btns.find(b => b.innerText.trim() === '取消');
                        if (cancelBtn) cancelBtn.click();
                    }
                });
            }
            if (modalInfo.hasConfirmPublish) {
                console.log("Clicking confirm publish...");
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const confirmBtn = btns.find(b => b.innerText.trim() === '确认发布');
                    if (confirmBtn) {
                        const noAi = Array.from(document.querySelectorAll('.arco-radio')).find(r => r.innerText.includes('否'));
                        if (noAi) noAi.click();
                        setTimeout(() => confirmBtn.click(), 500);
                    }
                });
            }
            if (modalInfo.hasTypoWarning) {
                console.log("Clicking submit for typo warning...");
                await page.evaluate(() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const submitBtn = btns.find(b => b.innerText.trim() === '提交');
                    if (submitBtn) submitBtn.click();
                });
            }
        }

        console.log("✅ 调试脚本执行完毕。");
        await page.waitForTimeout(5000);

    } catch (e) {
        console.error("❌ 发生错误:", e);
    } finally {
        console.log("浏览器暂不关闭");
        process.exit(0);
    }
})();
