function countHanCharacters(text) {
  if (!text) return 0
  try {
    const matches = text.match(/[\p{Script=Han}]/gu)
    return matches ? matches.length : 0
  } catch {
    const matches = text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)
    return matches ? matches.length : 0
  }
}

module.exports = { countHanCharacters }
