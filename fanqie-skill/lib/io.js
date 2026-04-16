const fs = require('fs')

function readUtf8File(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

module.exports = { readUtf8File, ensureDir }
