# TYChou.github.io — Project Rules

## Project Overview

Jekyll-based GitHub Pages personal academic site using the Cayman theme.

## Language Policy

Code comments, commit messages, and technical documentation must be in English. Conversations with the user may be in any language.

**Exception:** Fine dining review content (`_reviews/*.md` body text) and the fine dining landing page (`fine-dining.md` body text) are written in Traditional Chinese.

## Site Structure

- `_config.yml` — Jekyll configuration (Cayman remote theme, reviews collection)
- `_layouts/default.html` — Custom Cayman layout override with dropdown nav
- `assets/css/custom.css` — Dropdown nav and site-specific styles
- `index.md` — Home page
- `research.md` — Research page
- `teaching.md` — Teaching page
- `fine-dining.md` — Fine dining reviews landing/TOC page
- `assets/` — Static assets (CV, images, etc.)

## Navigation

Site-wide HTML nav bar is defined in `_layouts/default.html` (not in individual pages).
Dropdown menu "Personal" contains Fine Dining and Gaming (grayed out placeholder).
To add a new top-level page, edit the `<nav>` in `_layouts/default.html`.

## Fine Dining Reviews

Reviews use a Jekyll collection (`_reviews/`) with `output: true` and permalink `/fine-dining/:title/`.

### Review file convention

- Filename: `_reviews/YYYY-MM-DD-restaurant-name.md`
- The same restaurant may appear multiple times with different dates.

### Review frontmatter

```yaml
---
layout: review
title: "Restaurant Name or Fancy Title"
restaurant: "Restaurant Name"
date: YYYY-MM-DD
---
```

- `title` — matches the original HackMD `# heading`. Some reviews have elaborate titles (e.g. featured articles like `華麗絕美的視覺饗宴，世紀廚神的摘星聖所——L'Atelier de Joël Robuchon`), others just use the restaurant name (e.g. `Longtail`). No date in the title.
- `restaurant` — the restaurant name (used in sidebar display).
- `date` — visit date in `YYYY-MM-DD` format.

### Photo storage

- Path: `assets/fine-dining/YYYY-MM-DD-restaurant-name/`
- One folder per visit, mirroring the review filename.
- Reference in reviews as: `![caption](/assets/fine-dining/YYYY-MM-DD-restaurant-name/photo.jpg)`

### Layouts

- `_layouts/review.html` — Two-column layout with sidebar TOC + content. Used by both `fine-dining.md` and individual reviews.
- Sidebar auto-lists all reviews from `site.reviews`, highlights current page, and is collapsible on mobile.
- Both the sidebar and landing page content use the same `site.reviews` data — no manual list maintenance.

### Landing page

`fine-dining.md` uses `layout: review` with a manually curated TOC matching the original HackMD structure. Sections: 精選文章 (featured), seasonal groups (2022 夏, 2022 冬, …), 食記短評 (short reviews), and an embedded Google Map. Links to individual reviews are added as reviews are migrated.

### HackMD migration guide

Reviews are migrated from `hackmd/*.md` (source of truth) into `_reviews/`.

**Filename convention:** `_reviews/YYYY-MM-DD-romanized-name.md`
- Date extracted from `造訪日期` field in the review body.
- Restaurant name romanized to kebab-case English (e.g. 鮨 隆 → `sushi-ryu`). Search the internet for the restaurant's official English name when uncertain.
- Multi-visit reviews append visit number: `2023-11-25-sushi-ryu-2nd.md`

**Content transformation:**
1. Remove HackMD YAML frontmatter (`---\ntitle: ...\n---`) and `# Title` heading (layout renders `page.title`).
2. Remove `**詳細評價**：` section marker line.
3. Remove `:::warning ... :::` back-to-index block at the bottom.
4. Add `<br>` at the end of each line in the address block (`地址`, `造訪日期`, `人數價位`) and the score block (`環境裝潢`, `餐點水準`, `服務品質`, `整體用餐體驗評價`) to preserve line breaks.
5. Keep HackMD image URLs (`https://hackmd.io/_uploads/...`) as-is — images will be fetched and localized separately.
6. Internal HackMD cross-references (e.g. `[Nomura](/z3fX...)`) to be updated to Jekyll paths after all reviews are migrated.

**Files to skip (not reviews):**
- `子揚的Fine ∂ining小站.md` / `子揚的Fine ∂ining小站 (1).md` — landing page (migrated to `fine-dining.md`)
- `食評範本.md`, `標題.md`, `網址.md` — utility files
