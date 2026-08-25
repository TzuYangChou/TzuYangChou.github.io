# Maintaining This Website with Agent Assistance

This guide is for a maintainer who may have little or no coding experience.
It explains where things live, how to make common updates, and how to ask an
AI coding agent for help safely.

The short version:

1. Edit the source files in this repository.
2. Do **not** edit `_site/`; it is generated output.
3. Ask an agent to make small changes, build the site, and run the publication
   guard.
4. Review the changed files before committing.
5. Push to `main`; GitHub Actions publishes the website.

## Where Maintainer and Agent Files Live

Shared repository content lives in normal Git history with `main` as the source
of truth. This includes website source, maintainer documentation, agent
instructions, portable skills, and shared editor configuration. The supported
design does not use a separate `workspace-config` branch or require a restore
step after cloning.

Tracking a file on `main` does not mean Jekyll should publish it. `_config.yml`
excludes maintainer-only and agent/workspace paths, including the canonical
`.agents/skills/` tree and the generated `.claude/skills/` mirror. The Pages
workflow runs `.github/scripts/verify_no_agent_pages.rb` after building and
refuses to upload an artifact if any of those files leak into `_site/`.

`MAINTAINING.md` is also listed under `exclude`, so it remains visible in the
GitHub repository without becoming a public website page.

## What This Repository Is

This repository stores the source for a personal academic website.

The website is built by:

- **GitHub Pages**: GitHub's website hosting system.
- **Jekyll**: the static-site generator that turns Markdown files into HTML.
- **Cayman remote theme**: the visual theme used by the site.
- **GitHub Actions**: the automation that builds and deploys the site when
  changes are pushed to `main`.

You mostly edit Markdown files. Markdown is plain text with simple formatting,
such as `# Heading`, `- list item`, and `[link text](url)`.

## Important Folders and Files

| Path                                    | Purpose                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `_config.yml`                           | Main Jekyll settings. Also lists files that should be excluded from the public site. |
| `index.md`                              | Homepage content.                                                                    |
| `research.md`                           | Research page.                                                                       |
| `teaching.md`                           | Teaching page.                                                                       |
| `fine-dining.md`                        | Fine-dining landing page and curated review list.                                    |
| `_reviews/`                             | Individual fine-dining review Markdown files.                                        |
| `_layouts/default.html`                 | Default site-wide page layout.                                                       |
| `_layouts/review.html`                  | Layout for fine-dining review pages.                                                 |
| `_includes/nav.html`                    | Site-wide navigation menu used by layouts.                                           |
| `assets/`                               | PDFs, images, CSS, review photos, and other static files.                            |
| `assets/css/custom.css`                 | Site-specific styling.                                                               |
| `.github/workflows/jekyll-gh-pages.yml` | GitHub Actions deployment workflow.                                                  |
| `.github/scripts/verify_no_agent_pages.rb` | Blocks deployment if agent or workspace files enter the generated site.            |
| `AI_AGENT_PROJECT.md`                  | Project-specific instructions, commands, and maintenance constraints for agents.     |
| `.agents/`                             | Canonical portable prompts and skills; tracked on `main` but never published.         |
| `.claude/skills/`                      | Generated Claude discovery mirror; tracked on `main` but never published.            |
| `.vscode/tasks.json`                   | Shared local Jekyll task; tracked on `main` but never published.                       |
| `README.md`                             | Short repository overview for GitHub visitors.                                       |
| `MAINTAINING.md`                        | This maintainer guide.                                                               |
| `_site/`                                | Generated website output. Do not edit or commit changes from here.                   |

## Branches in Plain English

Branches are separate lines of work in Git.

### `main`

`main` is the authoritative branch for website source, repository documentation,
and shared agent/editor configuration. GitHub Pages builds from `main`, but only
the files selected by Jekyll enter the deployed artifact.

### Short-Lived Branches

You may use a small feature branch and pull request when that makes review
easier. Merge the finished change back into `main` through the normal workflow.

### Retired `workspace-config` Design

Do not create, restore, or update an orphan `workspace-config` branch. Historical
remote refs may remain until an authorized cleanup, but they are not an active
source of configuration. Shared agent files belong directly on `main` and are
kept private from the website by Jekyll exclusions and the deployment guard.

## Golden Rules

1. **Never edit `_site/` by hand.** Rebuild the site instead.
2. **Keep changes small.** One update at a time is easier to review and undo.
3. **Use English for technical documentation.** Fine-dining review body content
   and `fine-dining.md` body content are intentionally written in Traditional
   Chinese.
4. **Keep repo-only and agent/workspace files out of Jekyll output.** Maintain
   the `_config.yml` exclusions and do not bypass the publication guard.
5. **Run the build and publication guard before saying the site is ready.**
6. **Review `git status` and `git diff` before committing.**
7. **Do not add new dependencies unless there is a clear reason.**

## How to Ask an Agent for Help

Good agent prompts are specific. Tell the agent:

- What you want changed.
- Which page or file is involved.
- What must not change.
- Which verification to run.

Example:

```text
Read AI_AGENT_PROJECT.md and MAINTAINING.md first.
Update the Teaching page with this new course:
[paste course information]
Keep the existing style.
Do not edit _site/.
Run bundle exec jekyll build.
Run ruby .github/scripts/verify_no_agent_pages.rb _site.
Summarize the changed files and verification.
```

For documentation-only changes that must not affect the public website:

```text
Add repository-only documentation for maintainers.
Put it somewhere easy to find from README.md.
Make sure Jekyll does not include it in the built site.
Run a clean build and the agent/workspace publication guard.
```

For fine-dining reviews:

```text
Add a new fine-dining review using the existing _reviews convention.
The review date is YYYY-MM-DD and the restaurant is [name].
Create the Markdown file, use layout: review, and reference photos from
assets/fine-dining/reviews/YYYY-MM-DD-slug/.
Keep the review body in Traditional Chinese.
Run bundle exec jekyll build.
Run ruby .github/scripts/verify_no_agent_pages.rb _site.
```

## Normal Maintenance Workflow

Use this checklist for almost every change.

### 1. Check the current state

Ask the agent to run:

```bash
git status --short
```

If there are unexpected changes, stop and inspect them before editing.

### 2. Make the smallest useful change

Examples:

- Edit one page.
- Add one review.
- Replace one PDF.
- Update one navigation item.

Avoid mixing unrelated tasks in the same change.

### 3. Build the site

Ask the agent to run:

```bash
bundle exec jekyll build
ruby .github/scripts/verify_no_agent_pages.rb _site
```

The build should finish successfully and the guard should print
`AGENT_WORKSPACE_PUBLICATION_CHECK=PASS`. A warning about `faraday-retry` may
appear in this environment; it is only an advisory if the build still succeeds.

### 4. Review the changed files

Ask the agent to show:

```bash
git status --short
git diff
```

Check that only the expected files changed. Be suspicious of changes under
`_site/`.

### 5. Commit and push

If you want the agent to commit, ask for one focused commit. Example:

```text
Commit only the files changed for this task.
Use a clear Conventional Commit subject and include the verification command.
Do not stage unrelated files.
```

After pushing to `main`, GitHub Actions should build and deploy the site.

## Common Updates

### Update the Homepage

Edit:

```text
index.md
```

Use this for biography, contact, and CV link changes.

### Replace the CV

The current CV link points to:

```text
assets/CV Tzu-Yang Chou.pdf
```

To replace it:

1. Put the new PDF at the same path, or add a new PDF and update `index.md`.
2. Build the site.
3. Check that the link still works.

### Add or Update a Research Item

Edit:

```text
research.md
```

If adding a paper PDF, put it under:

```text
assets/papers/
```

Then link to it from `research.md`.

### Update Teaching

Edit:

```text
teaching.md
```

Keep the existing simple list style unless you intentionally redesign the page.

### Add a Fine-Dining Review

Create a file in `_reviews/` using this filename pattern:

```text
_reviews/YYYY-MM-DD-restaurant-name.md
```

Use this frontmatter at the top:

```yaml
---
layout: review
title: "Restaurant Name or Review Title"
restaurant: "Restaurant Name"
date: YYYY-MM-DD
---
```

Put review photos in:

```text
assets/fine-dining/reviews/YYYY-MM-DD-restaurant-name/
```

Reference photos with root-relative paths:

```markdown
![caption](/assets/fine-dining/reviews/YYYY-MM-DD-restaurant-name/photo.jpg)
```

The sidebar table of contents is generated from `_reviews/`, so do not maintain
a separate sidebar list.

If the new review should appear in the curated landing-page list, also edit:

```text
fine-dining.md
```

Fine-dining review body text should remain in Traditional Chinese unless there
is a specific reason to change that.

### Change the Navigation Menu

Edit:

```text
_includes/nav.html
```

This include controls the site-wide navigation. The default and review layouts
load it; individual pages do not own the navigation menu.

### Change Styling

Edit:

```text
assets/css/custom.css
```

Ask the agent to keep CSS changes small and to verify the affected pages in a
browser when possible.

## Keeping Repository-Only and Agent Files out of the Public Site

Some Markdown files are for GitHub maintainers, not website visitors. Examples:

- `README.md`
- `MAINTAINING.md`
- agent instructions and portable skills
- internal planning documents

The current `_config.yml` excludes maintainer docs, agent entrypoint patterns,
agent-workbench metadata, `opencode.json`, and the `.agents/`, `.claude/`,
`.codex/`, `.omx/`, and `.vscode/` trees. This keeps both canonical skills,
generated vendor mirrors, and shared editor tasks in Git without copying them
into the website.

If another repository-only file should not appear in the generated website,
add it to the existing `exclude` list without removing the agent/workspace
patterns. For example:

```yaml
exclude:
  - README.md
  - MAINTAINING.md
  - "*AGENT*.md"
  - .agents/
  - .claude/
```

After changing exclusions, use a clean build so stale files from an earlier
configuration cannot remain in `_site/`:

```bash
bundle exec jekyll clean
bundle exec jekyll build
ruby .github/scripts/verify_no_agent_pages.rb _site
```

The final command must print `AGENT_WORKSPACE_PUBLICATION_CHECK=PASS`.

## What Not to Touch Unless You Mean To

Avoid editing these unless the task specifically requires it:

- `_site/`
- `Gemfile.lock`
- `.github/workflows/jekyll-gh-pages.yml`
- `.github/scripts/verify_no_agent_pages.rb`
- `AI_AGENT_GUIDE.md`
- `AI_AGENT_PROJECT.md`
- `AGENTS.md`
- `.agents/`
- `.codex/`
- `.claude/`
- `.vscode/tasks.json`

The agent-related files are shared project configuration tracked on `main`.
Edit them only when intentionally changing agent policy or tooling. Their
presence in normal Git history is expected; their presence in `_site/` is not.

## Troubleshooting

### The Build Fails

Ask the agent to:

1. Copy the exact error summary.
2. Identify which file caused the error.
3. Fix only that cause.
4. Run `bundle exec jekyll build` again.
5. Run `ruby .github/scripts/verify_no_agent_pages.rb _site`.

Common causes:

- Broken YAML frontmatter.
- Missing closing quote in a title.
- Bad indentation in `_config.yml`.
- A Markdown link or image path typo.

### The Agent/Workspace Publication Guard Fails

The guard prints every leaked path. Do not fix the failure by deleting shared
agent files from Git or disabling the workflow step. Add or repair the matching
`_config.yml` exclusion, run a clean build, and rerun:

```bash
ruby .github/scripts/verify_no_agent_pages.rb _site
```

Only continue to deployment after it prints
`AGENT_WORKSPACE_PUBLICATION_CHECK=PASS`.

### An Image Does Not Show

Check:

- Is the image file actually in `assets/`?
- Does the filename match exactly, including spaces, hyphens, and extension?
- Is the path root-relative for review photos, such as
  `/assets/fine-dining/reviews/.../photo.jpg`?

### A Page Does Not Appear

Check:

- Does the page have the correct frontmatter?
- Is it linked from the navigation or another page?
- Did the GitHub Actions deployment finish successfully?

### GitHub Pages Did Not Update

Check the Actions tab on GitHub. The deployment workflow should run after a push
to `main`.

If it failed, ask the agent:

```text
Inspect the GitHub Pages workflow failure.
Explain the root cause in plain English.
Make the smallest fix.
Verify with bundle exec jekyll build and the agent/workspace publication guard.
```

### The Agent Changed Too Much

Ask the agent to show:

```bash
git diff
```

Then ask:

```text
Revert unrelated changes. Keep only the files needed for [task].
Do not use destructive Git commands unless I explicitly approve them.
```

## Safe Agent Prompt Templates

### Small content edit

```text
Read MAINTAINING.md and AI_AGENT_PROJECT.md.
Update [page/file] with [content].
Keep the existing style.
Do not edit _site/.
Run bundle exec jekyll build.
Run ruby .github/scripts/verify_no_agent_pages.rb _site.
Report changed files and verification.
```

### Add a new review

```text
Read MAINTAINING.md and AI_AGENT_PROJECT.md.
Add a fine-dining review for [restaurant] on [date].
Use the existing _reviews filename/frontmatter conventions.
Put photos under assets/fine-dining/reviews/[date-slug]/.
Keep the body in Traditional Chinese.
Run bundle exec jekyll build.
Run ruby .github/scripts/verify_no_agent_pages.rb _site.
```

### Add repo-only documentation

```text
Add maintainer documentation for [topic].
It should be visible in GitHub from README.md but must not affect the generated
website.
Update _config.yml exclude if needed.
Run bundle exec jekyll clean, then bundle exec jekyll build.
Run ruby .github/scripts/verify_no_agent_pages.rb _site and require PASS.
```

### Commit changes

```text
Review git status and git diff.
Commit only the files for this task.
Use a Conventional Commit subject.
Include verification evidence in the commit message.
Do not stage unrelated files.
```

## Final Checklist Before Publishing

Before considering a change done, confirm:

- [ ] The requested content is present.
- [ ] `_site/` was not edited by hand.
- [ ] Repo-only docs are excluded from Jekyll output.
- [ ] `bundle exec jekyll build` succeeds.
- [ ] `ruby .github/scripts/verify_no_agent_pages.rb _site` passes.
- [ ] No agent instructions, prompts, skills, or workspace metadata appear in
      `_site/`.
- [ ] `git status --short` shows only expected files.
- [ ] The agent explained what changed and how it was verified.
