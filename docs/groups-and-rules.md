---
title: "Groups, rules, and folders"
description: "Chapter 4: ordered routing, fallbacks, exclusions, and paths."
tags:
  - documentation
---

# Groups, rules, and folders

## Maintain groups and rules

Open **Regex groups and rules**. Each group needs a nonempty, unique identifier; this is its uploader name. Rule names must be nonempty but may repeat.

Use arrows to reorder groups and rules. **Clone entry** copies current unsaved values immediately below the source, with a numbered name. Cloned rules do not create an additional default. Delete removes the corresponding item from the draft; save to apply.

A group color marks its settings area. Enable its overview option to color its uploader selector and paths. Rule-row colors are separate; see [[appearance]].

## Match a file

For ordinary files, the module tests the original filename against the regex, then checks the original byte size. The first rule passing both checks wins. An oversized match continues to the next rule.

Renaming and conversion happen after routing. See [[regex-examples]] for patterns and boundaries. Clipboard imports add the priority pass in [[clipboard-import]].

## Modes and fallbacks

| Mode | Rules evaluated | If no rule matches |
| --- | --- | --- |
| All groups checked | Included groups in order, each group's rules in order | Module fallback; group defaults ignored |
| All groups unchecked | Selected group's rules in order | That group's default, otherwise module fallback |

A selected-group default supplies its path and action when used as fallback. Its regex and size are ignored in that role. It can also match normally if its pattern and size qualify.

Only one rule per group may be default. Marking another clears the previous flag. A clipboard-only rule is never an ordinary file's fallback.

**A blank ordinary regex never matches directly.** It is useful for a default-only rule. Use `.*` for a catch-all; it matches immediately and can hide later rules.

## Exclude a group

Enable **Skip when processing all groups** to omit that group and its rules from All groups mode. It still works when selected explicitly. If every group is excluded, ordinary all-group uploads use the module fallback.

## Example: split maps by size

Create a `Maps` group with these rules in order:

| Rule | Regex | Max KB | Path | Default |
| --- | --- | --- | --- | --- |
| Small WebP | `/\.webp$/i` | 200 | `uploads/maps/small` | No |
| Other WebP | `/\.webp$/i` | 0 | `uploads/maps/large` | No |
| Maps fallback | blank | 0 | `uploads/maps/other` | Yes |

Set the module fallback to `uploads/unsorted`.

- A 100 KB WebP uses `uploads/maps/small`.
- A 300 KB WebP skips the first limit and uses `uploads/maps/large`.
- An unmatched JPG uses `uploads/maps/other` when Maps is selected alone.
- In All groups mode, that JPG uses `uploads/unsorted` unless another group matches.

## Destination paths

Use paths relative to Foundry's `Data` directory, such as `uploads/maps`. Absolute paths, Windows drive paths, and traversal such as `../` are rejected.

**Browse / create folder** starts at the entered folder. An empty ordinary destination starts at the draft fallback, then the saved fallback, then `assets`. URI-encoded spaces such as `03%20Musik` normalize to `03 Musik`.

Missing folders are created during upload when permitted. Creating a directory in the picker takes effect immediately; canceling settings does not remove it. Uploads use Foundry's `data` source; S3 routing is unsupported.

Previous: [[uploading]] · Next: [[regex-examples]] · [[index|All chapters]]
