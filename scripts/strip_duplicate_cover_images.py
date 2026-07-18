#!/usr/bin/env python3
"""Remove body markdown images that duplicate frontmatter cover `image`."""

from __future__ import annotations

import re
from pathlib import Path

BLOG = Path(__file__).resolve().parents[1] / "src" / "content" / "blog"
IMG_LINE = re.compile(r"^[ \t]*!\[[^\]]*\]\(([^)]+)\)[ \t]*\r?\n?", re.M)
IMAGE_FM = re.compile(r'(?m)^image:\s*"?([^"\n]+)"?\s*$')


def split_frontmatter(text: str) -> tuple[str | None, str, str]:
    if not text.startswith("---"):
        return None, "", text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None, "", text
    return parts[1], parts[1], parts[2]


def main() -> int:
    changed: list[str] = []
    for path in sorted(BLOG.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        fm, _, body = split_frontmatter(raw)
        if fm is None:
            print(f"SKIP no fm: {path.name}")
            continue
        m_img = IMAGE_FM.search(fm)
        if not m_img:
            print(f"SKIP no cover: {path.name}")
            continue
        cover = m_img.group(1).strip().strip("'")
        m = IMG_LINE.search(body)
        if not m:
            print(f"OK no body img: {path.name}")
            continue
        url = m.group(1).strip()
        same = url == cover or Path(url).name == Path(cover).name
        if not same:
            print(f"KEEP different first img: {path.name}")
            print(f"  body={url}")
            print(f"  cover={cover}")
            continue
        start, end = m.span()
        new_body = body[:start] + body[end:]
        new_body = re.sub(r"\n{3,}", "\n\n", new_body)
        new_body = re.sub(r"^\s*\n", "\n", new_body)
        new_text = f"---{fm}---{new_body}"
        if new_text != raw:
            path.write_text(new_text, encoding="utf-8")
            changed.append(path.name)
            print(f"REMOVED: {path.name}")
        else:
            print(f"NOCHANGE: {path.name}")

    print("---")
    print(f"changed={len(changed)}")
    for name in changed:
        print(f"  {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
