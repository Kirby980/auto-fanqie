---
name: fanqie-publisher
description: Automate Fanqie Novel publishing with a staged-preview gate that guarantees WhatsApp-shown text ≡ Fanqie-published text.
allowed-tools: Bash(playwright-cli:*) Bash(node:*) Bash(python:*) Bash(go:*) Bash(fanqie-publisher:*)
---

# Fanqie Publisher Skill

自动化发布番茄小说章节的技能。本技能的**首要保证**：

> **老板在 WhatsApp 上看到的正文 ≡ 番茄后台发布出去的正文**。
>
> 这个等式由 CLI 的 `prepare → publish` 闸门在**代码层**强制实现，
> openclaw 无论如何都不允许绕过。

## 环境前置（已就绪，仅供确认）
- `fanqie-publisher` CLI：`which fanqie-publisher` 应返回 `/opt/homebrew/bin/fanqie-publisher`。
- `playwright-cli`：`which playwright-cli` 应返回 `/opt/homebrew/bin/playwright-cli`。
- Chrome 浏览器 + 持久化 profile（`~/.playwright/fanqie-profile`）：已登录过番茄作家后台。

## 🚫 禁令（违反 = 任务失败）

**绝对禁止** 用任何 MCP / 内置浏览器工具走 fanqie 发布流程：
- `mcp_openclaw_browser` 及任何 `browser.*` / `page.*` MCP 工具
- OpenClaw 内置的 Chrome profile
- 手动 goto、点击、填表模拟

**唯一合法路径**：`run_shell_command` → `fanqie-publisher prepare ...` → `fanqie-publisher publish ...`。

**绝对禁止** 在 `chapter.txt` 里写入以下尾注行（即使 CLI 会兜底过滤，也必须自律不写）：
- `第X章完` / `第X章终` / `第X章结` / `第X章束` / `第X章末`
- `本章字数：XXXX` / 单独一行的 `完` / `终`
- `（完）` / `(完)` / `（终）` / `(终)`

## 写入路径规范
- 章节正文 **必须** 覆盖写入到：`/Users/hyz/.openclaw/workspace/chapter.txt`。**只有一个** chapter.txt，每章覆盖。不要写 `/tmp/`、不要写 `chapter_<N>.txt`。
- 总稿备份 **必须** 追加到：`/Users/hyz/Desktop/重生1982.txt`。

## 预检
```bash
test -w /Users/hyz/.openclaw/workspace/ && echo "workspace writable"
test -w /Users/hyz/Desktop/重生1982.txt && echo "desktop writable"
```
如果任一失败，汇报「当前是只读模式，请切到 Default 模式（Shift+Tab）后重试」并停止。

## 工作流（严格按 4 步执行）

### 1. 生成正文并保存
```bash
cat > /Users/hyz/.openclaw/workspace/chapter.txt <<'EOF'
<正文内容>
EOF

printf "\n\n" >> /Users/hyz/Desktop/重生1982.txt
cat /Users/hyz/.openclaw/workspace/chapter.txt >> /Users/hyz/Desktop/重生1982.txt
```

### 2. 字数校验
```bash
fanqie-publisher validate --content-file /Users/hyz/.openclaw/workspace/chapter.txt --minHan 3000
```
- 成功：`{"ok":true,"step":"validate","hanCount":3050,...}`
- 失败（Exit 2）：`{"ok":false,"code":"CONTENT_TOO_SHORT",...}`

**失败处理（强制）**：
1. 先回滚桌面备份：
   ```bash
   APPENDED=$(wc -c < /Users/hyz/.openclaw/workspace/chapter.txt)
   ORIG=$(($(wc -c < /Users/hyz/Desktop/重生1982.txt) - APPENDED - 2))
   python3 -c "import os; os.truncate('/Users/hyz/Desktop/重生1982.txt', $ORIG)"
   ```
2. 立刻扩写到 >= 3000 汉字，**重写** `chapter.txt`，重走第 1、2 步。
3. 不允许放弃，不允许「让用户手动粘贴」的兜底方案。

### 3. Prepare —— 过滤并暂存，同步给老板确认
字数校验通过后，**必须**执行 prepare 命令：
```bash
fanqie-publisher prepare --content-file /Users/hyz/.openclaw/workspace/chapter.txt
```

这个命令做两件事：
- **stdout 打印过滤后正文**（= 番茄上发布出去的完整正文，字符级一致）
- **副作用**：在 `/Users/hyz/.openclaw/workspace/.chapter-staged.txt` 写入同一份正文作为发布暂存

**发给老板的 WhatsApp 消息里的正文段落，必须是这条命令的 stdout 原样复制。**
禁止自行重新生成、改写、删改；禁止把 `chapter.txt` 的原文直接发（那份还没过滤）。
前后可以写闲聊（「老板这章写完了」「反转够不够劲」），但正文段必须是 prepare stdout。

### 4. Publish —— 把已暂存的内容推到番茄
老板确认后执行：
```bash
fanqie-publisher publish \
  --novel "重生1982：我有一片禁忌海" \
  --volume "第三卷：轮回终结" \
  --title "第八十二章 针影之下，锈蚀的记忆"
```

注意：publish **不再接受** `--file` 参数（传了会被忽略 + 警告）。发布内容一律从第 3 步产生的 `.chapter-staged.txt` 读取。

**闸门行为（CLI 代码层强制）**：
| 情况 | 结果 |
|-----|-----|
| `.chapter-staged.txt` 不存在 | `NO_STAGED_CONTENT` 报错退出（code 3）；必须先 prepare |
| staged 文件超过 10 分钟 | `STAGED_EXPIRED` 报错退出（code 3）；必须重新 prepare |
| publish 成功 | 自动删除 staged 文件，下次必须重新 prepare |

因此：
- 如果 prepare 之后修改了 `chapter.txt`：publish 用的还是旧 staged（= WhatsApp 给老板看的）。要让新内容生效，**必须重新 prepare** → 贴新 stdout 给老板 → 再 publish。
- 如果跳过 prepare 直接 publish：CLI 拒绝。

#### 首次登录（profile 失效时）
```bash
playwright-cli open https://fanqienovel.com/main/writer/book-manage --browser=chrome --headed --persistent
```

## 故障排查
| 现象 | 原因 | 处置 |
|-----|-----|-----|
| validate 报 `CONTENT_TOO_SHORT` | 汉字数 < 3000 | 按「失败处理」扩写并重校 |
| publish 报 `NO_STAGED_CONTENT` | 没先 prepare | 运行 prepare → 贴 stdout 给老板 → 再 publish |
| publish 报 `STAGED_EXPIRED` | 暂存超 10 分钟 | 重新 prepare，确保 WhatsApp 展示与最终发布一致 |
| publish 卡在「等待页面加载」 | 登录 session 失效 | 跑一次首次登录命令重新授权 |
| `Cannot find module 'playwright'` | 绕过了 CLI 直接跑底层脚本 | 必须通过 `fanqie-publisher publish` 调用 |
| 写 `/tmp/` 或桌面被拒 | 运行在 Plan Mode / 沙盒 | 切到 Default 模式后重试 |

## 多语言引擎
默认 Node.js。需要 Go 引擎时追加 `--engine go`：
```bash
fanqie-publisher publish --engine go --novel "..." --volume "..." --title "..."
```
（staged 文件闸门同样生效，与引擎无关。）
