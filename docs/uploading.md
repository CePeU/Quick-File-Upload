---
title: "The upload window"
description: "Chapter 3: upload controls, selection, and per-file results."
tags:
  - documentation
---

# The upload window

## Read the layout

| Position | Contents |
| --- | --- |
| Top left | Upload pad, clipboard button, status, and results |
| Top right | Configuration shortcuts, file browser, and All groups toggle |
| Bottom left | Active rule names, destination paths, and fallback |
| Bottom right | Selectable group identifiers |

Hover a group to see its rules and paths. The overview lists rules in evaluation order; it is not a list of stored files. Clipboard imports can use the separate fallback in [[clipboard-import]].

## Add files

**Drag and drop:** drop local files anywhere on the pad, including its clipboard button. The drop zone is limited to the pad dimensions.

**Local chooser:** click the cloud icon to choose multiple files. Clicking the text below the cloud focuses the pad for pasting.

**Clipboard:** click the pad text and press **Ctrl+V**, or click **Clipboard import**. See [[clipboard-import]] for content and browser access.

**Existing server files:** click **Foundry file browser**. Its extra buttons use the existing path without uploading again. See [[file-browser]].

## Choose routing mode

With **All groups** checked, included groups run in order. With it unchecked, only the selected group runs. The first configured group is initially selected; the initial checkbox state is configurable in [[appearance]].

An excluded group remains selectable; its exclusion only affects All groups mode. See [[groups-and-rules]].

## Read results

| Result | Meaning |
| --- | --- |
| Uploading | The file is being processed/stored |
| Uploaded with a path | Foundry confirmed storage |
| Uploaded with an action error | Storage succeeded, but a later action failed |
| Failed | Preparation, directory creation, or upload failed |

An individual preparation, upload, or action failure does not stop later batch files. Avoid re-uploading an **Uploaded** file just to retry sharing; use [[file-browser]].

Each batch uses a fixed settings snapshot. Wait for it to finish before starting another; selection and upload controls are disabled while processing.

[[manual-naming|Manual naming]] is a special preparation step: all naming dialogs finish before the first upload. Canceling any one cancels the entire import.

Previous: [[quick-start]] · Next: [[groups-and-rules]] · [[index|All chapters]]
