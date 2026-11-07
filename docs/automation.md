---
title: "Automation reference"
description: "Advanced reference for application APIs, macros, and naming."
tags:
  - documentation
---

# Automation reference

## Open the application

A Foundry script macro can open or focus the uploader:

```js
await game.modules.get("quick-file-upload").api.Upload();
```

Open the groups/rules configuration:

```js
game.modules.get("quick-file-upload").api.Settings();
```

The module must be enabled and initialized. Normal upload/GM permissions apply. These open applications; they are not a separate headless batch-upload API.

## Rule macro scope

Configure a Macro UUID as described in [[upload-actions]]. The macro receives `file`, `path`, and `rule`:

```js
console.log("Quick File Upload saved", {
  name: file.name,
  size: file.size,
  path,
  action: rule.Function
});
```

`path` is the confirmed uploaded path, or the existing path for [[file-browser|Group Action]]. `rule` is the action configuration, not the whole routing rule. For prepared uploads, `file` reflects the uploaded name/content. Group Action provides a File from fetched content.

Both macro-order options run after storage. Conversion and manual naming happen earlier. See [[upload-actions]] for error and cancellation order.

## Reuse the filename library

`scripts/name-builder.js` exports a filename-stem generator:

```js
const { GenerateFileName } = await import(
  "/modules/quick-file-upload/scripts/name-builder.js"
);

const stem = await GenerateFileName({
  Base: "handout",
  Parts: [
    { Type: "separator", Value: "_" },
    { Type: "date", Value: "YYYY-MM-DD" },
    { Type: "separator", Value: "_" },
    { Type: "group", Value: "" }
  ],
  Presets: []
}, {
  Date: new Date(),
  Group: "Maps",
  Locale: game.i18n.lang,
  Content: new Blob(["example"])
});

console.log(stem); // e.g. handout_2026-11-08_Maps
```

The result is sanitized and has no file suffix. Optional context supplies Date, Group, Locale, and Content. A hash token with omitted Content hashes empty bytes. See [[filename-builder]].

`CreateNameService({ Read, Write, Location })` wraps caller-owned storage. `Read(location)` returns a naming configuration; `Write(location, settings)` saves it. Returned methods are `ReadSettings()`, `SaveSettings(settings)`, and `GenerateName(context)`; callbacks may be asynchronous.

`OpenNameEditor({ Read, Write, Location })` in `scripts/name-editor.js` provides the modal editor for that adapter. These exports are advanced integrations; settings menus remain the normal workflow.

## Scene-control helpers

`scripts/scene-controls.js` exports `InsertControl`, `RegisterActionControl`, and `BindActionControl`. Callers supply control options and their opening callback. Consult source signatures before integrating with another module.

Related: [[upload-actions]] · [[filename-builder]] · [[documentation-maintenance]] · [[index|All chapters]]
