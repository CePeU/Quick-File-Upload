## [1.14.1] / 2026-11-07
### Fixed
- Show to players opens the selected image for the sender as well as sharing it with players, without posting to chat. No duplicate local window is opened when the sender is already a recipient, and empty audiences never broadcast.
- Settings JSON export uses Foundry's native download helper so the desktop client saves the file instead of opening an external blob link. Validated unsaved settings remain portable through JSON import.

## [1.14.0] / 2026-11-07
### Added
- Four buttons below Select File in Foundry's file browser: Show to players, Post to chat, Drop action, and Group Action.
- Existing-file actions reuse the selected URL, action chooser, journal workflow and rule macros without uploading or copying files. Direct image sharing targets all players.
- Group actions follow the upload window's current group selection and ordered filename/byte-size rules, including selected-group defaults. Before opening the uploader, its configured initial selection applies. Upload-time naming and conversion are skipped.
- English/German labels and help, Foundry image-extension support, and regression coverage.

## [1.13.0] / 2026-11-01
### Changed
- Help topics now load from language-specific `help/en_help.json` and `help/de_help.json`, selected after client localization initializes. Missing or invalid help omits the help menu and editor button.
- Help covers current routing, clipboard imports, filename building, manual naming, actions and settings, including six working regex examples.
- The rule regex placeholder now includes `.*` for all filenames.
- Help is the last module settings entry and last editor toolbar button, with a clickable Github documentation link in its settings hint.
- Release archives now include the help JSON files. Help text reloads on opening without browser caching.

## [1.12.0] / 2026-11-01
### Added
- Manual naming rule action with a modal filename input, clipboard naming shortcut, shared batch bases and optional separate names for each file.
- All naming dialogs are confirmed before uploading; Cancel or closing any dialog aborts the entire import, including files using other actions.
- Shared names expand clipboard naming tokens per file; repeated manual names in the same batch and folder receive numbered suffixes. File extensions and upload formats are preserved.
- Reusable scene-control helpers in `scripts/scene-controls.js`, independent of module settings and upload code.
### Fixed
- The main scene-control button survives Foundry v13's removal of controls without tools. Repeated clicks open the uploader without changing the active canvas control. Foundry v14 retains its direct main control.

## [1.11.0] / 2026-11-01
### Added
- Clipboard-only rules with PNG, WebP, JPG or inherited image formats, real browser image conversion, and independent clipboard fallback routing.
- A Clipboard Import settings menu with image format, folder, an option to prefer clipboard defaults over ordinary rules, and configurable filenames.
- A modal filename builder with draggable/reorderable tokens, editable presets, separators, date/time patterns, timestamps, random digits, SHA-256 and active group names.
- A standalone naming library with caller-supplied settings storage callbacks.
- A Clipboard Import rule action that applies clipboard processing before a single upload of a local file.
### Changed
- Explicit clipboard rules take priority within the active groups; local uploads do not match clipboard-only rules.
- Clipboard settings, naming presets and rule overrides participate in JSON export/import. Existing configurations receive defaults.

## [1.10.0] / 2026-11-01
### Added
- Clipboard import button inside the drop pad, with configurable label and color, tooltip, and Ctrl+V fallback when browser clipboard access fails.
- Foundry file browser button below upload-action settings.
- Configurable initial All groups state in Window and appearance.
### Fixed
- Local file selection is limited to the cloud button; clicking the pad text focuses the pad for Ctrl+V while drag and drop remains available throughout the pad.

## [1.9.0] / 2026-10-25
### Added
- Main control with submenu as a third scene-control placement.
- Clone buttons for groups and rules, with numbered names and insertion immediately below the source. Clones include unsaved edits; cloned rules do not become an additional group default.
### Fixed
- Repeated clicks on the main control reopen the upload window after closing it.
- Main placement no longer creates an upload submenu; upload tools remain clickable on every use.

## [1.8.0] / 2026-10-25
### Added
- First Github release
### Fixed
### Changed
### Removed
### Deprecated
### Security

### Comments

