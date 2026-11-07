---
title: "Manual naming"
description: "Chapter 8: choose names before uploading one file or a batch."
tags:
  - documentation
---

# Manual naming

## Enable the action

Set a rule's **Built-in action** to **Manual naming**, then save. Files routed to it ask for names before storage. Routing uses the source filename; the new name does not change the destination.

Manual naming occupies the built-in action slot, rather than adding a post-upload sharing action. A macro can still be configured on that rule.

## One file

Enter a filename **without its extension**. The actual suffix is retained, including a converted clipboard image's format. Enter `cave-handout` to save a PNG as `cave-handout.png`.

**Use clipboard naming scheme** fills the complete generated stem from [[filename-builder]]. Edit it if needed, then confirm.

## Shared batch names

When the complete import contains multiple files, the initial dialog asks for a shared base. Its clipboard shortcut copies only the configured base. Naming tokens are then generated for each manually named file.

For example, base `handout` and tokens `_` plus group produce `handout_Maps.png` for a PNG routed to Maps. Only files using manual naming receive these names; other batch files retain their normal naming behavior.

## Separate names

Enable **Name each file separately**, then confirm the initial dialog. Each matching file gets a dialog for an exact stem. Separate names do not automatically receive batch tokens; the clipboard shortcut is still available per file.

## Cancellation and duplicates

All naming dialogs finish before the first upload. Canceling or closing any one aborts the entire import, including files using other rules. Nothing from that import has been uploaded yet.

Invalid characters are removed. Duplicate manually named paths within the same batch receive `-2`, `-3`, and later suffixes while retaining the extension. This does not check for files already on the server; Foundry handles existing filenames.

Previous: [[filename-builder]] · Next: [[upload-actions]] · [[index|All chapters]]
