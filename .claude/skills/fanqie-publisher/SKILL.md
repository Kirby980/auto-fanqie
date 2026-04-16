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
fanqie-publisher validate --content-file chapter.txt --minHan 3000
```
- 成功输出: `{"ok":true,"step":"validate","hanCount":3050,...}`
- 失败输出 (Exit Code 2): `{"ok":false,"code":"CONTENT_TOO_SHORT","message":"正文汉字数不足..."}`

### 3. 使用 `playwright-cli` 自动发布
校验通过后，使用 `playwright-cli` 执行自动化点击与发布。
> **关键参数**：
> - `--headed`：强制显示浏览器窗口，避免反爬虫拦截，也能让用户看到发布过程。
> - `--persistent`：持久化上下文（通常存在 `~/.playwright/cli`），保留用户的登录状态。
> - `--browser=chrome`：强制调用系统本地安装的 Google Chrome 浏览器（而非默认的免安装 Chromium），进一步降低被平台识别为爬虫的风险，提供更真实的运行环境。

#### 首次登录（仅限用户首次使用）
如果用户尚未登录，请指导用户运行此命令，在弹出的窗口中扫码登录，登录后关闭窗口即可：
```bash
playwright-cli open https://writer.fanqienovel.com/ --browser=chrome --headed --persistent
```

#### 执行自动发布命令序列
依次执行以下交互命令（通过调用底层高效的原生 Node.js 脚本完成浏览器自动化操作，大幅节省 Token 消耗）：

```bash
# 1. 确保用户已经执行过持久化登录（见上文）。

# 2. 调用原生脚本进行自动化发布。
# 此脚本会使用真实的本地 Chrome 浏览器启动（受 --browser=chrome 驱动），
# 并通过真实的鼠标点击和键盘输入模拟用户行为，极难被反爬虫系统检测。
fanqie-publisher publish --novel "小说名称" --volume "分卷名称" --title "章节标题" --file "chapter.txt"
```

## 多语言集成示例
如果需要通过 Python 或 Go 脚本驱动整个流程（适用于需要封装为外部工具的场景），请参考 `wrappers/publish.py` 和 `wrappers/publish.go`。它们展示了如何用子进程调用 `validate.js`，成功后再连续调用 `playwright-cli`。