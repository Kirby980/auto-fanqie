import sys
import subprocess

with open('/Users/hyz/Desktop/auto-fanqie/tmp/chapter_80_clean.txt', 'r', encoding='utf-8') as f:
    text = f.read()

paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
html_content = "".join([f"<p>{p}</p>" for p in paragraphs])

js_code = f"""
el => {{
    el.innerHTML = `{html_content}`;
    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
    el.dispatchEvent(new Event('change', {{ bubbles: true }}));
    el.blur();
}}
"""

cmd = ['playwright-cli', 'eval', js_code, 'e64']
subprocess.run(cmd)
print("Injected via python script")
