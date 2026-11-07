---
title: "Clipboard imports"
description: "Chapter 6: clipboard access, conversion, and routing priority."
tags:
  - documentation
---

# Clipboard imports

## Import clipboard content

Click the pad text and press **Ctrl+V**, or use **Clipboard import**. The button reads the browser clipboard and may ask for permission. If it fails, the module focuses the pad and suggests Ctrl+V.

Under **Upload actions and clipboard defaults**, **Allow Ctrl+V anywhere in the active upload application** extends paste handling beyond the pad. Paste in editable controls still edits those controls.

| Content | Stored form |
| --- | --- |
| Image | Image in the configured PNG, WebP, or JPG format |
| HTML | An `.html` file preserving the supplied HTML |
| Plain text, including Markdown | A `.txt` file preserving literal text |

The button takes one preferred representation per clipboard item: image first, then HTML, then plain text. Native paste uses available files first, otherwise HTML before plain text. Copying from a web page may therefore import HTML instead of plain text.

Local drops and the cloud chooser remain ordinary imports unless their matching rule uses the **Clipboard Import** action.

## Configure defaults

Open **Configure Settings > Quick File Upload > Clipboard Import**.

| Setting | Default | Behavior |
| --- | --- | --- |
| Clipboard image format | PNG | Convert images to PNG, WebP, or JPG |
| Clipboard default / fallback folder | `assets/clipboard` | Destination for unmatched clipboard files and blank clipboard-rule paths |
| Prefer clipboard defaults over ordinary file rules | Off | Skip ordinary rules after checking explicit clipboard rules |
| Clipboard filename builder | Base plus timestamp/random tokens | Generate names; see [[filename-builder]] |

Conversion changes actual bytes, not just suffixes. JPG composites transparency onto white. Unsupported or corrupt images fail individually; other batch files continue. Non-image contents are retained and receive generated names.

## Clipboard-only rules

In **Regex groups and rules**, enable **Only match clipboard imports** on a rule. Override its image format or inherit the clipboard default.

A blank regex matches every clipboard filename, subject to size. A blank destination inherits the clipboard folder. Ordinary local imports never match these rules.

Routing tests original filenames and sizes before conversion or naming:

1. Select active groups using All groups and the group selection.
2. Check clipboard-only rules in group/rule order.
3. If none matches, check ordinary rules unless **Prefer clipboard defaults** is enabled.
4. If still unmatched, use the clipboard fallback, independently of ordinary module/group defaults.

Clipboard-only rules take priority even when an ordinary rule appears earlier. Group exclusions still apply. A clipboard-only default never becomes an ordinary file's fallback.

## Process a local file with clipboard settings

Set an ordinary rule's built-in action to **Clipboard Import**. A matching local file is rerouted through explicit clipboard-only rules, or otherwise uses clipboard defaults. It is converted/named before being uploaded once.

A matching clipboard-only rule may supply its destination, format, and action configuration. Optional macros run after confirmed storage. This preprocessing action is configured on a rule, not offered in the post-upload action chooser.

## Example: paste image handouts as WebP

1. Set the default image format to WebP and clipboard fallback to `uploads/clipboard`.
2. Add a clipboard-only rule in a `Handouts` group, with regex `/\.(png|jpe?g|webp)$/i` and size `0`.
3. Set the destination to `uploads/handouts` and action to **Show image to players**.
4. Include Handouts in All groups mode, or select it alone.
5. Paste an image and inspect its path and display.

The regex tests the source suffix, not the final `.webp` name. Other clipboard formats need an appropriate pattern or separate rule. Avoid a blank sharing-rule regex when also pasting text, because image sharing requires an image.

All clipboard settings participate in [[settings-transfer|JSON transfer]]. For the filename editor and reusable naming library, see [[filename-builder]] and [[automation]].

Previous: [[regex-examples]] · Next: [[filename-builder]] · [[index|All chapters]]
