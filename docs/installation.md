---
title: "Installation and permissions"
description: "Chapter 1: install the module and prepare a world."
tags:
  - documentation
---

# Installation and permissions

## Install and enable

1. In Foundry's setup screen, open **Add-on Modules** and choose **Install Module**.
2. Paste this address into **Manifest URL**:

```text
https://github.com/CePeU/Quick-File-Upload/releases/latest/download/module.json
```

3. Install the module, open your world, and enable **Quick File Upload** in **Manage Modules**.
4. Reload if prompted. Look for the cloud-upload scene control.

For manual installation, place the release contents in `Data/modules/quick-file-upload/`. Include `module.json`, `scripts/`, `styles/`, `lang/`, and `help/`. Development dependencies are not needed to run the module.

## Permissions

Only GMs can save the module's world settings. Users need Foundry's **Upload New Files** permission to open and use the uploader. Browsing, folder creation, macro execution, and journal editing also follow normal Foundry permissions.

Public chat images are visible through chat; recipient defaults apply to direct image/journal sharing, not public chat actions.

## Find the settings

Open **Configure Settings > Quick File Upload**. Configuration is split across five menus:

| Menu | Purpose |
| --- | --- |
| Regex groups and rules | Groups, rules, rule actions, and module fallback |
| Scene controls | Button placement, parent control, and position |
| Window and appearance | Dimensions, labels, colors, and initial All groups state |
| Upload actions and clipboard defaults | Journal/audience defaults and application-wide paste |
| Clipboard Import | Clipboard format, folder, routing preference, and naming |

**Settings help** is an additional entry when a valid help file is available for the client's language. It is not a configuration category.

## Updating

Update through Foundry and reload connected clients. Back up with [[settings-transfer|Export JSON]] before changing worlds or making substantial edits. Current grouped configurations are supported; legacy ungrouped formats are not migrated.

Check [[CHANGELOG|Changelog]] for release changes.

Next: [[quick-start]] · [[index|All chapters]]
