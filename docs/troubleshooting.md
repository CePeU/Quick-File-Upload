---
title: "Troubleshooting and limits"
description: "Chapter 14: diagnose common problems and supported boundaries."
tags:
  - documentation
---

# Troubleshooting and limits

## Uploader or settings are missing

Enable the module in the current world and reload after updates. Only GMs can save settings. The uploader requires **Upload New Files** permission.

If a submenu parent is missing, look for the fallback main control. See [[appearance]]. A script macro can open the app through [[automation]].

## A file goes to the wrong folder

1. Check All groups and the selected group.
2. Review group/rule order; first regex-and-size match wins.
3. Check group exclusion from All groups mode.
4. Test the original name and size, not the generated name or converted size.
5. Check [[groups-and-rules|fallback behavior]]: All groups ignores group defaults.
6. For clipboard imports, check the clipboard-only pass, ordinary-rule preference, and separate fallback.

A blank ordinary regex never matches. Default fallback ignores size. A catch-all above specific rules hides them. See [[regex-examples]].

## Upload or folder creation fails

Use relative paths such as `uploads/maps`, not absolute paths or `../`. Verify upload, browse, and directory permissions. Foundry's supported types and server limits still apply.

Read each result. **Uploaded** with an action error means the file exists; retry through [[file-browser]] rather than assuming storage failed. Other files normally continue after individual failures.

## Clipboard fails

Click the pad text and press **Ctrl+V**. The button depends on browser clipboard access and may need permission. Paste into editable controls intentionally stays native.

For paste elsewhere in the uploader, enable application-wide paste. An image must be valid and browser-decodable to convert. See [[clipboard-import]].

## Players do not see an image

Check the action type, audience, and connected clients. All players excludes GMs; All players and GMs includes them. Selected IDs must exist. Observer mode needs a reference journal and ownership.

The file browser's **Show to players** uses all players and also displays locally. **Drop action > Show image to players** uses configured audiences. Neither creates chat; choose Chat/Post to chat for that.

Empty audiences do not broadcast. Canceling a chooser skips the action; a failing earlier macro prevents it. See [[upload-actions]] and [[journals-and-recipients]].

## Journal or macro fails

Verify UUIDs on this world, journal edit ownership, and macro execution permissions. Importing settings does not copy documents or permissions.

Journal text accepts text, Markdown, and HTML. Markdown remains literal. Posting a page link does not grant access.

## JSON export opens a blob link

Version 1.14.1 uses Foundry's native download helper. Update and reload the client to replace cached scripts. Export a valid draft and check the browser/desktop download destination.

If imports seem incomplete, import and save in all five menus. See [[settings-transfer]].

## Naming cancels everything

All manual dialogs complete before storage. Cancel or closing any one aborts the entire import. Separate-file naming also requires confirming the initial batch dialog. See [[manual-naming]].

## Help is missing

A missing or invalid active-language help JSON omits the entry at startup, with no automatic English fallback. See [[documentation-maintenance]].

## Limits

- Local batches are supported; directory-tree uploads and URL drops are not.
- Upload storage uses Foundry's `data` source; S3 routing is unsupported.
- Existing-file actions do not move, rename, or convert files.
- Remote-file reads depend on browser access and cross-origin rules.
- Export excludes actual assets, documents, users, and permissions.
- Existing-filename behavior and upload limits follow Foundry. Generated names do not ensure server-wide uniqueness.

Previous: [[settings-transfer]] · Reference: [[automation]] · [[index|All chapters]]
