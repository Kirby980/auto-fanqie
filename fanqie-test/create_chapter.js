const { chromium } = require('playwright');
const fs = require('fs');

const args = process.argv.slice(2);
let novelName = '';
let volumeName = '';
let chapterTitle = '';
let contentFile = '';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--novel' && args[i+1]) {
        novelName = args[i+1];
        i++;
    } else if (args[i] === '--volume' && args[i+1]) {
        volumeName = args[i+1];
        i++;
    } else if (args[i] === '--title' && args[i+1]) {
        chapterTitle = args[i+1];
        i++;
    } else if (args[i] === '--file' && args[i+1]) {
        contentFile = args[i+1];
        i++;
    }
}

if (!chapterTitle || !contentFile) {
    console.error("❌ 请提供章节标题和正文文件路径！");
    process.exit(1);
}

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
        
        if (novelName) {
            console.log(`📖 点击小说: ${novelName}`);
            await page.locator(`text="${novelName}"`).first().click();
            await page.waitForTimeout(3000);
        }

        console.log("📖 点击章节管理...");
        await page.locator('text=章节管理').first().click({ force: true });
        await page.waitForTimeout(3000);

        if (volumeName) {
            console.log(`📚 检查并选择分卷: ${volumeName}`);
            const volumeSelect = page.locator('.arco-select').first();
            if (await volumeSelect.isVisible()) {
                await volumeSelect.click();
                await page.waitForTimeout(1000);
                
                const volumeOption = page.locator('.arco-select-option').filter({ hasText: volumeName }).first();
                if (await volumeOption.isVisible()) {
                    console.log(`✅ 找到分卷: ${volumeName}，直接选择`);
                    await volumeOption.click();
                    await page.waitForTimeout(2000);
                } else {
                    console.log(`⚠️ 未找到分卷: ${volumeName}，准备新建分卷...`);
                    // Close the dropdown
                    await page.mouse.click(0, 0);
                    await page.waitForTimeout(500);
                    
                    console.log("👉 点击“编辑分卷”按钮...");
                    await page.locator('button').filter({ hasText: '编辑分卷' }).first().click();
                    
                    const modal = page.locator('.arco-modal').first();
                    await modal.waitFor({ state: 'visible', timeout: 10000 });
                    
                    console.log("👉 在分卷弹窗中点击“+ 新建分卷”...");
                    await modal.getByText('新建分卷').first().click();
                    
                    console.log(`👉 输入新分卷名称: ${volumeName}`);
                    await modal.locator('input[value=""]').first().fill(volumeName);
                    
                    console.log("👉 点击弹窗“确定”按钮保存...");
                    await modal.locator('button').filter({ hasText: '确定' }).first().click();
                    await page.waitForTimeout(2000);
                    
                    // Re-open and select
                    await volumeSelect.click();
                    await page.waitForTimeout(1000);
                    await page.locator('.arco-select-option').filter({ hasText: volumeName }).first().click();
                    await page.waitForTimeout(2000);
                }
            }
        }

        console.log("👉 点击新建章节...");
        await page.locator('text=新建章节').first().click({ force: true });
        
        console.log("⏳ 等待页面跳转并查找编辑器...");
        await page.waitForTimeout(5000);

        let targetPage = page;
        for (let attempt = 0; attempt < 10; attempt++) {
            for (const p of context.pages()) {
                if (p.url().includes('/publish/')) {
                    targetPage = p;
                    console.log("✅ 找到编辑器页面！ URL: " + p.url());
                    break;
                }
            }
            if (targetPage !== page) break;
            await page.waitForTimeout(1000);
        }

        await targetPage.bringToFront();
        await targetPage.waitForLoadState('networkidle');
        await targetPage.waitForTimeout(2000);

        console.log(`📝 填写标题: ${chapterTitle}`);
        try {
            let chapNum = "";
            let actualTitle = chapterTitle;
            const match = chapterTitle.match(/第(\d+)章\s*(.*)/);
            if (match) {
                chapNum = match[1];
                actualTitle = match[2];
            }

            if (chapNum) {
                const chapInput = targetPage.locator('input[type="text"]').first();
                try {
                    await chapInput.waitFor({ state: 'visible', timeout: 2000 });
                    await chapInput.click();
                    await chapInput.press('Meta+a');
                    await chapInput.press('Backspace');
                    await chapInput.fill(chapNum);
                    await chapInput.blur();
                } catch (e) {
                    console.log("⚠️ 章节序号框填入失败，可能已自动填充");
                }
            }

            const titleLocator = targetPage.getByPlaceholder('请输入标题').first();
            await titleLocator.waitFor({ state: 'visible', timeout: 5000 });
            await titleLocator.click();
            await titleLocator.press('Meta+a');
            await titleLocator.press('Backspace');
            await titleLocator.fill(actualTitle);
            await titleLocator.blur();
        } catch (e) {
            console.log("⚠️ 常规选择器超时，尝试使用注入原生键盘事件...");
            await targetPage.evaluate((t) => {
                const match = t.match(/第(\d+)章\s*(.*)/);
                const actualTitle = match ? match[2] : t;
                const el = document.querySelector('input[placeholder*="请输入标题"], .editor-title-input, .title-input');
                if (el) {
                    el.value = actualTitle;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.blur();
                } else {
                    console.error("❌ 无法在 DOM 中找到任何标题输入框");
                }
            }, chapterTitle);
        }
        await targetPage.waitForTimeout(1000);

        console.log("📝 填写正文...");
        const rawText = fs.readFileSync(contentFile, 'utf8');
        
        // Format text: filter out empty lines
        let paragraphs = rawText.split('\n')
            .map(p => p.trim())
            .filter(p => p !== '');
            
        // Ignore the first few lines if they are chapter titles
        while (paragraphs.length > 0 && (/^#*\s*第\d+章/.test(paragraphs[0]) || (paragraphs[0].startsWith('第') && paragraphs[0].includes('章')))) {
            paragraphs.shift();
        }
        
        // Remove the last line if it ends with "完" or contains word counts like "本章字数"
        while (paragraphs.length > 0 && (
            (paragraphs[paragraphs.length - 1].includes('完') && paragraphs[paragraphs.length - 1].includes('章')) ||
            paragraphs[paragraphs.length - 1].includes('本章字数')
        )) {
            paragraphs.pop();
        }
            
        const htmlContent = paragraphs.map(p => `<p>${p}</p>`).join('');

        try {
            console.log("👉 尝试直接注入 HTML 到编辑器...");
            await targetPage.evaluate((html) => {
                // Find the ProseMirror contenteditable element
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
        } catch(e) {
            console.error("❌ 注入正文失败:", e);
        }

        await targetPage.waitForTimeout(2000);
        
        console.log("🚀 寻找保存/发布按钮...");
        // Click 下一步 (Next) or 发布 (Publish)
        await targetPage.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const nextBtn = btns.find(b => b.innerText.includes('下一步') || b.innerText.trim() === '发布');
            if (nextBtn) nextBtn.click();
        });

        // Wait and handle modals
        for (let i = 0; i < 8; i++) { 
            await targetPage.waitForTimeout(2000);
            await targetPage.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const dialogText = document.body.innerText;
                
                // Skip risk detection
                if (dialogText.includes('是否进行内容风险检测')) {
                    const cancelBtn = btns.find(b => b.innerText.trim() === '取消');
                    if (cancelBtn) cancelBtn.click();
                }

                // If "确认发布" exists, select "否" for AI first
                const confirmPublishBtn = btns.find(b => b.innerText.trim() === '确认发布' || b.innerText.trim() === '提交');
                if (confirmPublishBtn) {
                    const noAi = Array.from(document.querySelectorAll('.arco-radio')).find(r => r.innerText.includes('否'));
                    if (noAi) noAi.click();
                    // Click after a tiny delay
                    setTimeout(() => confirmPublishBtn.click(), 500);
                }
                
                // If there's a typo warning
                if (dialogText.includes('检测到你还有错别字未修改')) {
                    const submitBtn = btns.find(b => b.innerText.trim() === '提交');
                    if (submitBtn) submitBtn.click();
                }
            });
        }

        console.log("✅ 脚本执行完毕。");
        await targetPage.waitForTimeout(3000);

    } catch (e) { 
        console.error("❌ 发生错误:", e); 
    } finally { 
        console.log("浏览器暂不关闭，保留复用上下文！如果不需要请手动关闭浏览器。");
    }
})();
