function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      out._.push(token)
      continue
    }
    const eq = token.indexOf('=')
    if (eq !== -1) {
      const key = token.slice(2, eq)
      const value = token.slice(eq + 1)
      out[key] = value
      continue
    }
    const key = token.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      out[key] = next
      i += 1
      continue
    }
    out[key] = true
  }
  return out
}

module.exports = { parseArgs }
