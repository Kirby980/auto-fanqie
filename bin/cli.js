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
    // Install Claude Code skill
    const userProjectDir = process.cwd();
    const targetDir = path.join(userProjectDir, '.claude', 'skills', 'fanqie-publisher');
    
    fs.mkdirSync(targetDir, { recursive: true });

    // Locate the SKILL.md in the package installation directory
    const sourceSkillPath = path.join(__dirname, '../.claude/skills/fanqie-publisher/SKILL.md');
    
    if (!fs.existsSync(sourceSkillPath)) {
        console.error(`❌ Error: Source SKILL.md not found at ${sourceSkillPath}`);
        process.exit(1);
    }

    const targetSkillPath = path.join(targetDir, 'SKILL.md');
    fs.copyFileSync(sourceSkillPath, targetSkillPath);
    console.log(`✅ [fanqie-publisher] Skill successfully installed at ${targetSkillPath}`);
    console.log(`💡 You can now ask Claude Code or Copilot to use the 'fanqie-publisher' skill!`);
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
  fanqie-publisher install --skills      Install Claude Code skill to your current project (.claude/skills)
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
