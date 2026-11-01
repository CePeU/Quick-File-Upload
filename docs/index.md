---
title: Quick File Upload
---

# Quick File Upload

## What it does

Quick File Upload adds a drag-and-drop upload window to Foundry VTT. Upload local files in batches and automatically send them to the right folders using ordered groups of filename patterns and file-size rules.

It is useful for quickly adding maps, portraits, handouts, and other session files without choosing a destination folder for every upload. You can also paste images or text from the clipboard.

Optional actions can post an image to chat, show it to selected players, create journal image or text pages, or run a macro after uploading. Module settings let you customize the upload window, scene-control button, and routing rules, and import or export your configuration as JSON.


## How to use (short)

- Enable **Quick File Upload** in your world's module settings.
- As a GM, open its configuration under **Configure Settings → Module Settings**. Set a fallback upload folder and optionally add groups with rules for filename patterns, maximum file sizes, and destination folders. Rules are checked in order; the first matching rule wins.
- Open the upload window using the cloud-upload button in Foundry's scene controls.
- Leave **All groups** checked to evaluate all included groups, or uncheck it and select a single group. Files without a matching rule use the module fallback folder, or the selected group's default rule when one is configured.
- Drop local files onto the upload pad, or click it to select files (click on the cloud symbol !). Focus the pad and press **Ctrl+V** to paste clipboard images or text or use the button available for this action. Check the results list for each file's destination and upload status.
- Optionally configure actions on individual rules to share uploaded images, create journal pages, or execute a macro. Use the module's help menu for details.

Uploading requires Foundry's file-upload permission. Only GMs can save module settings.
## Clipboard Import

Version 1.11.0 adds clipboard-only rules, real PNG/WebP/JPG conversion, clipboard default folders and a modal filename builder. Open **Configure Settings > Quick File Upload > Clipboard Import**. See [[clipboard-import|Clipboard Import settings and naming library]] for routing priority, date/time tokens, drag-and-drop name building and examples.

## Manual naming

Select **Manual naming** as a rule's built-in action. Before uploading, a modal asks for a filename **without its extension**. **Use clipboard naming scheme** copies the complete configured clipboard name for a single file. File routing still uses the original filename; manual naming changes the saved name.

For multiple files, enter a shared base name. The shortcut copies only the clipboard base; the configured naming extensions are generated separately for every file using that base. For example, a base of `handout` and an underscore/group token sequence produce `handout_Maps.png`. Duplicate manual names in the same batch folder gain `-2`, `-3`, etc.

Enable **Name each file separately** and confirm the batch dialog to enter the exact stem for each file matched by a manual-naming rule. Separate names do not automatically receive the batch naming extensions. The clipboard shortcut remains available in each individual dialog.

All naming dialogs finish before the first upload. **Cancel** or closing any naming dialog cancels the entire import. Invalid filename characters are removed; actual file extensions, clipboard image conversion and optional rule macros remain supported.

The main scene-control button supports Foundry v13 and v14. Reusable control registration, ordering and click binding are exported from `scripts/scene-controls.js`; callers supply identifiers, labels, placement, generation and their own application-opening callback.
