import json
import subprocess
from pathlib import Path


def run_fanqie_skill(args, cwd: Path):
    proc = subprocess.run(
        ["node", "bin/fanqie-skill.js", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
    )
    stdout = proc.stdout.strip()
    stderr = proc.stderr.strip()
    payload = None
    if stdout:
        try:
            payload = json.loads(stdout.splitlines()[-1])
        except Exception:
            payload = {"raw": stdout}
    return proc.returncode, payload, stderr


def validate_then_publish(book, title, content_file, mode="draft"):
    cwd = Path(__file__).resolve().parents[1]

    code, payload, stderr = run_fanqie_skill(
        ["validate", "--content-file", content_file, "--minHan", "3000"],
        cwd=cwd,
    )
    if code != 0:
        return code, payload, stderr

    return run_fanqie_skill(
        ["publish", "--book", book, "--title", title, "--content-file", content_file, "--mode", mode],
        cwd=cwd,
    )


if __name__ == "__main__":
    code, payload, stderr = validate_then_publish(
        book="你的书名",
        title="第001章 标题",
        content_file="chapter.txt",
        mode="draft",
    )
    print(code)
    print(payload)
    if stderr:
        print(stderr)
