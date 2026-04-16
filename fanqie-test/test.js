const { chromium } = require('playwright');

(async () => {
    console.log("🚀 启动浏览器...");
    // 在沙盒环境中必须使用无头模式
    const browser = await chromium.launch({ headless: true }); 
    const page = await browser.newPage();
    
    try {
        console.log("🌐 访问番茄小说作家后台...");
        await page.goto("https://writer.fanqienovel.com/", { timeout: 30000 });
        
        console.log("⏳ 等待页面加载...");
        await page.waitForLoadState('networkidle');
        
        const title = await page.title();
        console.log("📄 当前页面标题: ", title);
        
        console.log("📸 正在截图保存为 login_page.png...");
        await page.screenshot({ path: 'login_page.png' });
        
        console.log("✅ 测试完成！截图已保存。");
    } catch (error) {
        console.error("❌ 发生错误:", error);
    } finally {
        await browser.close();
    }
})();