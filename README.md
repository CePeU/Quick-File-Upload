![Total Module Downloads (All Versions)](https://img.shields.io/github/downloads/CePeU/Quick-File-Upload/quick-file-upload.zip?label=Total%20Module%20Downloads&color=blue&displayAssetName=false)

![Latest Module Downloads](https://img.shields.io/github/downloads/CePeU/Quick-File-Upload/latest/quick-file-upload.zip?displayAssetName=false&label=Latest%20Module%20Downloads&color=green)


# Quick File Upload

## To Install
Copy this link and paste it manually into your module installation input field called   
"Manifest URL" at the bottom of the Foundry install module dialog.

https://github.com/CePeU/Quick-File-Upload/releases/latest/download/module.json

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
- Drop local files onto the upload pad, or click the cloud icon to select files. Focus the pad and press **Ctrl+V** to paste clipboard images or text. Check the results list for each file's destination and upload status.
- Optionally configure actions on individual rules to share uploaded images, create journal pages, or execute a macro. Use the module's help menu for details.

Uploading requires Foundry's file-upload permission. Only GMs can save module settings.

Clipboard-only routing, real PNG/WebP/JPG conversion, default folders and a drag-and-drop filename builder are available in **Configure Settings > Quick File Upload > Clipboard Import**. See [Clipboard Import](docs/clipboard-import.md) for settings, rule priority and the reusable naming library.

The Foundry file browser also offers **Show to players**, **Post to chat**, **Drop action** and **Group Action** below Select File. Group Action uses the upload window's current group selection and the matching rule action on the existing file path, without uploading or copying. Before opening the upload window it uses the configured initial selection. Upload-time naming and conversion are skipped.

## Version 1.14.1 fixes

Show to players opens the selected image locally for the sender and shares it with all players through Foundry's ImagePopout, without posting to chat. Drop action uses the same image display workflow with the configured recipient defaults.

JSON export uses Foundry v14's native download helper, avoiding external blob links in the desktop client. The downloaded `quick-file-upload-settings.json` contains all validated current editor settings, including unsaved changes, for import on another instance. Import and save in each settings menu to restore its fields.
