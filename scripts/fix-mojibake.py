"""
Fix UTF-8 mojibake (double-encoded UTF-8) trong codebase với ftfy library.

Apply cho:
- fe/src/**/*.{ts,html,scss,css}
- backend/src/main/**/*.{java,sql,yml}
- KHÔNG táp vào *.spec.ts vì có thể chứa intentional test fixtures.

Usage:
    pip install ftfy
    python scripts/fix-mojibake.py            # dry-run
    python scripts/fix-mojibake.py --apply    # write changes
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

try:
    import ftfy
except ImportError:
    print("ERROR: ftfy not installed. Run: pip install ftfy", file=sys.stderr)
    sys.exit(1)


def process_file(path: Path, apply: bool) -> int:
    """Return number of lines changed (0 if no fix)."""
    try:
        original = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        return 0
    fixed = ftfy.fix_text(original)
    if fixed == original:
        return 0
    # Count changed lines
    o_lines = original.splitlines()
    f_lines = fixed.splitlines()
    line_changes = sum(1 for a, b in zip(o_lines, f_lines) if a != b)
    rel = path.as_posix()
    print(f"  {rel}: {line_changes} line(s) changed")
    if apply:
        path.write_text(fixed, encoding='utf-8', newline='\n')
    return line_changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='Write changes (default: dry-run)')
    args = ap.parse_args()

    root = Path('.')
    fe_globs = [
        'fe/src/**/*.ts', 'fe/src/**/*.html', 'fe/src/**/*.scss', 'fe/src/**/*.css',
    ]
    be_globs = [
        'backend/src/main/**/*.java', 'backend/src/main/**/*.sql', 'backend/src/main/**/*.yml',
    ]

    all_files: list[Path] = []
    for glob in fe_globs + be_globs:
        all_files.extend(root.glob(glob))
    all_files = [p for p in all_files if not p.name.endswith('.spec.ts')]

    print(f"Scanning {len(all_files)} files (apply={args.apply})...")
    total = 0
    affected = 0
    for path in sorted(all_files):
        n = process_file(path, args.apply)
        if n > 0:
            total += n
            affected += 1
    print(f"\nTotal: {total} line(s) changed across {affected} files")
    print(f"Mode: {'APPLIED' if args.apply else 'DRY-RUN (use --apply to write)'}")


if __name__ == '__main__':
    sys.exit(main() or 0)
