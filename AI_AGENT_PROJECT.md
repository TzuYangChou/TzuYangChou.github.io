# Project-Specific Agent Context

## Architecture

This is a Jekyll-based GitHub Pages personal academic site using the Cayman remote theme.

The site is mostly Markdown content plus a small custom layout/style layer. GitHub Pages builds from `main` through the workflow in `.github/workflows/jekyll-gh-pages.yml`.

## Build Commands

- Install dependencies: `bundle install`
- Build locally: `bundle exec jekyll build`
- Serve locally: `bundle exec jekyll serve`
- Production-style CI build: `bundle exec jekyll build --baseurl "$BASE_PATH"` with `JEKYLL_ENV=production` and `JEKYLL_GITHUB_TOKEN` set when available.

## Test Commands

- Primary verification: `bundle exec jekyll build`
- For layout/navigation changes, additionally inspect the generated site or serve locally with `bundle exec jekyll serve`.

## Important Files and Directories

- `_config.yml` — Jekyll configuration, Cayman remote theme, and the reviews collection.
- `_layouts/default.html` — Custom Cayman layout override with site navigation.
- `_layouts/review.html` — Two-column fine-dining review layout with sidebar table of contents.
- `assets/css/custom.css` — Dropdown navigation and site-specific CSS.
- `index.md` — Home page.
- `research.md` — Research page.
- `teaching.md` — Teaching page.
- `fine-dining.md` — Fine dining reviews landing page and curated table of contents.
- `_reviews/` — Fine dining review collection.
- `assets/` — Static assets such as the CV PDF and fine-dining photos.
- `.github/workflows/jekyll-gh-pages.yml` — GitHub Pages build and deploy workflow.

## Domain Terms

- `reviews collection` — Jekyll collection configured in `_config.yml` with output pages at `/fine-dining/:name/`.
- `review landing page` — `fine-dining.md`, which uses the same review layout and includes curated groups plus an embedded Google Map.
- `sidebar TOC` — Review layout sidebar generated from `site.reviews`; avoid maintaining a separate sidebar list.

## Language Policy

Code comments, commit messages, and technical documentation must be in English. Conversations with the user may be in any language.

Exception: fine dining review content (`_reviews/*.md` body text) and the fine dining landing page (`fine-dining.md` body text) are written in Traditional Chinese.

## Navigation

Site-wide HTML navigation is defined in `_layouts/default.html`, not in individual pages. The dropdown menu `Personal` contains Fine Dining and a grayed-out Gaming placeholder. To add a new top-level page, edit the `<nav>` in `_layouts/default.html`.

## Fine Dining Reviews

Review files use this convention:

```text
_reviews/YYYY-MM-DD-restaurant-name.md
```

Use this frontmatter shape:

```yaml
---
layout: review
title: "Restaurant Name or Fancy Title"
restaurant: "Restaurant Name"
date: YYYY-MM-DD
---
```

Photo folders mirror review filenames:

```text
assets/fine-dining/YYYY-MM-DD-restaurant-name/
```

Reference photos in reviews with root-relative paths such as:

```markdown
![caption](/assets/fine-dining/YYYY-MM-DD-restaurant-name/photo.jpg)
```

The same restaurant may appear multiple times with different visit dates. Some review titles are elaborate article titles; others are just the restaurant name. Do not add the date to `title` unless the content itself needs it.

## Workspace Configuration

This repository uses the agent-workbench `workspace-config` orphan branch design for agent/editor workspace files.

Default workspace-overlay files should be versioned on `workspace-config`, restored into local product worktrees when needed, and ignored locally through `.git/info/exclude` on product branches. Do not merge, rebase, or cherry-pick `workspace-config` wholesale into `main`, `dev`, or feature branches.

Current workspace-overlay paths include:

```text
AI_AGENT_GUIDE.md
AI_AGENT_PROJECT.md
AGENTS.md
CLAUDE.md
GEMINI.md
.agent-workbench.yaml
.agent-workbench.lock.json
.agents/
.codex/
.claude/
opencode.json
```

## Project-Specific Constraints

- Do not modify application source code during agent-workbench syncs.
- Prefer small, focused changes and verify with `bundle exec jekyll build` when Ruby dependencies are available.
- Keep fine-dining body content in Traditional Chinese unless the user requests otherwise.
- Keep agent/editor workspace files off product branches; commit them on `workspace-config` instead.
