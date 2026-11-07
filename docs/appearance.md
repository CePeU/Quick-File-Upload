---
title: "Controls and appearance"
description: "Chapter 12: scene controls, dimensions, colors, and defaults."
tags:
  - documentation
---

# Controls and appearance

## Place the scene control

Open **Scene controls**.

| Placement | Behavior |
| --- | --- |
| Main control | Open directly; repeated clicks reopen/focus the uploader |
| Main control with submenu | Dedicated main control with an upload tool |
| Submenu tool | Upload tool beneath a specified parent |

Parent IDs include `tokens`, `tiles`, and `notes`; custom values are accepted. A missing parent falls back to a main control.

Position `0` is first and `-1` is last. Oversized positions append. Saving refreshes controls. The main-control implementation supports Foundry v13 and v14.

## Size the window

Open **Window and appearance**. Enter positive pixels, such as `720`, or percentages, such as `75%`.

| Setting | Default | Percentage reference |
| --- | --- | --- |
| Window width | `720` | Viewport width |
| Window height | `520` | Viewport height |
| Drop pad / header width | `50%` | Application width |
| Drop pad height | `40%` | Application height |
| Header / toggle height | `15%` | Application height |

The group column retains at least 20% of content width. Pad height is capped at 80% to leave room for paths. Header/toggle height has a minimum of two font units; pixel panels scale down with a smaller window. Lists scroll when needed. See [[uploading]] for the layout.

Close and reopen to apply initial window dimensions. **All groups selected when opening the upload window** supplies the initial state when the uploader is first created; the current window's selection is retained across reopening. Reload the client to start again from a changed initial toggle.

## Labels and colors

- **Drop pad name:** blank uses the translated default; custom text is used as entered.
- **Drop pad color:** color of the upload area.
- **Clipboard button name:** blank uses the translated default.
- **Clipboard button color:** independent of the pad.
- **All groups selected when opening the upload window:** checked by default.
- **Alternating rule-row colors:** separate light/dark settings, initially `#e0e0e0` and `#383838`.

Rule rows alternate with each theme's fixed base background. Group colors are independent and can highlight the overview; see [[groups-and-rules]]. Saved row colors update open and future settings editors.

Dropdowns sort by displayed names in the active language. Explicit destination-journal ordering is an exception unless its full-sort option is enabled; see [[journals-and-recipients]].

Previous: [[file-browser]] · Next: [[settings-transfer]] · [[index|All chapters]]
