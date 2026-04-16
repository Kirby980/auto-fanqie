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
        
        // （可选）检查或选择分卷
        // console.log("🔍 检查分卷信息...");
        // 如果需要切换分卷，可以在这里添加点击下拉框和选择卷的代码

        console.log("👉 点击“新建章节”按钮...");
        // 根据图片，“新建章节”是一个明显的橙色按钮
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
