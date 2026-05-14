// Shared chapter-text filter used by both `prepare` (WhatsApp preview) and
// `publish` (Fanqie editor injection). Must be deterministic so the two
// paths produce byte-identical content.

const TITLE_PATTERN = /^#*\s*第\s*[\d一二三四五六七八九十百千零两]+\s*章/;
const END_CHAPTER_MARKER = /^第\s*[\d一二三四五六七八九十百千零两]+\s*章\s*[完终结束末]\s*$/;
// 卷结束标记（2026-04-22 新增）:
//   第三卷完 / （第三卷完） / 第三卷：轮回终结 完 / （第三卷：轮回终结 完） / (第3卷:XXX 终)
// 容忍全/半角括号和冒号；卷名（：XXX 部分）可选。
const END_VOLUME_MARKER = /^[（(]?\s*第\s*[\d一二三四五六七八九十百千零两]+\s*卷\s*(?:[：:][^）)]*?)?\s*[完终结束末]\s*[）)]?\s*$/;
const END_STANDALONE = /^[（(]?\s*[完终]\s*[）)]?$/;
// 本章完 系列（2026-05-10 新增）：（本章完）/(本章完)/本章完/本章 终 等
const END_BENZHANG_MARKER = /^[（(]?\s*本\s*章\s*[完终结束末]\s*[）)]?\s*$/;
const END_WORDCOUNT = /本章字数/;

function filterChapterText(raw) {
  if (raw == null) return '';

  let paragraphs = raw
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p !== '');

  while (paragraphs.length > 0 && TITLE_PATTERN.test(paragraphs[0])) {
    paragraphs.shift();
  }

  while (paragraphs.length > 0) {
    const last = paragraphs[paragraphs.length - 1];
    if (
      END_CHAPTER_MARKER.test(last) ||
      END_VOLUME_MARKER.test(last) ||
      END_STANDALONE.test(last) ||
      END_BENZHANG_MARKER.test(last) ||
      END_WORDCOUNT.test(last)
    ) {
      paragraphs.pop();
    } else {
      break;
    }
  }

  return paragraphs.join('\n\n');
}

module.exports = { filterChapterText };
