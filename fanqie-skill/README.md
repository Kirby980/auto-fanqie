# fanqie-skill

用于让 AI 生成符合规范的小说章节，并在满足字数门槛后，通过 Playwright 自动化发布到番茄小说作家后台。

## 安装

```bash
cd fanqie-skill
npm i
npx playwright install
```

## 登录初始化（本地手动一次）

```bash
node bin/fanqie-skill.js login --profile .fanqie-profile
```

命令会打开浏览器窗口。完成登录后关闭窗口即可。登录态会保存在 `--profile` 目录中。

## 校验（>= 3000 汉字）

```bash
node bin/fanqie-skill.js validate --content-file chapter.txt --minHan 3000
```

不满足时退出码为 2，并输出 JSON：

```json
{"ok":false,"code":"CONTENT_TOO_SHORT","message":"...","hanCount":123,"minHan":3000}
```

## 发布（草稿/正式发布）

```bash
node bin/fanqie-skill.js publish --book "你的书名" --title "第001章 标题" --content-file chapter.txt --mode draft --profile .fanqie-profile
```

将 `--mode draft` 改为 `--mode publish` 会点击“发布章节”。

## 选择器更新（平台改版时）

推荐用 Playwright 的录制器重新抓选择器：

```bash
npx playwright codegen https://writer.fanqienovel.com/
```

把新选择器更新到 [default.json](file:///workspace/fanqie-skill/config/default.json) 的 `selectors` 字段即可。
