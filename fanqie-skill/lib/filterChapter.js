// Shared chapter-text filter used by both `prepare` (WhatsApp preview) and
// `publish` (Fanqie editor injection). Must be deterministic so the two
// paths produce byte-identical content.

const TITLE_PATTERN = /^#*\s*第\s*[\d一二三四五六七八九十百千零两]+\s*章/;
const END_CHAPTER_MARKER = /^第\s*[\d一二三四五六七八九十百千零两]+\s*章\s*[完终结束末]\s*$/;
const END_STANDALONE = /^[（(]?\s*[完终]\s*[）)]?$/;
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
      END_STANDALONE.test(last) ||
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
