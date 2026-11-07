---
title: "Your first upload"
description: "Chapter 2: a minimal upload and a first routing rule."
tags:
  - documentation
---

# Your first upload

## Upload with the defaults

1. Enable the module as described in [[installation]].
2. Click the cloud-upload scene control.
3. Leave **All groups** checked. No groups are required for this first upload.
4. Click the cloud icon and choose a local file, or drop a file onto the pad.
5. Read the result beneath the pad controls. A successful result includes the server-confirmed path.

The default module fallback is `assets`. An unmatched ordinary file goes there. Clipboard imports have a separate default folder, `assets/clipboard`.

## Create an Images group

As GM, open **Regex groups and rules** from the uploader or world settings.

1. Set **Module fallback folder** to `uploads/other`.
2. Choose **Add group** and enter the unique identifier `Images`.
3. Add a rule named `PNG and WebP`.
4. Enter the filename regex `/\.(png|webp)$/i`.
5. Leave **Max size** at `0` for unlimited and set **Destination path** to `uploads/images`.
6. Leave the built-in action at **None** and save.

Upload `portrait.webp`; it should go to `uploads/images`. Upload `notes.txt`; it should go to `uploads/other`. Missing folders are created when permissions allow.

## Select one group

Uncheck **All groups** and select **Images**. Only that group's rules run. Unmatched ordinary files use its group-default rule, if configured, or the module fallback.

Selecting a group does not send every file to its first rule. Use `.*` for a catch-all rule, or mark one rule **Group default** for a selected-group fallback. See [[groups-and-rules]].

## Add an action

Once routing works, edit `PNG and WebP` and choose **Show image to players**. Configure the audience under **Upload actions and clipboard defaults**, save, then upload another image.

Storage completes before the image is shown. Use **Chat** for a public chat message. See [[upload-actions]] and [[journals-and-recipients]].

Previous: [[installation]] · Next: [[uploading]] · [[index|All chapters]]
