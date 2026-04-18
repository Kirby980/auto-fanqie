#!/usr/bin/env node

const { countHanCharacters } = require('./lib/hanCount');
const { fail, ok } = require('./lib/result');
const fs = require('fs');

// 简单的参数解析
const args = process.argv.slice(2);
let contentFile = '';
let minHan = 3000;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--content-file' && args[i+1]) {
        contentFile = args[i+1];
        i++;
    } else if (args[i] === '--minHan' && args[i+1]) {
        minHan = parseInt(args[i+1], 10);
        i++;
    }
}

if (!contentFile || !fs.existsSync(contentFile)) {
    fail(1, { code: 'FILE_NOT_FOUND', message: `找不到正文文件: ${contentFile}` });
}

const content = fs.readFileSync(contentFile, 'utf8');
const hanCount = countHanCharacters(content);

if (hanCount < minHan) {
    fail(2, { 
        code: 'CONTENT_TOO_SHORT', 
        message: `正文汉字数不足：当前 ${hanCount}，要求 >= ${minHan}。请重写并扩写至满足字数要求后再发布。`,
        hanCount,
        minHan
    });
}

ok({ step: 'validate', hanCount, minHan });
