const { chromium } = require('playwright');

(async () => {
    console.log("🚀 启动浏览器...");
    // 建议在本地运行时将 headless 设为 false，以便你可以手动登录
    const browser = await chromium.launch({ headless: false }); 
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("🌐 访问番茄小说作家后台...");
        await page.goto("https://writer.fanqienovel.com/workspace", { timeout: 60000 });

        console.log("⏳ 等待页面加载（如果需要登录，请在此期间完成登录）...");
        // 等待“我的小说”字样出现，确保已经登录并进入了主工作台
        await page.waitForSelector('text=我的小说', { timeout: 60000 });

        // ==========================================
        // 第一步：选择对应名字的小说，点击“章节管理”
        // ==========================================
        const novelName = "重生1982：我有一片禁忌海";
        console.log(`📖 查找小说: ${novelName} 并点击章节管理...`);
        
        // 查找包含小说名字的卡片区块
        // 实际 DOM 结构可能有所不同，这里使用通用方法：找到包含该书名的卡片，并在该卡片内点击“章节管理”按钮
        const novelCard = page.locator('div').filter({ hasText: novelName }).last();
        
        // 点击章节管理按钮（这里也可以使用 getByRole('button', { name: '章节管理' })）
        const chapterManageBtn = novelCard.getByText('章节管理').first();
        await chapterManageBtn.click();

        // ==========================================
        // 第二步：章节管理页面，确认分卷后点击“新建章节”
        // ==========================================
        console.log("👉 正在进入章节管理页面...");
        
        // 等待“新建章节”按钮出现，这代表第二页已经加载完毕
        await page.waitForSelector('text=新建章节', { timeout: 30000 });
        
        // ------------------------------------------
        // 分卷处理逻辑：检查并新建分卷
        // ------------------------------------------
        const targetVolumeName = "第四卷：新的开始"; // 目标分卷名称
        console.log(`🔍 检查当前分卷是否为: ${targetVolumeName}`);
        
        // 点击分卷下拉框，展开分卷列表
        // 注意：根据第二张截图，这个下拉框默认显示当前分卷（如"第三卷：轮回终结"）
        const volumeDropdown = page.locator('.arco-select').first(); 
        await volumeDropdown.click();
        
        // 等待下拉列表出现
        await page.waitForTimeout(1000);
        
        // 检查目标分卷是否存在于下拉列表中
        const volumeExists = await page.locator('.arco-select-option').filter({ hasText: targetVolumeName }).isVisible();
        
        if (volumeExists) {
            console.log(`✅ 找到分卷: ${targetVolumeName}，直接选择`);
            await page.locator('.arco-select-option').filter({ hasText: targetVolumeName }).click();
        } else {
            console.log(`⚠️ 未找到分卷: ${targetVolumeName}，准备新建分卷...`);
            // 关闭下拉框 (点击页面空白处)
            await page.mouse.click(0, 0);
            await page.waitForTimeout(500);
            
            // 点击右上角的“编辑分卷”按钮
            console.log("👉 点击“编辑分卷”按钮...");
            await page.locator('button').filter({ hasText: '编辑分卷' }).click();
            
            // 等待分卷弹窗出现（根据第一张截图，弹窗标题为"分卷"）
            await page.waitForSelector('div.arco-modal:has-text("分卷")', { timeout: 10000 });
            
            // 点击左下角的“+ 新建分卷”按钮
            console.log("👉 在分卷弹窗中点击“+ 新建分卷”...");
            await page.locator('.arco-modal').getByText('新建分卷').click();
            
            // 在新出现的分卷输入框中输入新分卷名称
            // 通常新建的分卷输入框会出现在列表的最上方或者是一个新的输入框
            console.log(`👉 输入新分卷名称: ${targetVolumeName}`);
            // 假设新分卷出现一个空的 input
            const newVolumeInput = page.locator('.arco-modal input[value=""]').first();
            await newVolumeInput.fill(targetVolumeName);
            
            // 点击弹窗右下角的“确定”按钮保存分卷
            console.log("👉 点击弹窗“确定”按钮保存...");
            await page.locator('.arco-modal button').filter({ hasText: '确定' }).click();
            
            // 等待弹窗关闭和接口响应
            await page.waitForTimeout(2000); 
            
            // 再次打开分卷下拉框并选择刚创建的分卷
            await volumeDropdown.click();
            await page.waitForTimeout(1000);
            await page.locator('.arco-select-option').filter({ hasText: targetVolumeName }).click();
            console.log(`✅ 成功选择新建的分卷: ${targetVolumeName}`);
        }

        console.log("👉 确认分卷无误，点击“新建章节”按钮...");
        // 匹配橙色的“新建章节”按钮并点击
        const newChapterBtn = page.locator('button').filter({ hasText: '新建章节' }).first();
        await newChapterBtn.click();

        // ==========================================
        // 第三步：进入写作（新建章节）页面
        // ==========================================
        console.log("👉 正在进入新建章节编辑器页面...");
        
        // 等待输入标题的区域出现，代表进入了第三个页面
        await page.waitForSelector('text=请输入标题', { timeout: 30000 });
        console.log("✅ 成功进入第三个页面（章节编辑页）！");

        // 可以在这里继续编写输入标题和正文的自动化代码
        // 例如：
        // await page.getByPlaceholder('请输入标题').fill('第xx章 标题');
        // await page.locator('.ql-editor').fill('正文内容...');

    } catch (error) {
        console.error("❌ 发生错误:", error);
    } finally {
        console.log("🛑 脚本执行完毕。浏览器将在 10 秒后关闭...");
        await page.waitForTimeout(10000); // 停留10秒以便观察
        await browser.close();
    }
})();
