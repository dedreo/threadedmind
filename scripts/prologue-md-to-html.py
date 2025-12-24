from pathlib import Path
import re

PROLOGUE_DIR = Path("logs/prologue")
TEMPLATE_PATH = PROLOGUE_DIR / "07-02-2025.html"

START = "<!-- TM_LOG_CONTENT -->"
END = "<!-- /TM_LOG_CONTENT -->"

def die(msg: str):
    raise SystemExit(msg)

def escape_html(s: str) -> str:
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;"))

if not TEMPLATE_PATH.exists():
    die(f"Template not found: {TEMPLATE_PATH}")

template = TEMPLATE_PATH.read_text(encoding="utf-8")

start_idx = template.find(START)
end_idx = template.find(END)

if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
    die(f"Template markers not found. Put {START} ... {END} inside the <pre> in {TEMPLATE_PATH}")

md_files = sorted(PROLOGUE_DIR.glob("*.md"))
if not md_files:
    die(f"No .md files found in {PROLOGUE_DIR}")

converted = 0
for md_path in md_files:
    out_path = md_path.with_suffix(".html")

    # don't overwrite existing html (keeps your hand-made 07-02-2025.html)
    if out_path.exists():
        continue

    raw = md_path.read_text(encoding="utf-8").replace("\r\n", "\n")
    safe = escape_html(raw)

    out = (
        template[: start_idx + len(START)]
        + "\n"
        + safe
        + "\n"
        + template[end_idx:]
    )
    out_path.write_text(out, encoding="utf-8")
    converted += 1

print(f"Converted {converted} prologue .md files to .html")

index_path = PROLOGUE_DIR / "index.html"
if index_path.exists():
    idx = index_path.read_text(encoding="utf-8")
    idx = re.sub(r'href="([^"]+)\.md"', r'href="\1.html"', idx)
    index_path.write_text(idx, encoding="utf-8")
    print(f"Updated links in {index_path}")
