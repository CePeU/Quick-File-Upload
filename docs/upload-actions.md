---
title: "Actions and macros"
description: "Chapter 9: built-in rule actions and post-upload macros."
tags:
  - documentation
---

# Actions and macros

## Configure a rule action

Open **Regex groups and rules** and choose a rule's **Built-in action**. The first matching rule supplies the action. A selected-group default supplies it when used as fallback. The module fallback has no action.

| Action | Behavior | Requirement |
| --- | --- | --- |
| None | Store without a built-in follow-up | Any supported upload |
| Chat | Post the saved image publicly to chat | Image |
| Show image to players | Display through Foundry's ImagePopout to the resolved audience | Image |
| Create journal image page | Add an image page to an editable journal | Image |
| Create journal text page | Add a text page to an editable journal | Text, Markdown, or HTML |
| Choose for each upload | Ask after storage which concrete action to run | Depends on choice |
| Clipboard Import | Apply clipboard processing before storage | See [[clipboard-import]] |
| Manual naming | Collect filenames before storage | See [[manual-naming]] |

Ordinary actions run only after Foundry confirms the saved path. Clipboard Import and Manual naming prepare files before upload; they are not offered in the post-upload chooser.

## Share images

**Chat** creates a public image message. It does not use recipient filters.

**Show image to players** opens an image window for resolved recipients. A sender outside the audience also gets a local window; a sender inside the audience receives it through Foundry's sharing event. An empty audience is never broadcast to everyone.

Set audiences and prompts under **Upload actions and clipboard defaults**; see [[journals-and-recipients]]. The file browser's direct [[file-browser|Show to players]] button always targets all players instead of the configured audience.

## Create journal pages

Choose a journal UUID or enable its chooser. The current user must be able to edit that journal. Image pages reference the saved path. Text and Markdown files are preserved literally, not rendered as Markdown. HTML is supplied to Foundry's journal handling as HTML.

After creation, **Display created journal page** can do nothing, post a page UUID link to chat, or show the page directly. See [[journals-and-recipients]].

## Choose for each upload

The dialog identifies the stored file and offers None, Chat, image sharing, journal image, and journal text. Each file gets its own choice with normal defaults and type checks.

Cancel skips the action without undoing storage. A configured following macro can still run.

## Macros and execution order

Enter a **Macro UUID** on the rule; its resolved name is shown. **Run macro before built-in action** changes the order, but both orders run after confirmed storage.

| Scope variable | Contents |
| --- | --- |
| `file` | The uploaded file, including preparation and renaming |
| `path` | The server-confirmed path |
| `rule` | A copy of action settings: Macro, Before, and Function |

`rule` is not the whole routing rule or group. Normal macro permissions apply. See [[automation]] for examples.

If an action or macro throws, storage remains successful and the error appears beside the path. Later batch files continue. A failing earlier macro prevents the built-in action; a failing built-in action prevents a following macro. Canceling a chooser simply skips its action and allows a following macro.

Previous: [[manual-naming]] · Next: [[journals-and-recipients]] · [[index|All chapters]]
