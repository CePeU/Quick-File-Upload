---
title: "Actions on existing server files"
description: "Chapter 11: share or process files without another upload."
tags:
  - documentation
---

# Actions on existing server files

## Open and select a file

Click **Foundry file browser** in the uploader to open the module fallback folder. The module also adds its controls to other compatible file pickers; folder-only pickers do not get these buttons.

Select a file so its path appears in the file field. Four buttons appear below **Select File**:

| Button | Behavior |
| --- | --- |
| Show to players | Open the image locally and share with all players |
| Post to chat | Post the image publicly to chat |
| Drop action | Open the usual action chooser |
| Group Action | Resolve the active rule and run its action/macro on the existing path |

Buttons leave the picker open and are disabled while an action runs. Show to players and Post to chat require an image extension registered by Foundry.

## Direct display versus Drop action

**Show to players** targets all non-GM users, ignoring audience prompts and reference journals. The sender also sees a local window, including when no player is connected. It does not create a chat message.

**Drop action > Show image to players** uses configured audiences and prompts. Drop action can also create journal pages from eligible images or text. Cancel changes nothing on the server. See [[upload-actions]] and [[journals-and-recipients]].

## Group Action

Group Action uses the uploader's current All groups toggle and selected group. Before an uploader has been opened, the configured initial toggle and first group apply.

It reads actual bytes for size, evaluates the filename and size using ordinary rules, then runs the chosen action and macro. Group exclusions and selected-group defaults work as described in [[groups-and-rules]].

The file is not uploaded, copied, moved, renamed, or converted. The action receives the existing path even if the rule has a different destination. Clipboard Import and Manual naming do no preprocessing here; an attached macro can still run. Without a resolved rule action or macro, nothing runs.

## File access

Group Action fetches the file for size and macro `file` scope. Journal text actions read contents when needed. Browser access and cross-origin restrictions apply.

Direct image display/chat reuse the URL without fetching bytes through the module. Normal Foundry permissions apply to journal actions.

Previous: [[journals-and-recipients]] · Next: [[appearance]] · [[index|All chapters]]
