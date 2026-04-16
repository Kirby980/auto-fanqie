---
name: fanqie-publisher
description: 规范化生成番茄小说章节（>=3000 汉字）并通过 Playwright 自动化发布到番茄作家后台。
allowed-tools: Bash(node:*) Bash(npm:*) Bash(npx:*)
---

# Fanqie Publisher

## 目标

- 让 AI 产出可发布的章节正文（中文汉字数 >= 3000）
- 不满足字数时，直接返回可用于“打回去重写”的结构化错误
- 满足字数后，调用 Playwright 自动化脚本在番茄作家后台创建章节并保存草稿或发布

## 输入与输出规范

- 输入
  - `book`：作品名（作家后台展示的名称）
  - `title`：章节标题
  - `content`：章节正文（纯文本，建议不含 Markdown 语法；段落用空行分隔）
- 输出
  - 所有命令输出最后一行均为 JSON，便于 OpenClaw/Codex/ClaudeCode 解析
  - 校验不通过时退出码为 `2`，并输出 `code=CONTENT_TOO_SHORT`

## 初始化（本地手动一次）

```bash
cd fanqie-skill
npm i
npx playwright install
node bin/fanqie-skill.js login --profile .fanqie-profile
```

登录窗口中完成登录/验证码后，关闭浏览器窗口结束命令。登录态保存在 `--profile` 指定目录。

## 工作流（AI 应执行）

1. 生成章节正文与标题
2. 将正文写入本地文件（例如 `chapter.txt`）
3. 运行校验：不足 3000 汉字则重写并回到第 1 步
4. 校验通过后执行发布（默认存草稿）

### 1) 校验

```bash
node fanqie-skill/bin/fanqie-skill.js validate --content-file chapter.txt --minHan 3000
```

校验失败示例（退出码 2）：

```json
{"ok":false,"code":"CONTENT_TOO_SHORT","message":"正文汉字数不足：当前 123，要求 >= 3000。请重写并扩写至满足字数要求后再发布。","hanCount":123,"minHan":3000}
```

### 2) 发布

存草稿：

```bash
node fanqie-skill/bin/fanqie-skill.js publish --book "你的书名" --title "第001章 标题" --content-file chapter.txt --mode draft --profile fanqie-skill/.fanqie-profile
```

正式发布：

```bash
node fanqie-skill/bin/fanqie-skill.js publish --book "你的书名" --title "第001章 标题" --content-file chapter.txt --mode publish --profile fanqie-skill/.fanqie-profile
```

## 平台改版时如何更新选择器

用录制器重新抓取选择器：

```bash
npx playwright codegen https://writer.fanqienovel.com/
```

将录制得到的选择器更新到 `fanqie-skill/config/default.json` 的 `selectors` 字段。
