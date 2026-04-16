#!/usr/bin/env node
const path = require('path')
const { spawnSync } = require('child_process')
const { parseArgs } = require('../lib/args')
const { countHanCharacters } = require('../lib/hanCount')
const { readUtf8File } = require('../lib/io')
const { ok, fail } = require('../lib/result')

function usage() {
  process.stdout.write(
    [
      'fanqie-skill <command> [options]',
      '',
      'Commands:',
      '  login',
      '  validate --content-file <path> [--minHan 3000]',
      '  publish --book <name> --title <title> --content-file <path> [--mode draft|publish] [--profile <dir>] [--headless true|false] [--config <path>]',
      ''
    ].join('\n') + '\n'
  )
}

function runNodeScript(scriptRelPath, argv) {
  const scriptAbsPath = path.resolve(__dirname, '..', scriptRelPath)
  const res = spawnSync(process.execPath, [scriptAbsPath, ...argv], { stdio: 'inherit' })
  if (res.status === null) process.exit(1)
  process.exit(res.status)
}

function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  if (!cmd || cmd === '-h' || cmd === '--help') {
    usage()
    process.exit(0)
  }

  if (cmd === 'login') {
    runNodeScript('scripts/login.js', argv.slice(1))
    return
  }

  if (cmd === 'publish') {
    runNodeScript('scripts/publish.js', argv.slice(1))
    return
  }

  if (cmd === 'validate') {
    const args = parseArgs(argv.slice(1))
    const contentFile = args['content-file']
    const minHan = Number(args.minHan || 3000)
    if (!contentFile) fail(1, { code: 'MISSING_CONTENT_FILE', message: '缺少参数 --content-file' })
    const content = readUtf8File(path.resolve(process.cwd(), contentFile))
    const hanCount = countHanCharacters(content)
    if (hanCount < minHan) {
      fail(2, {
        code: 'CONTENT_TOO_SHORT',
        message: `正文汉字数不足：当前 ${hanCount}，要求 >= ${minHan}。请重写并扩写至满足字数要求后再发布。`,
        hanCount,
        minHan
      })
    }
    ok({ step: 'validate', hanCount, minHan })
    return
  }

  usage()
  fail(1, { code: 'UNKNOWN_COMMAND', message: `未知命令: ${cmd}` })
}

main()
