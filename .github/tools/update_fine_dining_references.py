#!/usr/bin/env python3
"""Keep fine-dining.md linked to every review in the _reviews collection.

The script preserves hand-curated sections in fine-dining.md and only manages the
links between AUTO-FINE-DINING-REVIEWS markers. Any review already linked outside
the managed block is considered curated and will not be duplicated there.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


START_MARKER = "<!-- AUTO-FINE-DINING-REVIEWS:START -->"
END_MARKER = "<!-- AUTO-FINE-DINING-REVIEWS:END -->"

FRONTMATTER_BOUNDARY = "---"
LINK_TARGET_PATTERN = re.compile(r"\]\(([^)]+)\)")
FRONTMATTER_FIELD_PATTERN = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$")


@dataclass(frozen=True)
class Review:
    slug: str
    date: str
    label: str


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Insert references for _reviews/*.md files missing from fine-dining.md."
    )
    parser.add_argument(
        "--landing-page",
        type=Path,
        default=Path("fine-dining.md"),
        help="Markdown landing page that contains the managed marker block.",
    )
    parser.add_argument(
        "--reviews-dir",
        type=Path,
        default=Path("_reviews"),
        help="Directory containing review Markdown files.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit with a non-zero status when the landing page would change.",
    )
    return parser.parse_args()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str, original: str) -> None:
    newline = "\r\n" if "\r\n" in original else "\n"
    path.write_text(content.replace("\n", newline), encoding="utf-8", newline="")


def parse_frontmatter(markdown: str) -> dict[str, str]:
    lines = markdown.splitlines()
    if not lines or lines[0].strip() != FRONTMATTER_BOUNDARY:
        return {}

    fields: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == FRONTMATTER_BOUNDARY:
            break

        match = FRONTMATTER_FIELD_PATTERN.match(line)
        if match is None:
            continue

        key, raw_value = match.groups()
        fields[key] = unquote_yaml_scalar(raw_value.strip())

    return fields


def unquote_yaml_scalar(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def label_for_review(fields: dict[str, str], slug: str) -> str:
    for key in ("title", "restaurant"):
        value = fields.get(key, "").strip()
        if value:
            return value
    return slug


def load_reviews(reviews_dir: Path) -> list[Review]:
    reviews: list[Review] = []

    for path in sorted(reviews_dir.glob("*.md")):
        fields = parse_frontmatter(read_text(path))
        slug = path.stem
        reviews.append(
            Review(
                slug=slug,
                date=fields.get("date", slug[:10]),
                label=label_for_review(fields, slug),
            )
        )

    return sorted(reviews, key=lambda review: (review.date, review.slug))


def marker_bounds(lines: list[str]) -> tuple[int, int]:
    try:
        start = lines.index(START_MARKER)
        end = lines.index(END_MARKER)
    except ValueError as error:
        raise SystemExit(
            "fine-dining.md must contain both managed markers:\n"
            f"{START_MARKER}\n{END_MARKER}"
        ) from error

    if start >= end:
        raise SystemExit("Managed review reference markers are in the wrong order.")

    return start, end


def linked_slugs(markdown: str) -> set[str]:
    slugs: set[str] = set()

    for match in LINK_TARGET_PATTERN.finditer(markdown):
        target = match.group(1).strip()
        slug = slug_from_link_target(target)
        if slug:
            slugs.add(slug)

    return slugs


def slug_from_link_target(target: str) -> str | None:
    normalized = target.strip()
    if not normalized or normalized.startswith(("http://", "https://", "mailto:")):
        return None

    normalized = normalized.split("#", 1)[0].split("?", 1)[0]
    normalized = normalized.rstrip("/")
    if not normalized:
        return None

    return normalized.split("/")[-1]


def render_generated_block(reviews: list[Review], curated_slugs: set[str]) -> tuple[list[str], int]:
    missing_reviews = [review for review in reviews if review.slug not in curated_slugs]
    if not missing_reviews:
        return [], 0

    links = [f"- [{review.label}]({review.slug}/)" for review in missing_reviews]
    return ["## 待整理食記", "", *links, ""], len(missing_reviews)


def update_landing_page(
    landing_page: Path, reviews_dir: Path
) -> tuple[bool, list[str], int, str, str]:
    original = read_text(landing_page)
    lines = original.splitlines()
    start, end = marker_bounds(lines)

    curated_markdown = "\n".join(lines[:start] + lines[end + 1 :])
    curated_slugs = linked_slugs(curated_markdown)

    generated_lines, missing_count = render_generated_block(load_reviews(reviews_dir), curated_slugs)
    updated_lines = lines[: start + 1] + generated_lines + lines[end:]
    updated = "\n".join(updated_lines)
    if original.endswith(("\n", "\r\n")):
        updated += "\n"

    return (
        updated != original.replace("\r\n", "\n"),
        generated_lines,
        missing_count,
        updated,
        original,
    )


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    arguments = parse_arguments()
    changed, generated_lines, missing_count, updated, original = update_landing_page(
        arguments.landing_page, arguments.reviews_dir
    )

    if not changed:
        print("fine-dining.md already references every review.")
        return 0

    print(f"Updated managed review reference block with {missing_count} link(s).")
    for line in generated_lines:
        print(line)

    if arguments.check:
        return 1

    write_text(arguments.landing_page, updated, original)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
