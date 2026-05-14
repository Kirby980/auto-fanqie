const assert = require('assert');
const { filterChapterText } = require('../lib/filterChapter');

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  try {
    assert.strictEqual(actual, expected);
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('filterChapterText');

check(
  'strips 第X章 Arabic title at start',
  filterChapterText('第92章 幽灵血清\n\n申城的午后。'),
  '申城的午后。'
);

check(
  'strips Chinese-numeral title at start',
  filterChapterText('第八十二章 针影之下\n\n正文段落。'),
  '正文段落。'
);

check(
  'strips markdown-hash title at start',
  filterChapterText('## 第77章 隐藏分区\n\n正文。'),
  '正文。'
);

check(
  'strips trailing 第X章完',
  filterChapterText('正文段落。\n\n第89章完'),
  '正文段落。'
);

check(
  'strips trailing 第X章终 (previously leaked)',
  filterChapterText('正文段落。\n\n第89章终'),
  '正文段落。'
);

check(
  'strips trailing 第X章结',
  filterChapterText('正文段落。\n\n第89章结'),
  '正文段落。'
);

check(
  'strips trailing Chinese-numeral end marker',
  filterChapterText('正文段落。\n\n第八十九章终'),
  '正文段落。'
);

check(
  'strips trailing 本章字数 line',
  filterChapterText('正文段落。\n\n本章字数：3520'),
  '正文段落。'
);

check(
  'strips standalone 完',
  filterChapterText('正文段落。\n\n完'),
  '正文段落。'
);

check(
  'strips standalone 终',
  filterChapterText('正文段落。\n\n终'),
  '正文段落。'
);

check(
  'strips (完)',
  filterChapterText('正文段落。\n\n(完)'),
  '正文段落。'
);

check(
  'strips （完）full-width',
  filterChapterText('正文段落。\n\n（完）'),
  '正文段落。'
);

check(
  'strips （本章完） full-width (ch141/142 incident 2026-05-10)',
  filterChapterText('正文段落。\n\n（本章完）'),
  '正文段落。'
);

check(
  'strips (本章完) half-width',
  filterChapterText('正文段落。\n\n(本章完)'),
  '正文段落。'
);

check(
  'strips bare 本章完 (no parens)',
  filterChapterText('正文段落。\n\n本章完'),
  '正文段落。'
);

check(
  'strips （本章终）variant',
  filterChapterText('正文段落。\n\n（本章终）'),
  '正文段落。'
);

check(
  'does NOT strip "本章完成" mid-sentence',
  filterChapterText('他在本章完成了任务。'),
  '他在本章完成了任务。'
);

check(
  'strips multiple trailing markers at once',
  filterChapterText('正文段落。\n\n本章字数：3000\n\n第89章完'),
  '正文段落。'
);

check(
  'drops empty lines between paragraphs',
  filterChapterText('段一\n\n\n\n段二\n\n段三'),
  '段一\n\n段二\n\n段三'
);

check(
  'normal body is unchanged (joined with blank line)',
  filterChapterText('段一\n段二'),
  '段一\n\n段二'
);

check(
  'empty input returns empty string',
  filterChapterText(''),
  ''
);

check(
  'null input returns empty string',
  filterChapterText(null),
  ''
);

check(
  'does NOT strip a line that just mentions 章 mid-sentence',
  filterChapterText('林强翻到了下一章的笔记。'),
  '林强翻到了下一章的笔记。'
);

check(
  'does NOT strip "完" inside a paragraph',
  filterChapterText('他说完了话。'),
  '他说完了话。'
);

check(
  'real-world sample: title + body + trailing marker',
  filterChapterText(
    '第92章 幽灵血清：逻辑深处的共鸣\n\n' +
    '申城的午后，阳光穿过法国梧桐的叶隙。\n\n' +
    '林强握紧了拳头。\n\n' +
    '第92章完'
  ),
  '申城的午后，阳光穿过法国梧桐的叶隙。\n\n林强握紧了拳头。'
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
