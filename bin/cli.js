#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { filterChapterText } = require('../fanqie-skill/lib/filterChapter');
const { countHanCharacters } = require('../fanqie-skill/lib/hanCount');

const WORKSPACE = '/Users/hyz/.openclaw/workspace';
const STAGED_PATH = path.join(WORKSPACE, '.chapter-staged.txt');
const STAGED_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const MIN_HAN = 3000;

const args = process.argv.slice(2);

if (args.length === 0) {
    showHelp();
    process.exit(0);
}

if (args[0] === 'install' && args[1] === '--skills') {
    const userProjectDir = process.cwd();

    const claudeTargetDir = path.join(userProjectDir, '.claude', 'skills', 'fanqie-publisher');
    fs.mkdirSync(claudeTargetDir, { recursive: true });

    const openclawTargetDir = path.join(userProjectDir, 'skills', 'fanqie-publisher');
    fs.mkdirSync(openclawTargetDir, { recursive: true });

    const sourceSkillPath = path.join(__dirname, '../.claude/skills/fanqie-publisher/SKILL.md');

    if (!fs.existsSync(sourceSkillPath)) {
        console.error(`❌ Error: Source SKILL.md not found at ${sourceSkillPath}`);
        process.exit(1);
    }

    const claudeTargetSkillPath = path.join(claudeTargetDir, 'SKILL.md');
    fs.copyFileSync(sourceSkillPath, claudeTargetSkillPath);

    const openclawTargetSkillPath = path.join(openclawTargetDir, 'SKILL.md');
    fs.copyFileSync(sourceSkillPath, openclawTargetSkillPath);

    console.log(`✅ [fanqie-publisher] Skill successfully installed for Claude Code at ${claudeTargetSkillPath}`);
    console.log(`✅ [fanqie-publisher] Skill successfully installed for OpenClaw at ${openclawTargetSkillPath}`);
    console.log(`💡 You can now ask Claude Code, OpenClaw, or Copilot to use the 'fanqie-publisher' skill!`);
    process.exit(0);
}

if (args[0] === 'validate') {
    const validateScript = path.join(__dirname, '../fanqie-skill/validate.js');
    const result = spawnSync('node', [validateScript, ...args.slice(1)], { stdio: 'inherit' });
    process.exit(result.status || 0);
}

if (args[0] === 'prepare') {
    let contentFile = '';
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--content-file' && args[i + 1]) {
            contentFile = args[i + 1];
            i++;
        }
    }

    if (!contentFile) {
        console.error('❌ prepare: 必须提供 --content-file <path>');
        process.exit(1);
    }
    if (!fs.existsSync(contentFile)) {
        console.error(`❌ prepare: 找不到内容文件 ${contentFile}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(contentFile, 'utf8');
    const filtered = filterChapterText(raw);

    if (filtered.trim() === '') {
        console.error('❌ prepare: 过滤后正文为空，拒绝暂存');
        process.exit(2);
    }

    fs.mkdirSync(WORKSPACE, { recursive: true });
    // Normalize to end with a single newline so stdout and staged file are byte-identical.
    const canonical = filtered.endsWith('\n') ? filtered : filtered + '\n';
    fs.writeFileSync(STAGED_PATH, canonical, 'utf8');

    // stdout: 过滤后正文（= staged file 内容，字符级一致，原样粘贴给老板）
    process.stdout.write(canonical);

    // stderr: 机器可读摘要
    const hanCount = (canonical.match(/[\p{Script=Han}]/gu) || []).length;
    console.error(`\n[prepare] staged=${STAGED_PATH} han=${hanCount}`);
    process.exit(0);
}

if (args[0] === 'publish') {
    let engine = 'node';
    let publishArgs = [];
    let userProvidedFile = '';

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--engine') {
            engine = args[i + 1];
            i++;
        } else if (args[i].startsWith('--engine=')) {
            engine = args[i].split('=')[1];
        } else if (args[i] === '--file') {
            userProvidedFile = args[i + 1];
            i++;
        } else {
            publishArgs.push(args[i]);
        }
    }

    // ── GATE: 必须先 prepare 才能 publish ──
    if (!fs.existsSync(STAGED_PATH)) {
        console.error(`❌ [gate] NO_STAGED_CONTENT`);
        console.error(`   发布前必须先运行:`);
        console.error(`     fanqie-publisher prepare --content-file <chapter.txt>`);
        console.error(`   然后把命令的 stdout 原样发给老板做最终确认，确认后再 publish。`);
        process.exit(3);
    }

    const stagedStat = fs.statSync(STAGED_PATH);
    const age = Date.now() - stagedStat.mtimeMs;
    if (age > STAGED_MAX_AGE_MS) {
        console.error(`❌ [gate] STAGED_EXPIRED (${Math.round(age / 60000)} 分钟前暂存)`);
        console.error(`   暂存内容已过期，请重新运行 prepare 以保证 WhatsApp 展示 = 发布内容。`);
        process.exit(3);
    }

    if (userProvidedFile) {
        console.error(`⚠️  --file 已被忽略（新流程从 ${STAGED_PATH} 读取）`);
    }

    // ── GATE: belt-and-suspenders — 即使 prepare 过，也要再核一遍 staged 的汉字数。
    // 防止 prepare 被调用时用的是短章节，或 staged 被人手动替换成短内容。
    const stagedContent = fs.readFileSync(STAGED_PATH, 'utf8');
    const stagedHan = countHanCharacters(stagedContent);
    if (stagedHan < MIN_HAN) {
        console.error(`❌ [gate] STAGED_TOO_SHORT (${stagedHan} 汉字 < 要求 ${MIN_HAN})`);
        console.error(`   暂存内容字数不足。请扩写 chapter.txt 到 >= ${MIN_HAN} 汉字，然后重新:`);
        console.error(`     fanqie-publisher prepare --content-file /Users/hyz/.openclaw/workspace/chapter.txt`);
        console.error(`     fanqie-publisher publish --novel "..." --title "..."`);
        process.exit(4);
    }

    // ── GATE: staged 必须是 prepare 的产物 —— 过滤器幂等性检查。
    // 如果有人绕过 prepare 直接把原始正文（含"第X章标题"/"第X章完"/多余空行）写进 staged,
    // 再次过滤一定会改变内容，这里直接拒发。
    const reFiltered = filterChapterText(stagedContent);
    const stagedTrimmed = stagedContent.replace(/\n+$/, '').trim();
    const reFilteredTrimmed = reFiltered.replace(/\n+$/, '').trim();
    if (stagedTrimmed !== reFilteredTrimmed) {
        console.error(`❌ [gate] STAGED_NOT_FILTERED`);
        console.error(`   暂存内容不是 prepare 的输出（可能被手动替换/跳过 prepare 写入）。`);
        console.error(`   再次过滤后长度 ${reFilteredTrimmed.length} ≠ staged 长度 ${stagedTrimmed.length}。`);
        console.error(`   请重新运行: fanqie-publisher prepare --content-file chapter.txt`);
        process.exit(5);
    }

    publishArgs.push('--file', STAGED_PATH);

    // 给子进程（create_chapter.js / main.go）一个"合法入口"的签名，
    // 它们会检查此 env 变量，防止 agent 把脚本复制到 workspace 后直接 node/go run 绕过闸门。
    const childEnv = { ...process.env, FANQIE_CLI_INVOKED: '1' };

    if (engine === 'go') {
        const goScript = path.join(__dirname, '../fanqie-go/main.go');
        console.log(`🚀 Using Go engine to publish staged content...`);
        const result = spawnSync('go', ['run', goScript, ...publishArgs], { stdio: 'inherit', env: childEnv });
        if ((result.status || 0) === 0) {
            try { fs.unlinkSync(STAGED_PATH); } catch (_) {}
        }
        process.exit(result.status || 0);
    }

    const createChapterScript = path.join(__dirname, '../fanqie-test/create_chapter.js');
    console.log(`🚀 Using Node.js engine to publish staged content...`);
    const result = spawnSync('node', [createChapterScript, ...publishArgs], { stdio: 'inherit', env: childEnv });
    if ((result.status || 0) === 0) {
        try {
            fs.unlinkSync(STAGED_PATH);
            console.log(`🧹 已清理暂存 ${STAGED_PATH}`);
        } catch (_) {}
    }
    process.exit(result.status || 0);
}

showHelp();

function showHelp() {
    console.log(`
========================================
 📖 Fanqie Publisher CLI
========================================

Usage:
  fanqie-publisher install --skills      Install skill into ./skills & ./.claude/skills
  fanqie-publisher validate [options]    Validate chapter content length
  fanqie-publisher prepare [options]     Filter chapter → stage for publish + preview stdout
  fanqie-publisher publish [options]     Publish the staged chapter (requires prepare first)

Validate Options:
  --content-file <path>                  File to read content from
  --minHan <number>                      Minimum Chinese characters (default: 3000)

Prepare Options:
  --content-file <path>                  Raw chapter.txt to filter & stage
                                          stdout: the exact text that will be published
                                          side effect: writes ${STAGED_PATH}

Publish Options:
  --engine <node|go>                     Runtime engine (default: node)
  --novel "Novel Name"                   Name of the novel
  --volume "Volume Name"                 Name of the volume (auto-created in Fanqie
                                          backend if it does not exist)
  --title "Chapter Title"                Chapter title
  (no --file)                            Reads staged content from
                                          ${STAGED_PATH}

Gate:
  publish refuses to run without a fresh (<10 min) staged file.
  That is how we guarantee: WhatsApp preview === Fanqie published content.

Exit codes:
  0  success
  3  NO_STAGED_CONTENT / STAGED_EXPIRED  (run prepare first / re-prepare)
  4  STAGED_TOO_SHORT (<3000 han) OR VOLUME_CREATE_FAILED
  5  STAGED_NOT_FILTERED (staged bypass; re-run prepare)
 10  low-level script invoked outside CLI
`);
}
