const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')
const { parseArgs } = require('../lib/args')
const { countHanCharacters } = require('../lib/hanCount')
const { readUtf8File, ensureDir } = require('../lib/io')
const { ok, fail } = require('../lib/result')

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf8')
  return JSON.parse(raw)
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const bookName = args.book
  const chapterTitle = args.title
  const minHan = Number(args.minHan || 3000)
  const contentFile = args['content-file']
  const baseDir = process.cwd()
  const configPath = args.config || path.resolve(__dirname, '..', 'config', 'default.json')
  const profileDir = args.profile || process.env.FANQIE_PROFILE_DIR || path.resolve(baseDir, '.fanqie-profile')
  const headless = args.headless === 'true'
  const dryRun = args['dry-run'] === 'true'
  const publishMode = (args.mode || 'draft').toLowerCase()

  if (!bookName) fail(1, { code: 'MISSING_BOOK', message: '缺少参数 --book' })
  if (!chapterTitle) fail(1, { code: 'MISSING_TITLE', message: '缺少参数 --title' })
  if (!contentFile) fail(1, { code: 'MISSING_CONTENT_FILE', message: '缺少参数 --content-file' })

  const contentPath = path.resolve(baseDir, contentFile)
  const content = readUtf8File(contentPath)
  const hanCount = countHanCharacters(content)

  if (hanCount < minHan) {
    fail(2, {
      code: 'CONTENT_TOO_SHORT',
      message: `正文汉字数不足：当前 ${hanCount}，要求 >= ${minHan}。请重写并扩写至满足字数要求后再发布。`,
      hanCount,
      minHan
    })
  }

  if (dryRun) {
    ok({ step: 'validate', hanCount, minHan, message: 'dry-run: 仅校验通过，未触发发布' })
    return
  }

  const config = loadConfig(configPath)
  const baseUrl = config.baseUrl
  const selectors = config.selectors || {}

  ensureDir(profileDir)
  ensureDir(path.resolve(baseDir, 'artifacts'))

  const context = await chromium.launchPersistentContext(profileDir, { headless })
  const page = await context.newPage()

  try {
    await page.goto(baseUrl, { waitUntil: 'load' })

    const bookSelector = String(selectors.bookCardByName || 'text={BOOK_NAME}').replace('{BOOK_NAME}', bookName)
    await page.click(bookSelector, { timeout: 30000 })
    await page.click(selectors.newChapterButton, { timeout: 30000 })

    await page.fill(selectors.chapterTitleInput, chapterTitle, { timeout: 30000 })

    const contentTarget = page.locator(selectors.chapterContentTextarea).first()
    await contentTarget.click({ timeout: 30000 })
    await contentTarget.fill(content)

    const actionSelector = publishMode === 'publish' ? selectors.publishButton : selectors.saveDraftButton
    await page.click(actionSelector, { timeout: 30000 })
    await page.waitForTimeout(1500)

    ok({
      step: 'publish',
      mode: publishMode,
      hanCount,
      minHan,
      book: bookName,
      title: chapterTitle,
      profile: profileDir
    })
  } catch (e) {
    const shot = path.resolve(baseDir, 'artifacts', `publish-error-${Date.now()}.png`)
    try {
      await page.screenshot({ path: shot, fullPage: true })
    } catch {}
    fail(1, {
      code: 'PUBLISH_FAILED',
      message: String(e && e.message ? e.message : e),
      screenshot: shot
    })
  } finally {
    await context.close().catch(() => {})
  }
}

run()
