function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`)
}

function ok(payload) {
  printJson({ ok: true, ...payload })
}

function fail(exitCode, payload) {
  printJson({ ok: false, ...payload })
  process.exit(exitCode)
}

module.exports = { ok, fail }
