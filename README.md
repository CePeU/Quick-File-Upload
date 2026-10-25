![GitHub Downloads (latest release)](https://img.shields.io/github/downloads/CePeU/Quick-File-Upload/latest/total)

# Quick File Upload

## What it does

Quick File Upload adds a drag-and-drop upload window to Foundry VTT. Upload local files in batches and automatically send them to the right folders using ordered groups of filename patterns and file-size rules.

It is useful for quickly adding maps, portraits, handouts, and other session files without choosing a destination folder for every upload. You can also paste images or text from the clipboard.

Optional actions can post an image to chat, show it to selected players, create journal image or text pages, or run a macro after uploading. Module settings let you customize the upload window, scene-control button, and routing rules, and import or export your configuration as JSON.

### Full documentation

[Quick File Upload documentation](https://cepeu.github.io/Quick-File-Upload)

## How to use (short)

- Enable **Quick File Upload** in your world's module settings.
- As a GM, open its configuration under **Configure Settings → Module Settings**. Set a fallback upload folder and optionally add groups with rules for filename patterns, maximum file sizes, and destination folders. Rules are checked in order; the first matching rule wins.
- Open the upload window using the cloud-upload button in Foundry's scene controls.
- Leave **All groups** checked to evaluate all included groups, or uncheck it and select a single group. Files without a matching rule use the module fallback folder, or the selected group's default rule when one is configured.
- Drop local files onto the upload pad, or click it to select files. Focus the pad and press **Ctrl+V** to paste clipboard images or text. Check the results list for each file's destination and upload status.
- Optionally configure actions on individual rules to share uploaded images, create journal pages, or execute a macro. Use the module's help menu for details.

Uploading requires Foundry's file-upload permission. Only GMs can save module settings.
