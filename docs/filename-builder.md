---
title: "The filename builder"
description: "Chapter 7: generated names, tokens, and reusable presets."
tags:
  - documentation
---

# The filename builder

## Build a name

Open **Clipboard Import > Clipboard filename builder**. The generated stem is the **Base filename** followed by tokens in **Filename extensions in order**. Here, “extensions” means name-building tokens; the actual `.png` or other suffix is added separately.

1. Enter a base without a suffix, such as `handout`.
2. Drag a token from **Available extensions** into the ordered list, or use its add-to-filename button.
3. Drag tokens to reorder them or use their arrows.
4. Double-click a token, or use its edit button, to define it.
5. Plus adds a definition; trash removes a preset or selected token independently.
6. Apply, then save the parent **Clipboard Import** menu.

Apply stages the parent draft. Canceling the naming editor leaves the parent unchanged. Canceling the parent discards its unsaved changes.

## Tokens

| Token | Value or behavior |
| --- | --- |
| Date / time | `YYYY`, `YY`, `MM`, `MMM`, `DD`, `HH`, `mm`, `ss`, or combinations |
| Separator | Filename-safe text such as `_`, `-`, `.`, or a space |
| Seconds since 1970 | Unix timestamp in whole seconds |
| Random decimal digits | 1–32 digits, retaining leading zeros |
| SHA-256 of the saved content | Hash of content after clipboard image conversion |
| Active group name | Routed group, or selected group when defaults apply |

Dates use the importing browser's local time. `MMM` uses the active language. `MM` is month; `mm` is minute. Timestamp, hash, and group tokens need no custom value. A group token may be empty when no group is available.

The preview hashes sample content; real imports hash their real content.

## Example

Use base `handout`, then separator `_`, date `YYYY-MM-DD`, separator `_`, and random `4`. A WebP import could become:

```text
handout_2026-11-08_0123.webp
```

The default pattern is `clipboard-image_<timestamp>_<4 random digits>`.

Invalid path/filename characters are removed. Empty results become `clipboard_<epoch seconds>`. Stems are limited to 220 characters and reserved Windows device names are adjusted. Generated names do not guarantee uniqueness against files already on the server.

## Where naming applies

The builder names [[clipboard-import|clipboard imports]] and local files processed by the Clipboard Import rule action. [[manual-naming|Manual naming]] can reuse the scheme or its tokens.

Routing uses the source name and size; generated names do not trigger another routing pass. Existing-file actions do not rename files. For developer use, see [[automation]].

Previous: [[clipboard-import]] · Next: [[manual-naming]] · [[index|All chapters]]
