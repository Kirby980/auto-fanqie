# 番茄小说自动发布 Skill (Fanqie Novel Auto-Publish)

这是一个基于 `playwright-cli` 开发的自动化脚本/Skill，用于在番茄小说作家后台实现全自动的章节发布流程。它严格遵循“业务字数校验 -> `playwright-cli` 前台可视化+持久化发布”的工作流。

## 核心功能

该 Skill 支持从小说内容生成、校验到最终发布的全套流程：
1. **自动生成与字数校验**：生成正文并调用 `validate.js` 强制字数校验（默认 >= 3000字）。
2. **基于 playwright-cli 的自动发布**：
   - 使用 `--headed` 强制显示浏览器窗口，提供真实运行环境。
   - 使用 `--persistent` 保持用户登录状态，免去重复扫码。
   - 使用 `--browser=chrome` 调用系统本地 Chrome 浏览器，降低反爬拦截风险。
3. **全自动弹窗与流程处理**：
   - 自动进入指定小说和分卷。
   - 自动点击新建章节、输入标题和从文件读取正文。
   - 自动处理“错别字”提示、“内容风险检测”以及“发布设置（不使用 AI）”。

---

## 快速开始

### 1. 环境要求
- [Node.js](https://nodejs.org/) (建议版本 v16 或以上)
- 已经安装好的本地 Google Chrome 浏览器

### 2. 在新服务器上安装与部署

如果你想在另一台服务器或其他电脑上运行此 Skill，或者想在别的项目中复用它，你可以通过 npm 直接安装（将此代码库作为模块）：

#### 步骤一：全局安装 Playwright CLI
由于自动化流程依赖 `@playwright/cli` 控制浏览器，你需要在全局先安装它：
```bash
npm install -g @playwright/cli@latest
```
运行 `playwright-cli --help` 验证是否成功。如果需要安装底层浏览器依赖，可以运行 `npx playwright install-deps`。

#### 步骤二：安装 fanqie-publisher
将当前仓库克隆下来，并在根目录进行全局安装：
```bash
git clone <你的仓库地址>
cd <你的项目目录>
npm install -g .
```

#### 步骤三：在你的 AI 编码助手中安装 Skill
安装成功后，你可以通过自带的 CLI 命令一键将该 Skill 安装到当前项目的 `.claude/skills` 中：
```bash
fanqie-publisher install --skills
```
安装完成后，你可以直接在命令行对 Claude Code 等说：“使用 fanqie-publisher skill 帮我生成并发布小说到番茄后台”。

---

## 如何使用

### 1. 首次登录（仅限首次使用）
如果你是第一次使用该环境，必须先执行一次持久化登录命令。运行以下命令后，在弹出的 Chrome 窗口中扫码或输入密码登录番茄作家后台，登录成功后直接关闭窗口即可。登录状态将被持久化保存在本地。
```bash
playwright-cli open https://writer.fanqienovel.com/ --browser=chrome --headed --persistent
```

### 2. 脚本配置调整
在运行发布脚本之前，你需要根据自己的实际情况修改脚本中的核心变量，例如小说名称和分卷。

### 3. 运行自动发布流程
你无需手写底层的 Playwright 启动代码，而是通过 `playwright-cli` 执行自动化命令序列。
例如，可以通过 bash 脚本或 Node.js 封装连续调用 `playwright-cli` 的点击和填充指令来完成发布：

```bash
# 1. 使用持久化状态打开后台
playwright-cli open https://writer.fanqienovel.com/ --browser=chrome --headed --persistent

# 2. 找到对应的小说并点击（如《重生1982：我有一片禁忌海》）
playwright-cli click "text=重生1982：我有一片禁忌海"

# 3. 点击章节管理并新建章节
playwright-cli click "text=章节管理"
playwright-cli click "text=新建章节"

# 4. 填写标题和正文
playwright-cli fill "input[placeholder*='请输入标题']" "第001章 你的标题"
playwright-cli eval "el => el.value = require('fs').readFileSync('chapter.txt', 'utf8')" "textarea" # 或实际的编辑器选择器

# 5. 点击发布并处理弹窗
playwright-cli click "text=发布"
# 后续弹窗点击...
```
*(注：项目中也提供了封装好的 Node/Python 脚本直接调用这些 CLI 指令，你可以直接运行封装好的脚本如 `node fanqie-test/create_chapter.js`（需确保脚本内部已适配 cli 调用方式）。)*

---

## 常见问题 (FAQ)

**Q: 为什么运行脚本后卡在“等待页面加载”不动了？**
A: 可能是因为网络延迟或需要手动登录。脚本设置了 60 秒的超时等待，请确保在这个时间内完成了扫码或密码登录，且页面成功跳转到了包含“我的小说”列表的工作台。

**Q: 在服务器运行报错：缺少 libXXX.so 共享库？**
A: 你的服务器缺少运行 Chromium 所需的系统依赖。请在项目目录下运行 `npx playwright install-deps` 自动补全系统依赖。

**Q: 新建分卷或点击发布时，元素找不到报错？**
A: 番茄作家后台的 DOM 结构可能会随时间更新。如果遇到此类报错，请开启浏览器的开发者工具检查对应的类名或文本是否发生了变化，并在 `create_chapter.js` 中微调对应的 `page.locator()`。
