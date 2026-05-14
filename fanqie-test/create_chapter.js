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
        await page.goto("https://fanqienovel.com/main/writer/book-manage", { waitUntil: 'domcontentloaded' });
        // await page.waitForLoadState('networkidle');
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
        // Parse "第{num}章 {title}" — num 可以是阿拉伯数字 (82) 或中文数字 (八十二 / 一百零五)
        // 返回 { chapNum: "82", actualTitle: "针影之下..." }
        const parseChapterTitle = (raw) => {
            const m = raw.match(/^\s*第\s*([\d一二三四五六七八九十百千零两]+)\s*章\s*[:：、\.\s]*(.*?)\s*$/);
            if (!m) return { chapNum: "", actualTitle: raw };
            const numStr = m[1];
            if (/^\d+$/.test(numStr)) return { chapNum: numStr, actualTitle: m[2] };
            const digitMap = { '零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9 };
            const unitMap = { '十':10,'百':100,'千':1000 };
            let total = 0, section = 0, current = 0;
            for (const ch of numStr) {
                if (digitMap[ch] !== undefined) { current = digitMap[ch]; }
                else if (unitMap[ch]) {
                    if (current === 0) current = 1;
                    section += current * unitMap[ch];
                    current = 0;
                }
            }
            total = section + current;
            return { chapNum: String(total), actualTitle: m[2] };
        };

        try {
            const { chapNum, actualTitle } = parseChapterTitle(chapterTitle);
            console.log(`   -> 解析结果: 第${chapNum || '?'}章 | 标题="${actualTitle}"`);

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
            const { actualTitle: fallbackTitle } = parseChapterTitle(chapterTitle);
            await targetPage.evaluate((t) => {
                const el = document.querySelector('input[placeholder*="请输入标题"], .editor-title-input, .title-input');
                if (el) {
                    el.value = t;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.blur();
                } else {
                    console.error("❌ 无法在 DOM 中找到任何标题输入框");
                }
            }, fallbackTitle);
        }
        await targetPage.waitForTimeout(1000);

        console.log("📝 填写正文...");
        // Staged content is already filtered by `fanqie-publisher prepare`.
        // Here we only split into paragraphs and wrap in <p> for injection.
        const rawText = fs.readFileSync(contentFile, 'utf8');
        const paragraphs = rawText.split('\n')
            .map(p => p.trim())
            .filter(p => p !== '');
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
        for (let i = 0; i < 20; i++) {
            await targetPage.waitForTimeout(1500);
            
            // Handle Typo warning
            const typoBtn = await targetPage.locator('.arco-modal:has-text("错别字") button:has-text("提交")').first();
            if (await typoBtn.isVisible().catch(()=>false)) {
                console.log("👉 发现错别字提示，点击提交跳过...");
                await typoBtn.click();
                await targetPage.waitForTimeout(1000);
            }
            
            // Handle Risk detection warning
            // 新版（2026-05 实测）：<dialog role="dialog">「请选择内容检测方式」内含两个按钮
            //   —— "仅基础检测" / "全面检测"，点击「仅基础检测」即关闭并自动推进到"发布设置"。
            //   没有"等检测结果"中间态。
            // 旧版：.arco-modal 含"风险检测"文案 + radio "基础检测/全面检测" + 单独"确定"按钮。
            // 兼容两种容器：.arco-modal 与 [role="dialog"]；触发文案：风险检测/内容检测/基础检测/全面检测。
            const riskModal = targetPage.locator(
                [
                    '.arco-modal:has-text("风险检测")',
                    '.arco-modal:has-text("内容检测")',
                    '.arco-modal:has-text("基础检测")',
                    '.arco-modal:has-text("全面检测")',
                    '[role="dialog"]:has-text("请选择内容检测方式")',
                    '[role="dialog"]:has-text("基础检测")',
                    '[role="dialog"]:has-text("全面检测")',
                ].join(', ')
            ).first();
            if (await riskModal.isVisible().catch(()=>false)) {
                console.log("⚠️ 发现风险检测/内容检测弹窗...");

                // 优先级 1：直接命中"仅基础检测"按钮（新版主流形态）。
                const basicOnlyBtn = riskModal.locator('button:has-text("仅基础检测")').first();
                // 优先级 2：旧版 radio 形态 + 独立"确定"按钮。
                const basicRadio = riskModal.locator('.arco-radio:has-text("基础检测"), text=基础检测').first();
                // 兜底：任意含"基础检测"文字的按钮（避免 selector 没列全的极端文案）。
                const basicBtnFallback = riskModal.locator('button:has-text("基础检测")').first();

                let acted = false;
                let isNewFlow = false; // 新版点完按钮自动推进，不需要再等检测/再点发布。

                if (await basicOnlyBtn.isVisible().catch(()=>false)) {
                    console.log("👉 点击【仅基础检测】按钮（新版形态）...");
                    await basicOnlyBtn.click();
                    acted = true;
                    isNewFlow = true;
                } else if (await basicRadio.isVisible().catch(()=>false)) {
                    console.log("👉 点击【基础检测】radio（旧版形态）...");
                    await basicRadio.click();
                    await targetPage.waitForTimeout(500);
                    const confirmBtn = riskModal.locator(
                        'button:has-text("确定"), button:has-text("开始检测"), button:has-text("确认"), button:has-text("下一步")'
                    ).first();
                    if (await confirmBtn.isVisible().catch(()=>false)) {
                        console.log("👉 点击确认按钮启动检测...");
                        await confirmBtn.click();
                    }
                    acted = true;
                } else if (await basicBtnFallback.isVisible().catch(()=>false)) {
                    console.log("👉 命中含【基础检测】文字的按钮（兜底）...");
                    await basicBtnFallback.click();
                    acted = true;
                    isNewFlow = true;
                }

                if (!acted) {
                    // 实在识别不到基础检测入口才取消，避免误触发"全面检测"延迟。
                    const cancelBtn = riskModal.locator('button:has-text("取消")').first();
                    if (await cancelBtn.isVisible().catch(()=>false)) {
                        console.log("⚠️ 未识别基础检测入口，点击取消跳过本弹窗以待重试。");
                        await cancelBtn.click();
                    }
                }

                // 等检测弹窗自动隐藏（新版点完按钮立刻关闭并弹出"发布设置"；旧版会有检测中状态）。
                await riskModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(()=>{
                    console.log("ℹ️  检测弹窗未在 15s 内隐藏；继续尝试。");
                });

                if (!isNewFlow) {
                    // 旧版需要等检测结果反馈；新版无此环节，直接进入下一弹窗。
                    console.log("⏳ 等待旧版风险检测结果文案（最多 45s）...");
                    try {
                        await targetPage.waitForSelector(
                            'text=检测暂无风险, text=检测通过, text=暂无风险, text=无风险, text=检测完成',
                            { timeout: 45000 }
                        );
                        console.log("✅ 风险检测完成且无风险！");
                    } catch (e) {
                        console.log("⚠️ 未捕获明确的通过文案；继续按弹窗演进处理。");
                    }
                    // 旧版可能需要再点一次发布/下一步推进。
                    const nextBtn = targetPage.locator(
                        'button:has-text("发布"), button:has-text("下一步")'
                    ).first();
                    if (await nextBtn.isVisible().catch(()=>false)) {
                        await nextBtn.click({ timeout: 5000 }).catch((err) => {
                            console.log("ℹ️  跳过点击发布/下一步：" + (err.message || err).slice(0, 120));
                        });
                    }
                }
                await targetPage.waitForTimeout(1000);
            }

            // Handle Publish settings (AI declaration)
            // 同步兼容 .arco-modal 与 [role="dialog"] 两种容器。
            const publishModal = targetPage.locator(
                '.arco-modal:has-text("发布设置"), [role="dialog"]:has-text("发布设置")'
            ).first();
            if (await publishModal.isVisible().catch(()=>false)) {
                console.log("👉 发现发布设置，选择【否】不使用AI...");
                // 新版 radiogroup 不一定有 .arco-radio class，用多种 selector 兜底。
                const noAiRadio = publishModal.locator(
                    '.arco-radio:has-text("否"), label:has-text("否"), [role="radio"]:has-text("否")'
                ).first();
                if (await noAiRadio.isVisible().catch(()=>false)) {
                    await noAiRadio.click();
                    await targetPage.waitForTimeout(500);
                }

                console.log("🚀 点击【确认发布】按钮！");
                const confirmPublishBtn = publishModal.locator('button:has-text("确认发布"), button:has-text("提交")').first();
                if (await confirmPublishBtn.isVisible().catch(()=>false)) {
                    await confirmPublishBtn.click();
                    console.log("✅ 发布提交完成，等待网络响应...");
                    await targetPage.waitForTimeout(3000);
                    break;
                }
            }
        }

        console.log("✅ 脚本执行完毕。");
        await targetPage.waitForTimeout(3000);

    } catch (e) { 
        console.error("❌ 发生错误:", e); 
    } finally { 
        console.log("浏览器暂不关闭"); process.exit(0);
    }
})();
