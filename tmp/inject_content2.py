import sys
import subprocess

with open('/Users/hyz/Desktop/auto-fanqie/tmp/chapter_80_clean.txt', 'r', encoding='utf-8') as f:
    text = f.read()

paragraphs = []
for p in text.split('\n'):
    p = p.strip()
    if not p:
        continue
    if p.startswith('### 第') or p.startswith('第80章'):
        continue
    paragraphs.append(p)

html_content = "".join([f"<p>{p}</p>" for p in paragraphs])
html_content = html_content.replace('`', '\\`').replace('$', '\\$')

js_code = f"""
el => {{
    el.innerHTML = `{html_content}`;
    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
    el.blur();
}}
"""

cmd = ['playwright-cli', 'eval', js_code, 'e63']
subprocess.run(cmd)
print("Injected via python script 2")
