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
        // 第三步：进入写作（新建章节）页面并发布
        // ==========================================
        console.log("👉 正在进入新建章节编辑器页面...");
        
        // 等待输入标题的区域出现，代表进入了第三个页面
        await page.waitForSelector('text=请输入标题', { timeout: 30000 });
        console.log("✅ 成功进入第三个页面（章节编辑页）！");

        // 模拟填写标题和正文
        // 假设这里你已经自动填充了内容，我们将点击右上角的“下一步”或“发布”按钮
        console.log("👉 点击右上角的发布/下一步按钮...");
        // 找到页面右上角的按钮，通常文本是“发布”或“下一步”
        const publishBtn = page.locator('button').filter({ hasText: /发布|下一步/ }).first();
        await publishBtn.click();

        // ------------------------------------------
        // 处理各种可能弹出的发布检测弹窗
        // ------------------------------------------
        
        // 1. 错别字提示弹窗 (可能出现)
        // 弹窗文本: "检测到你还有错别字未修改，是否确定提交？"
        try {
            console.log("🔍 检测是否出现【错别字】提示弹窗...");
            const typoModal = page.locator('.arco-modal:has-text("检测到你还有错别字未修改")');
            await typoModal.waitFor({ state: 'visible', timeout: 3000 });
            console.log("⚠️ 出现错别字提示，点击【提交】继续...");
            // 点击橙色的“提交”按钮
            await typoModal.locator('button').filter({ hasText: '提交' }).click();
        } catch (e) {
            console.log("✅ 无错别字提示，继续下一步...");
        }

        // 2. 内容风险检测弹窗 (必定出现)
        // 弹窗文本: "是否进行内容风险检测？"
        try {
            console.log("🔍 检测是否出现【内容风险检测】弹窗...");
            const riskModal = page.locator('.arco-modal:has-text("是否进行内容风险检测")');
            await riskModal.waitFor({ state: 'visible', timeout: 5000 });
            console.log("⚠️ 出现风险检测提示，点击【确定】...");
            // 点击橙色的“确定”按钮
            await riskModal.locator('button').filter({ hasText: '确定' }).click();
            
            // 等待页面顶部出现“检测暂无风险，可发布或继续修改”的绿色提示横幅
            console.log("⏳ 等待风险检测完成...");
            await page.waitForSelector('text=检测暂无风险', { timeout: 15000 });
            console.log("✅ 风险检测完成且无风险！");
            
            // 检测完成后，需要再次点击右上角的“下一步/发布”按钮进入最终发布设置
            console.log("👉 再次点击右上角的发布/下一步按钮...");
            await publishBtn.click();
        } catch (e) {
            console.log("⚠️ 未捕获到风险检测弹窗，可能已跳过或由于其他原因未显示...");
        }

        // 3. 最终发布设置弹窗 (必定出现)
        // 弹窗标题: "发布设置" -> 包含 "是否使用AI" 单选框
        try {
            console.log("🔍 等待【发布设置】最终弹窗出现...");
            const publishSettingModal = page.locator('.arco-modal:has-text("发布设置")');
            await publishSettingModal.waitFor({ state: 'visible', timeout: 5000 });
            
            console.log("👉 在发布设置中，选择【否】不使用AI...");
            // 根据第三张截图，“是否使用AI”有两个单选框，我们需要点击“否”对应的单选框
            // 这里使用更精确的定位，找到包含“否”文本的 radio 组件并点击
            const noAiRadio = publishSettingModal.locator('.arco-radio:has-text("否")');
            await noAiRadio.click();
            
            console.log("🚀 点击【确认发布】按钮！");
            // 点击右下角橙色的“确认发布”按钮
            await publishSettingModal.locator('button').filter({ hasText: '确认发布' }).click();
            
            console.log("🎉 章节发布流程执行完毕！");
        } catch (e) {
            console.error("❌ 最终发布设置弹窗处理失败:", e);
        }

    } catch (error) {
        console.error("❌ 发生错误:", error);
    } finally {
        console.log("🛑 脚本执行完毕。浏览器将在 10 秒后关闭...");
        await page.waitForTimeout(10000); // 停留10秒以便观察
        await browser.close();
    }
})();
