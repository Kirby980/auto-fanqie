const { chromium } = require('playwright');

(async () => {
    const userDataDir = require('path').join(require('os').homedir(), '.playwright', 'fanqie-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false, channel: 'chrome', viewport: null
    });
    let page = context.pages()[0] || await context.newPage();

    try {
        console.log("🌐 导航到管理页面...");
        await page.goto("https://fanqienovel.com/main/writer/book-manage");
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        console.log("📖 点击小说: 重生1982：我有一片禁忌海");
        await page.locator(`text="重生1982：我有一片禁忌海"`).first().click();
        await page.waitForTimeout(3000);

        console.log("📖 点击章节管理...");
        await page.locator('text=章节管理').first().click({ force: true });
        await page.waitForTimeout(3000);

        console.log("👉 点击新建章节...");
        await page.locator('text=新建章节').first().click({ force: true });
        
        console.log("⏳ 等待页面跳转并查找编辑器...");
        await page.waitForTimeout(5000);

        let targetPage = page;
        for (const p of context.pages()) {
            if (p.url().includes('publish') || p.url().includes('chapter')) {
                targetPage = p;
                break;
            }
        }

        console.log("DOM 结构分析中...");
        const html = await targetPage.evaluate(() => {
            // 找到包含 "请输入标题" 的元素
            const elements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.placeholder?.includes('标题') || 
                el.innerText?.includes('请输入标题') ||
                el.getAttribute('data-placeholder')?.includes('标题')
            );
            
            // 找到包含 "请输入正文" 的元素
            const contentElements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.placeholder?.includes('正文') || 
                el.innerText?.includes('请输入正文') ||
                el.getAttribute('data-placeholder')?.includes('正文') ||
                el.classList?.contains('ql-editor')
            );

            return {
                titleCandidates: elements.map(e => ({
                    tag: e.tagName,
                    className: e.className,
                    placeholder: e.placeholder,
                    innerText: e.innerText.substring(0, 20),
                    contentEditable: e.getAttribute('contenteditable')
                })).slice(0, 10),
                contentCandidates: contentElements.map(e => ({
                    tag: e.tagName,
                    className: e.className,
                    placeholder: e.placeholder,
                    contentEditable: e.getAttribute('contenteditable')
                })).slice(0, 10),
                allInputs: Array.from(document.querySelectorAll('input, textarea')).map(e => ({
                    tag: e.tagName,
                    placeholder: e.placeholder,
                    className: e.className
                }))
            };
        });
        
        console.log(JSON.stringify(html, null, 2));

    } catch (e) { 
        console.error("❌ 发生错误:", e); 
    } finally { 
        await context.close(); 
    }
})();