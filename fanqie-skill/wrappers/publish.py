import subprocess
import os
import sys
import json

def run_cmd(command):
    print(f"⚙️  [CMD] {' '.join(command)}")
    result = subprocess.run(command, capture_output=True, text=True)
    return result

def publish_chapter(book_name, chapter_title, content_path, min_han=3000):
    """
    1. 校验字数 (调用 Node.js 脚本)
    2. 通过 playwright-cli 自动执行发布 (使用 --headed 和 --persistent)
    """
    if not os.path.exists(content_path):
        print(f"❌ 找不到正文文件: {content_path}")
        sys.exit(1)

    print("🔍 步骤 1/2: 校验字数...")
    val_cmd = ["node", "../validate.js", "--content-file", content_path, "--minHan", str(min_han)]
    val_res = run_cmd(val_cmd)
    
    if val_res.returncode != 0:
        # 解析最后一行 JSON
        try:
            err_info = json.loads(val_res.stdout.strip().split('\n')[-1])
            print(f"\n❌ [校验失败] {err_info.get('message')}")
        except:
            print(f"\n❌ [校验失败] {val_res.stdout} {val_res.stderr}")
        print("\n💡 AI 提示：请根据上述错误信息重写正文内容，使其满足字数要求。")
        sys.exit(2)

    print("✅ 校验通过，准备发布...")

    # 步骤 2: 驱动 playwright-cli
    print("🚀 步骤 2/2: 调用 playwright-cli 前台可视化发布...")
    
    # 这些是按照 SKILL.md 定义的命令序列
    # 注意：在真实的非沙盒环境（如你的电脑上），需要确保全局安装了 @playwright/cli (npm i -g @playwright/cli)
    # 或者用 npx playwright-cli 代替
    cli = "npx playwright-cli" # 使用 npx 确保能找到命令
    
    commands = [
        f"{cli} open https://writer.fanqienovel.com/ --channel=chrome --headed --persistent",
        f"{cli} click \"text={book_name}\"",
        f"{cli} click \"text=新建章节\"",
        f"{cli} fill \"input[placeholder*='章节名称']\" \"{chapter_title}\"",
        f"{cli} eval \"el => el.value = require('fs').readFileSync('{content_path}', 'utf8')\" \"textarea[placeholder*='正文']\"",
        f"{cli} click \"text=存草稿\"",
        f"{cli} wait 2000",
        f"{cli} close"
    ]

    for cmd in commands:
        # 这里用 shell=True 方便处理包含引号的复杂命令
        print(f"▶️  执行: {cmd}")
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"❌ 命令执行失败:\n{res.stderr}")
            # 如果某一步失败，我们应该停止后续操作，关闭浏览器（清理可能残留的进程）
            subprocess.run(f"{cli} close", shell=True)
            sys.exit(1)

    print("\n🎉 全部自动化命令执行完毕！章节已成功保存。")

if __name__ == "__main__":
    # 使用示例
    book = "《我的修仙日常》"
    title = "第001章 灵气复苏"
    content_file = "../examples/chapter.txt"
    
    publish_chapter(book, title, content_file, min_han=3)