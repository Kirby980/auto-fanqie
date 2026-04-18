const fs = require('fs');
const content = fs.readFileSync('/Users/hyz/Desktop/auto-fanqie/tmp/chapter_80_clean.txt', 'utf8');

// The title input is the second input or placeholder "请输入标题"
await page.getByPlaceholder('请输入标题').fill('最终火种与杀戮指令');

// The editor might be ProseMirror or a div with placeholder "请输入正文..."
const editor = page.locator('.ProseMirror'); // Fanqie uses ProseMirror
if (await editor.count() > 0) {
    await editor.fill(content);
} else {
    // Try to find the contenteditable
    const editable = page.locator('[contenteditable="true"]');
    await editable.first().fill(content);
}
console.log("Fill completed.");
