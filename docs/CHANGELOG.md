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

