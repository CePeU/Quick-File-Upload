---
title: "Filename patterns and size limits"
description: "Chapter 5: copyable regex patterns and inclusive size rules."
tags:
  - documentation
---

# Filename patterns and size limits

## Pattern syntax

Patterns test source filenames, including extensions, rather than local directory paths. Enter a plain pattern or `/pattern/flags`; `i` ignores case. Copy these directly into the field without quotation marks or JSON escaping:

| Goal | Regex | Matches |
| --- | --- | --- |
| Every filename | `.*` | Any filename |
| PNG or WebP | `/\.(png\|webp)$/i` | `map.PNG`, `portrait.webp` |
| Word anywhere | `/monster/i` | `cave-monster.png`, `Monster.txt` |
| Token prefix | `/^token[-_]/i` | `token-orc.png`, `TOKEN_goblin.webp` |
| Common audio | `/\.(ogg\|mp3\|wav)$/i` | `ambience.ogg`, `music.WAV` |
| Numbered maps | `/^map-\d+\.(png\|webp)$/i` | `map-12.png`, `map-3.webp` |

The numbered-map pattern rejects `old-map-12.png`. The token-prefix pattern rejects `orc-token.png`.

`^` anchors the beginning; `$` anchors the end. `\.` matches a literal dot, `|` separates alternatives, `\d+` means one or more digits, and `[-_]` accepts a hyphen or underscore.

A blank ordinary pattern never matches. A blank clipboard-only pattern accepts any clipboard filename, subject to size. See [[clipboard-import]].

## Size limits

**1 KB = 1,024 bytes.** Limits are inclusive: 200 KB accepts up to 204,800 bytes. Enter `0` for unlimited.

Regex is checked first, then size. If a matching file is too large, the next rule is checked. Put a small-file rule before a larger/unlimited rule with the same regex to split destinations.

Limits use the original file size before conversion. A selected-group default ignores its limit when used as fallback. See [[groups-and-rules]].

## Common mistakes

| Symptom | Check |
| --- | --- |
| Only lowercase extensions match | Use `/.../i` |
| Later rules never run | Move catch-all `.*` below specific rules |
| Directory names do not match | Patterns test filenames only |
| A large file uses the group default | Default fallback ignores size |
| Save rejects the pattern | Check delimiters, brackets, parentheses, and flags |

Keep patterns simple; complex expressions can be expensive on long filenames. Validation checks syntax, not whether a pattern expresses your intention.

Previous: [[groups-and-rules]] · Next: [[clipboard-import]] · [[index|All chapters]]
