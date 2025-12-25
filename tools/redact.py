from __future__ import annotations
from pathlib import Path
import json
import re
import sys
from dataclasses import dataclass

CONFIG_PATH = Path("redactions.json")

@dataclass
class Rule:
    type: str
    from_: str | None = None
    to: str = ""
    pattern: str | None = None

def load_config():
    if not CONFIG_PATH.exists():
        raise SystemExit(f"Missing {CONFIG_PATH}. Create it first.")
    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    rules = []
    for r in cfg.get("rules", []):
        rules.append(Rule(
            type=r["type"],
            from_=r.get("from"),
            to=r.get("to", ""),
            pattern=r.get("pattern")
        ))
    targets = [Path(p) for p in cfg.get("targets", ["logs"])]
    exts = set(cfg.get("extensions", [".md", ".html"]))
    return rules, targets, exts

def apply_rules(text: str, rules: list[Rule]) -> tuple[str, int]:
    changes = 0
    out = text

    for r in rules:
        if r.type in ("word", "word_ci"):
            if not r.from_:
                continue
            flags = re.IGNORECASE if r.type == "word_ci" else 0
            pat = re.compile(rf"\b{re.escape(r.from_)}\b", flags)
            out, n = pat.subn(r.to, out)
            changes += n

        elif r.type in ("phrase", "phrase_ci"):
            if not r.from_:
                continue
            if r.type == "phrase_ci":
                pat = re.compile(re.escape(r.from_), re.IGNORECASE)
                out, n = pat.subn(r.to, out)
                changes += n
            else:
                n = out.count(r.from_)
                if n:
                    out = out.replace(r.from_, r.to)
                    changes += n

        elif r.type in ("regex", "regex_ci"):
            if not r.pattern:
                continue
            flags = re.IGNORECASE if r.type == "regex_ci" else 0
            pat = re.compile(r.pattern, flags)
            out, n = pat.subn(r.to, out)
            changes += n

        else:
            raise SystemExit(f"Unknown rule type: {r.type}")

    return out, changes


def iter_files(targets: list[Path], exts: set[str]):
    for t in targets:
        if t.is_file():
            if t.suffix.lower() in exts:
                yield t
            continue
        if t.is_dir():
            for p in t.rglob("*"):
                if p.is_file() and p.suffix.lower() in exts:
                    yield p

def main():
    dry_run = "--dry-run" in sys.argv
    rules, targets, exts = load_config()

    total_files = 0
    total_changes = 0
    touched = []

    for p in iter_files(targets, exts):
        try:
            src = p.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            print(f"SKIP {p}: {e}")
            continue

        dst, changes = apply_rules(src, rules)
        if changes:
            total_files += 1
            total_changes += changes
            touched.append((p, changes))

            if not dry_run:
                p.write_text(dst, encoding="utf-8")

    if dry_run:
        print("DRY RUN — no files written.\n")

    print(f"Files that would change: {total_files}")
    print(f"Total replacements: {total_changes}")
    for p, c in touched[:50]:
        print(f"  {p}  ({c})")
    if len(touched) > 50:
        print(f"  ...and {len(touched)-50} more")

if __name__ == "__main__":
    main()
