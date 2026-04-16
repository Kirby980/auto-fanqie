---
name: fanqie-publisher
description: Automate Fanqie Novel publishing workflow via playwright-cli, with built-in character count validation.
allowed-tools: Bash(playwright-cli:*) Bash(node:*) Bash(python:*) Bash(go:*)
---

# Fanqie Publisher Skill

这是一个为 AI（OpenClaw, Codex, ClaudeCode）设计的自动化发布技能。
它强制执行“业务字数校验 -> `playwright-cli` 前台可视化+持久化发布”的工作流。

## 工作流 (Workflow)

当用户要求“生成一章小说并发布到番茄”时，请严格按照以下 3 步执行：

### 1. 生成并保存正文
将 AI 生成的小说内容保存到本地文件（如 `chapter.txt`）。

### 2. 字数校验 (Validation)
调用提供的校验脚本。**如果校验失败（字数不足），请根据报错信息主动扩写、重写小说内容，直到满足字数要求（默认 >= 3000 字）。**
```bash
node validate.js --content-file chapter.txt --minHan 3000
```
- 成功输出: `{"ok":true,"step":"validate","hanCount":3050,...}`
- 失败输出 (Exit Code 2): `{"ok":false,"code":"CONTENT_TOO_SHORT","message":"正文汉字数不足..."}`

### 3. 使用 `playwright-cli` 自动发布
校验通过后，使用 `playwright-cli` 执行自动化点击与发布。
> **关键参数**：
> - `--headed`：强制显示浏览器窗口，避免反爬虫拦截，也能让用户看到发布过程。
> - `--persistent`：持久化上下文（通常存在 `~/.playwright/cli`），保留用户的登录状态。

#### 首次登录（仅限用户首次使用）
如果用户尚未登录，请指导用户运行此命令，在弹出的窗口中扫码登录，登录后关闭窗口即可：
```bash
playwright-cli open https://writer.fanqienovel.com/ --headed --persistent
```

#### 执行自动发布命令序列
依次执行以下交互命令（请根据实际页面微调选择器，或使用 `playwright-cli codegen` 获取最新选择器）：

```bash
# 1. 打开带有持久化登录态和可视化界面的浏览器，进入作家后台
playwright-cli open https://writer.fanqienovel.com/ --headed --persistent

# 2. 找到对应的小说（假设书名为《我的修仙日常》）并点击
playwright-cli click "text=《我的修仙日常》"

# 3. 点击新建章节
playwright-cli click "text=新建章节"

# 4. 填写标题
playwright-cli fill "input[placeholder*='章节名称']" "第001章 标题"

# 5. 填写正文（此处使用 Node.js eval 从文件读取内容并填入，避免长文本在 CLI 中转义出错）
playwright-cli eval "el => el.value = require('fs').readFileSync('chapter.txt', 'utf8')" "textarea[placeholder*='正文']"

# 6. 点击存草稿（或者改为 'text=发布章节' 正式发布）
playwright-cli click "text=存草稿"

# 7. 等待保存成功后关闭浏览器
playwright-cli wait 2000
playwright-cli close
```

## 多语言集成示例
如果需要通过 Python 或 Go 脚本驱动整个流程（适用于需要封装为外部工具的场景），请参考 `wrappers/publish.py` 和 `wrappers/publish.go`。它们展示了如何用子进程调用 `validate.js`，成功后再连续调用 `playwright-cli`。