---
title: "Maintaining the documentation"
description: "Obsidian notes, static publishing, and language-specific help."
tags:
  - documentation
---

# Maintaining the documentation

## Use this folder in Obsidian

Open `docs/` as a vault or include it in your existing vault. [[index|Quick File Upload]] is the entry point. Every Markdown file is a separate note and source page for the static site.

Internal links use Obsidian wikilinks:

```text
[[groups-and-rules]]
[[groups-and-rules|Groups, rules, and folders]]
```

The target is the exact basename without `.md`; the optional label controls display text. In Markdown tables, escape a label separator as `\|`. External URLs use ordinary Markdown links. Existing filenames `index`, `clipboard-import`, and `CHANGELOG` are retained.

## Note structure

Each note has YAML title, description, and tags, followed by an H1, focused sections, and navigation. The index defines chapter order. Standard headings, tables, lists, and code fences keep notes portable.

When adding a chapter:

1. Choose a unique, stable lowercase hyphenated filename.
2. Add frontmatter and a descriptive H1.
3. Link from the index and a related note.
4. Update previous/next navigation.
5. Verify wikilinks and heading fragments after renaming.

Keep historical releases in [[CHANGELOG]]; describe current behavior in the handbook.

## Static publishing

`.github/workflows/GithubPages.yml` builds Quartz using `docs/` as content and publishes the generated site to GitHub Pages. `quartz.config.yaml` enables Obsidian Markdown and internal-link resolution. Generated HTML is not stored with source notes.

The configured site is [Quick File Upload documentation](https://cepeu.github.io/Quick-File-Upload/). The configuration excludes `.obsidian`, `.trash`, `private`, `privat`, and `templates`. Other ordinary content under `docs/` is a publishing input.

A local Markdown edit does not publish the site. Pushing documentation changes to the configured main branch triggers the existing workflow. This handbook does not change hosting configuration.

## In-app help is separate

The module loads `help/en_help.json` or `help/de_help.json` according to client language. Locale variants use the base language, such as `de-DE` selecting `de_help.json`. There is no automatic English fallback. These files are outside the vault.

```json
{
  "Intro": "Brief introduction.",
  "Topics": [
    {
      "Title": "Topic title",
      "Paragraphs": ["First paragraph.", "Second paragraph."]
    }
  ]
}
```

Text is displayed literally, not as HTML, Markdown, or translation keys. Topics are expandable; the first starts expanded. The help menu and editor button appear last when available.

Reopen help to load edited JSON without changing JavaScript. Reload Foundry after adding a file for a previously unavailable language. Missing, invalid, or unavailable active-language help omits the entry at startup without stopping the module.

Related: [[installation]] · [[troubleshooting]] · [[index|All chapters]]
