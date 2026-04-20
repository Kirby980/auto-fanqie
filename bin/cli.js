#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

if (args.length === 0) {
    showHelp();
    process.exit(0);
}

if (args[0] === 'install' && args[1] === '--skills') {
    // Install Claude Code & OpenClaw skill
    const userProjectDir = process.cwd();
    
    // For Claude Code
    const claudeTargetDir = path.join(userProjectDir, '.claude', 'skills', 'fanqie-publisher');
    fs.mkdirSync(claudeTargetDir, { recursive: true });

    // For OpenClaw
    const openclawTargetDir = path.join(userProjectDir, 'skills', 'fanqie-publisher');
    fs.mkdirSync(openclawTargetDir, { recursive: true });

    // Locate the SKILL.md in the package installation directory
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
    // Run the validate.js script from fanqie-skill
    const validateScript = path.join(__dirname, '../fanqie-skill/validate.js');
    const result = spawnSync('node', [validateScript, ...args.slice(1)], { stdio: 'inherit' });
    process.exit(result.status || 0);
}

if (args[0] === 'publish') {
    let engine = 'node';
    let publishArgs = [];

    // Parse out --engine if present
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--engine') {
            engine = args[i + 1];
            i++; // skip the value
        } else if (args[i].startsWith('--engine=')) {
            engine = args[i].split('=')[1];
        } else {
            publishArgs.push(args[i]);
        }
    }

    // ── 硬性规范化：workspace 里只能有一个 chapter.txt ──
    // 1. 如果 --file 指到了 chapter_N.txt / chapter83.txt 这种临时文件，
    //    复制内容到 chapter.txt，然后把 --file 改成 chapter.txt
    // 2. 删掉 workspace 里所有 chapter*.txt（除了 chapter.txt 本身）
    // 完全本地 shell 操作，零 LLM token。
    try {
        const workspace = '/Users/hyz/.openclaw/workspace';
        const canonical = path.join(workspace, 'chapter.txt');

        // Find --file arg index
        const fileIdx = publishArgs.findIndex(a => a === '--file');
        if (fileIdx >= 0 && fileIdx + 1 < publishArgs.length) {
            const given = publishArgs[fileIdx + 1];
            const resolved = path.resolve(given);
            if (resolved !== canonical && fs.existsSync(resolved)) {
                // Copy content to canonical chapter.txt (overwrite)
                fs.copyFileSync(resolved, canonical);
                console.log(`🧹 [normalize] --file ${given} → 已复制到 ${canonical}`);
                publishArgs[fileIdx + 1] = canonical;
            }
        }

        // Sweep stray chapter_*.txt / chapter<digits>.txt
        if (fs.existsSync(workspace)) {
            const strayRe = /^chapter[^.]*\.txt$/i; // matches chapter.txt / chapter_82.txt / chapter83.txt / chapter83_temp.txt
            for (const f of fs.readdirSync(workspace)) {
                if (strayRe.test(f) && f !== 'chapter.txt') {
                    try {
                        fs.unlinkSync(path.join(workspace, f));
                        console.log(`🧹 [cleanup] 删除临时文件 ${f}`);
                    } catch (e) { /* ignore */ }
                }
            }
        }
    } catch (e) {
        console.warn(`⚠️  [normalize] 规范化步骤失败（非致命）: ${e.message}`);
    }

    if (engine === 'go') {
        // Run the Go script
        const goScript = path.join(__dirname, '../fanqie-go/main.go');
        console.log(`🚀 Using Go engine to publish...`);
        const result = spawnSync('go', ['run', goScript, ...publishArgs], { stdio: 'inherit' });
        process.exit(result.status || 0);
    } else {
        // Run the Node.js script (default)
        console.log(`🚀 Using Node.js engine to publish...`);
        const createChapterScript = path.join(__dirname, '../fanqie-test/create_chapter.js');
        const result = spawnSync('node', [createChapterScript, ...publishArgs], { stdio: 'inherit' });
        process.exit(result.status || 0);
    }
}

showHelp();

function showHelp() {
    console.log(`
========================================
 📖 Fanqie Publisher CLI
========================================

Usage:
  fanqie-publisher install --skills      Install Claude Code & OpenClaw skill to your current project (.claude/skills & skills)
  fanqie-publisher validate [options]    Validate chapter content length (minimum Chinese chars)
  fanqie-publisher publish [options]     Run the full automated publishing script

Validate Options:
  --content-file <path>                  File to read content from
  --minHan <number>                      Minimum Chinese characters (default: 3000)

Publish Options:
  --engine <node|go>                     Choose the runtime engine (default: node)
  --novel "Novel Name"                   Name of the novel
  --volume "Volume Name"                 Name of the volume
  --title "Chapter Title"                Chapter title
  --file "path/to/content.txt"           File to read content from
`);
}
