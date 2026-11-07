---
title: "Settings, backup, and transfer"
description: "Chapter 13: drafts, JSON backup, and complete restoration."
tags:
  - documentation
---

# Settings, backup, and transfer

## Drafts and saving

Each menu edits a draft. **Save configuration** validates and applies only that menu's fields; **Cancel** discards unsaved edits. Helper dialogs stage their parent draft rather than saving the world setting.

Separate menus preserve fields saved by other menus. An appearance editor therefore does not overwrite rules saved elsewhere. Directory creation is immediate and is not undone by canceling settings.

## Export a backup

1. Open a configuration menu.
2. Finish edits and correct validation errors.
3. Click **Export JSON**.
4. Save `quick-file-upload-settings.json` locally.

The export contains the full valid draft, including unsaved edits in the current editor and the other settings present in its draft. It does not collect unsaved edits from other open windows. Save other menus and reopen the exporting menu for a backup containing their latest values.

The native Foundry helper avoids externally opening a blob URL in the desktop client. Invalid drafts do not start downloads.

## Import into a draft

1. Open the menu you want to restore.
2. Choose **Import JSON** and select the backup.
3. Review staged values.
4. Save to apply that menu's fields, or Cancel to keep saved world settings.

Invalid JSON, malformed rules, duplicate group IDs, multiple defaults, invalid options, and unsupported export versions are rejected without replacing the draft. Current grouped configurations are accepted; legacy ungrouped settings are not migrated.

## Restore everything

An import contains all categories, but saving applies only the open menu's fields. Import the same backup and save in **each of these five menus**:

1. **Regex groups and rules:** groups, actions, clipboard-only rule options, module fallback.
2. **Scene controls:** placement, parent, position.
3. **Window and appearance:** sizes, labels, colors, initial toggle.
4. **Upload actions and clipboard defaults:** journal filters, audiences, display, application-wide paste.
5. **Clipboard Import:** format, folder, routing preference, naming scheme and presets.

Reopen the uploader for dimensions; reload the client to reset the initial toggle. Help is not another restore category.

## Transfer limits

Backups contain configuration only, not uploaded files, journals, macros, user accounts, or permissions. Copy assets separately. Review journal/macro UUIDs, recipient user IDs, paths, and permissions on the receiving instance; those references may not exist there.

Exports have a versioned envelope with `Module: "quick-file-upload"`, `Version: 2`, and a `Settings` object. Schema version `2` is distinct from module version `1.14.1`.

Previous: [[appearance]] · Next: [[troubleshooting]] · [[index|All chapters]]
