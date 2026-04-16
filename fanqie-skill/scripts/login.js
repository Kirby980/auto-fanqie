const path = require('path')
const { chromium } = require('playwright')
const { parseArgs } = require('../lib/args')
const { ok, fail } = require('../lib/result')
const { ensureDir } = require('../lib/io')

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = args.url || 'https://writer.fanqienovel.com/'
  const profileDir = args.profile || process.env.FANQIE_PROFILE_DIR || path.resolve(process.cwd(), '.fanqie-profile')
  const headless = args.headless === 'true'

  ensureDir(profileDir)
  ensureDir(path.resolve(process.cwd(), 'artifacts'))

  const context = await chromium.launchPersistentContext(profileDir, { headless })
  const page = await context.newPage()

  try {
    await page.goto(baseUrl, { waitUntil: 'load' })
    process.stdout.write(
      JSON.stringify({
        ok: true,
        step: 'login',
        message: '浏览器已打开。请在窗口中完成登录/验证码。完成后关闭浏览器窗口以结束 login 命令。',
        profile: profileDir
      }) + '\n'
    )
    await context.waitForEvent('close')
    ok({ step: 'login', message: '登录流程结束', profile: profileDir })
  } catch (e) {
    try {
      await page.screenshot({ path: path.resolve(process.cwd(), 'artifacts', `login-error-${Date.now()}.png`) })
    } catch {}
    fail(1, { code: 'LOGIN_FAILED', message: String(e && e.message ? e.message : e) })
  } finally {
    await context.close().catch(() => {})
  }
}

run()
