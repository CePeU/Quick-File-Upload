---
title: Clipboard Import
---

# Clipboard Import

Open **Configure Settings → Quick File Upload → Clipboard Import** to configure:

- **Clipboard image format**: PNG (default), WebP or JPG. The module detects PNG/JPEG/WebP signatures, decodes other supported image types in the browser, and converts the image bytes when necessary. JPG uses a white background for transparency. Unsupported or corrupt images fail individually without stopping the batch.
- **Clipboard default / fallback folder**: initially `assets/clipboard`. Clipboard rules with a blank path inherit this folder. Unmatched clipboard imports also use this folder, independently of the ordinary module/group fallback.
- **Prefer clipboard defaults over ordinary file rules**: when checked, clipboard imports skip ordinary file rules. Explicit clipboard rules always retain priority. Initially unchecked to allow existing file rules to continue matching.
- **Clipboard filename builder**: configure the base name, available token definitions and ordered filename extensions in a modal editor. Apply changes only the parent settings draft; save that menu to persist them. Cancel does not change saved settings.

Use **Ctrl+V** on the focused pad or its clipboard button to import. Local drag and drop and the cloud file chooser remain ordinary uploads unless their matching rule uses the **Clipboard Import** action.

## Rules and priority

Rules have **Only match clipboard imports** and a clipboard image-format choice: **Use clipboard default**, PNG, WebP or JPG. A blank regex in a clipboard-only rule matches any clipboard filename; a nonblank regex and the size limit still apply. A blank path inherits the clipboard folder. Image-format overrides apply to clipboard-only rules.

Routing uses the source filename and size before conversion or renaming. First, included clipboard-only rules are checked in group/rule order. If none matches and clipboard defaults are not preferred, ordinary matching rules are checked. Finally, clipboard defaults provide the fallback. All-groups exclusions and selected-group filtering apply throughout. A clipboard-only rule is never an ordinary file's group fallback, even if marked as the group default.

The predefined rule action **Clipboard Import** treats a matching local file as a clipboard import before upload. It reroutes through explicit clipboard rules, otherwise uses the clipboard folder, default image format and name settings. It uploads once. A matching explicit clipboard rule may override the image format, destination and actions. Macros run after the server confirms the upload, as with other actions. This preprocessing action is configured on a rule; the chooser for post-upload actions continues to offer sharing and journal operations.

## Filename editor

Drag a token from **Available extensions** into **Filename extensions in order**. Drag the selected tokens to reorder them, or use their arrow buttons. The add button copies a preset into the name. The trash button removes a preset or selected token independently. Plus adds a custom definition to either list. Double-click a token, or use its edit button, to change its definition.

| Token | Definition |
| --- | --- |
| Date / time | `YYYY`, `YY`, `MM`, `MMM`, `DD`, `HH`, `mm`, `ss`, or a combined pattern such as `YYYY-MM-DD_HH-mm-ss` |
| Separator | Custom filename-safe text, including `_`, `-`, `.`, or a space |
| Seconds since 1970 | Integer Unix timestamp in seconds |
| Random decimal digits | 1–32 digits, preserving leading zeros |
| SHA-256 | Hash of the final file content after image conversion |
| Active group name | Matching routing group, or the selected group when defaults apply |

Dates use the importing browser's local time. `MMM` uses the active language. The preview uses sample content for its hash. The file extension is added from the actual image format or the original non-image file. HTML and plain text retain their contents.

For example, base `clipboard-image`, then `_`, `YYYY`, `_`, `MM`, `_`, and a four-digit random token produces `clipboard-image_2024_10_1234.png`. An empty resulting name becomes `clipboard_<seconds since 1970>`. Invalid filename/path characters are removed. The default naming pattern uses `clipboard-image_<timestamp>_<4 random digits>`.

All clipboard defaults, token definitions and per-rule options participate in JSON export/import. Older configurations receive the new defaults automatically. Import and save the Clipboard Import menu to apply its fields; the groups menu saves rule options separately.
