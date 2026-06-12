# Tzu-Yang Chou Academic Website

This repository contains the source for Tzu-Yang Chou's personal academic
website, published with GitHub Pages and built with Jekyll.

The site includes:

- An academic homepage with contact and CV information.
- Research and teaching pages.
- A fine-dining review section powered by a Jekyll collection.
- Static assets such as papers, the CV, custom CSS, and review images.

## Tech Stack

- [Jekyll](https://jekyllrb.com/)
- [GitHub Pages](https://pages.github.com/)
- Cayman remote theme (`pages-themes/cayman`)
- Ruby dependencies managed by Bundler

## Repository Layout

```text
_config.yml                  Jekyll configuration and collection settings
_layouts/                    Custom layout overrides
_reviews/                    Fine-dining review collection
assets/                      Static files, papers, CV, CSS, and images
fine-dining.md               Fine-dining landing page
index.md                     Home page
research.md                  Research page
teaching.md                  Teaching page
.github/workflows/           GitHub Pages build and deployment workflow
```

## Local Development

For a step-by-step guide aimed at maintainers with little or no coding
experience, see [MAINTAINING.md](MAINTAINING.md).

Install dependencies:

```bash
bundle install
```

Build the site:

```bash
bundle exec jekyll build
```

Serve the site locally:

```bash
bundle exec jekyll serve
```

## Deployment

GitHub Actions builds and deploys the site from the `main` branch using
`.github/workflows/jekyll-gh-pages.yml`.

## Build Output Note

This README is documentation for repository visitors only. It is listed in
`_config.yml` under `exclude` so Jekyll does not copy or render it into the
generated GitHub Pages site.
