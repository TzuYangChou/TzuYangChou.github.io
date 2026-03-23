# TYChou.github.io — Project Rules

## Project Overview

Jekyll-based GitHub Pages personal academic site using the Cayman theme.

## Language Policy

All artifacts checked into the repo — content, comments, commit messages — must be in English. Conversations with the user may be in any language.

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
title: "Restaurant Name — YYYY-MM-DD"
restaurant: "Restaurant Name"
location: "City, Country"
date: YYYY-MM-DD
---
```

### Photo storage

- Path: `assets/fine-dining/YYYY-MM-DD-restaurant-name/`
- One folder per visit, mirroring the review filename.
- Reference in reviews as: `![caption]({{ '/assets/fine-dining/YYYY-MM-DD-restaurant-name/photo.jpg' | relative_url }})`

### Layouts

- `_layouts/review.html` — Two-column layout with sidebar TOC + content. Used by both `fine-dining.md` and individual reviews.
- Sidebar auto-lists all reviews from `site.reviews`, highlights current page, and is collapsible on mobile.
- Both the sidebar and landing page content use the same `site.reviews` data — no manual list maintenance.

### Landing page

`fine-dining.md` uses `layout: review` and auto-generates the TOC from `site.reviews`, sorted by date descending.
