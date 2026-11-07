---
title: "Journals and recipients"
description: "Chapter 10: destinations, ownership, audiences, and prompts."
tags:
  - documentation
---

# Journals and recipients

Open **Upload actions and clipboard defaults** for defaults used by [[upload-actions|rule actions]] and the file browser's Drop action.

## Destination journal

Enter a **Destination / Observer reference Journal Entry UUID**, identifying the parent Journal Entry. Enable **Ask for destination journal on each import** to choose for each file needing journal creation.

Only editable journals are offered. A saved UUID does not bypass ownership. Standalone image sharing uses the configured reference journal for Observer mode without creating a page.

## Filter the chooser

| Filter | Result |
| --- | --- |
| Journal UUID list | Include explicit editable journals |
| Journal name regex | Include editable world journals matching the pattern |
| Both | Union of UUID entries and name matches |
| Both blank | All editable world journals |

Separate UUIDs with commas or semicolons; each journal appears once. Explicit UUIDs keep input order at the top; remaining matches sort alphabetically. Enable **Sort explicit journals alphabetically into the full dropdown** to merge all entries alphabetically.

**Edit journal UUID list** opens editable rows with resolved names. Apply updates the parent draft; save the parent menu to persist it. Missing UUIDs remain editable and do not hide other matches. Explicit editable compendium Journal Entries can also be resolved by UUID.

## Audiences

| Mode | Recipients |
| --- | --- |
| All players and GMs | Every user, including GMs |
| All players | Non-GM users |
| Journal Observers and Owners | Users with Observer-or-higher permission on the reference journal |
| Selected users | Valid IDs in the comma-separated user list |
| Choose for each upload | Prompt for one of these permission modes |

Observer mode requires a reference journal; standalone images have no journal ownership. User IDs are Foundry IDs, not display names. Unknown IDs are ignored.

**Ask for recipients (defaults preselected)** adds a user chooser after resolving the mode. It can follow **Choose for each upload**. Cancel skips the built-in action for that file.

Immediate display reaches connected clients; offline users have no window to receive it. Empty recipient lists do not broadcast to everyone.

## Display created pages

| Option | Result |
| --- | --- |
| None | Create only |
| Chat | Post a UUID link to the page |
| Show directly to players | Show the page to resolved recipients |

A chat link does not grant ownership. Direct display uses Foundry's journal-show operation. Normal document editing and sharing permissions apply.

## Cancellation

Canceling a journal or audience chooser skips the action; the file stays uploaded. For direct journal display, recipients are resolved before creating the page, so canceling that chooser also skips page creation. A following macro can still run.

Previous: [[upload-actions]] · Next: [[file-browser]] · [[index|All chapters]]
