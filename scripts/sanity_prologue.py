from pathlib import Path
import re
import sys

PROLOGUE_DIR = Path("logs/prologue")

# Put "things that should NOT appear anymore" here.
# Keep it tight; you can expand as you find new leaks.
BANNED_LITERALS = [
    "Jerry Hardin", "Jerry", "Hardin",
    "Psy", "PSy",
    "Murfreesboro", "Dowelltown", "Watertown", "McMinnville",
    "DeKalb", "Rutherford", "Vincennes",
    "MTSU", "Adient", "Nissan",
    "Veterans Treatment Court", "Veteran's Treatment Court",
    "Alicia Morotti", "Justin Arnold",
    # Add others as needed:
    "Richard", "Rosetta",
]

# Regex patterns for common leaks/artifacts
BANNED_REGEX = [
    (re.compile(r"file-service://file-[A-Za-z0-9]+"), "file-service pointer"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "email address"),
    (re.compile(r"\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b"), "phone number"),
    (re.compile(r"[A-Z]:\\Users\\[^\\]+\\", re.IGNORECASE), "Windows user path"),
    (re.compile(r"/Users/[^/]+/", re.IGNORECASE), "macOS user path"),
]

# "Expected to exist" checks (not strict HTML validation; just sanity)
REQUIRED_SUBSTRINGS = [
    "<!DOCTYPE html>",
    'rel="stylesheet" href="/styles/main.css"',
    'src="/scripts/main.js"',
]

PRE_RE = re.compile(r'<pre[^>]*class="[^"]*\blog-pre\b[^"]*"[^>]*>', re.IGNORECASE)

def scan_file(p: Path) -> dict:
    text = p.read_text(encoding="utf-8", errors="replace")

    issues = []
    notes = []

    # Basic structure checks
    for req in REQUIRED_SUBSTRINGS:
        if req not in text:
            issues.append(f"missing required substring: {req}")

    if not PRE_RE.search(text):
        issues.append("missing <pre> with class including 'log-pre'")

    # Content check: ensure there is content inside pre (roughly)
    if "TM_LOG_CONTENT" in text:
        # If you kept markers around, fine; but ensure not empty between markers.
        pass

    # Banned literal checks
    literal_hits = []
    for s in BANNED_LITERALS:
        if not s:
            continue
        # whole-word, case-insensitive
        pat = re.compile(rf"\b{re.escape(s)}\b", re.IGNORECASE)
        if pat.search(text):
            literal_hits.append(s)
    if literal_hits:
        issues.append(f"banned literals present: {', '.join(sorted(set(literal_hits)))}")


    # Regex leak checks
    regex_hits = []
    for rx, label in BANNED_REGEX:
        if rx.search(text):
            regex_hits.append(label)
    if regex_hits:
        issues.append(f"banned patterns present: {', '.join(sorted(set(regex_hits)))}")

    # Size note
    size_kb = p.stat().st_size / 1024
    notes.append(f"{size_kb:.1f}KB")

    return {"file": str(p), "issues": issues, "notes": notes}

def main():
    if not PROLOGUE_DIR.exists():
        print(f"Missing directory: {PROLOGUE_DIR}", file=sys.stderr)
        sys.exit(2)

    files = sorted(
    p for p in PROLOGUE_DIR.glob("*.html")
    if re.match(r"^\d{2}-\d{2}-\d{4}.*\.html$", p.name)
)
    if not files:
        print(f"No .html files found in {PROLOGUE_DIR}", file=sys.stderr)
        sys.exit(2)

    total = 0
    bad = 0

    print(f"Scanning {len(files)} files in {PROLOGUE_DIR}...\n")

    for p in files:
        total += 1
        r = scan_file(p)
        if r["issues"]:
            bad += 1
            print(f"FAIL: {r['file']} ({', '.join(r['notes'])})")
            for issue in r["issues"]:
                print(f"  - {issue}")
            print("")
        else:
            print(f"OK:   {r['file']} ({', '.join(r['notes'])})")

    print(f"\nDone. OK: {total-bad} | FAIL: {bad}")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
