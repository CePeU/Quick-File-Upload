# Quick File Upload

A Foundry VTT v14 module using ApplicationV2. Upload multiple local files through ordered groups of filename and size rules. English and German translations are included.

## Install

Copy `module.json`, `scripts/`, `styles/`, and `lang/` into `<Foundry user data>/Data/modules/quick-file-upload/`. Restart Foundry and enable **Quick File Upload** in Manage Modules. No build or runtime dependencies are needed; `node_modules` is only used for development tests.

The module ID is `quick-file-upload`, matching the manifest. This development version uses the `groupSettings` setting and starts with fresh defaults. Earlier settings and legacy JSON formats are not read or migrated. Configure your groups again after updating and reload Foundry before testing.

## Configure and upload

Version 1.8.0 adds two color pickers in **Window and appearance** for alternating rule rows in the light and dark themes. Each theme keeps its fixed light/dark base row and alternates it with the configured color. Defaults remain `#e0e0e0` for light and `#383838` for dark. Save applies the colors to open and future settings windows; group colors are independent. Colors are included in settings export/import.

Version 1.7.0 uses opaque alternating neutral backgrounds for rules: dark/gray in the dark theme and light/gray in the light theme. Group colors remain on group areas and optional overview accents. Recipient permissions now distinguishes **All players** (excludes GMs) from **All players and GMs**; saved all-user settings retain their behavior.

Dropdowns sort alphabetically by their displayed names in the active language. Destination journals are the exception: explicit UUIDs appear first in input order, followed by other matching journals alphabetically. Enable **Sort explicit journals alphabetically into the full dropdown** in Upload actions to merge all journals into one alphabetical list. UUID lists accept commas or semicolons and show each journal once. This does not change group or rule evaluation order.

As of 1.6.0, world setup has four separate menus: **Regex groups and rules**, **Scene controls**, **Window and appearance**, and **Upload actions and clipboard defaults**. The upload window exposes the regex and upload-action buttons above **All groups**. Scene controls and appearance are available through world setup. Each menu saves only its own settings and preserves changes saved from other open menus. JSON exports contain the full draft; importing and saving applies only the open menu's fields. To restore all settings, import the export in each of the four menus.

Rule rows alternate background intensity. Each group offers a color picker and an optional overview flag, which applies the color to its upload selector and paths. Scene-control parent IDs offer core suggestions while allowing custom values.

In Upload actions, restrict the destination journal dropdown using semicolon-separated UUIDs, a name regex (plain or `/pattern/flags`), or both. The union is shown: explicit UUIDs are included regardless of name; the regex adds matching journals. Blank filters show all editable world journals. Journal ownership is always required. **Edit journal UUID list** opens a separate window with editable UUID rows and resolved names; Apply changes only the parent draft, and Save persists it. Missing UUIDs remain visible for correction but do not hide other matching journals.

**All players and GMs** includes every user. Recipient permissions also offers **Choose for each upload**, which asks for All, Observer/Owner, or Selected users when sharing. The existing individual recipient chooser can follow this mode selection. Canceling either chooser skips the built-in action.

1. As GM, open **Configure Settings → Quick File Upload → Quick File Upload Configuration**.
2. Add groups with unique identifiers. Add named rules within each group. Rule names may repeat. Use the arrows to reorder groups or rules; × deletes the corresponding item. Each rule contains a filename regex, maximum file size in KB, destination path, and optional group-default flag.
3. Set the module fallback folder, initially `assets`. Mark at most one rule per group as its default. Selecting a new default clears the old flag.
4. Save, then open the cloud-upload scene control. The right-hand list contains only group identifiers. Hover a group to see its rules and paths. The folder panel lists active rule names and destinations in evaluation order.
5. Drop local files onto the pad or click the cloud icon to choose files. Every file receives a success or failure result; an individual failure does not stop the batch. The routing configuration is held constant for each batch.

**Settings help** opens a separate window with expandable explanations of every settings category. It is available from the editor and as a settings menu entry.

## Routing

| Mode | Rules checked | If no rule qualifies |
| --- | --- | --- |
| **All groups** checked | Groups from top to bottom; each group's rules from top to bottom | Module fallback; group defaults are ignored |
| **All groups** unchecked | Only the selected group's rules, in order | That group's default, or module fallback if none is defined |

Each rule tests the filename regex **first**, then the size limit. The first rule passing both checks wins. A matching regex with an oversized file continues to the next rule. The selected-group mode also evaluates regex and size; it no longer bypasses rules.

Enable **Skip when processing all groups** on a group to exclude it and all its rules from **All groups** mode. It remains in the selector and runs normally, including its fallback, when selected with **All groups** unchecked. The folder panel shows only rules active in the current mode. The exclusion flag defaults to false and is included in JSON import/export. If all groups are excluded, all-group uploads use the module fallback.

Regex examples: `\.(png|jpg|webp)$` or `/\.(png|jpg|webp)$/i` for case-insensitive matching. Patterns match filenames, not local directory paths. Blank regexes never match, but their rules can serve as group defaults. Use simple patterns to avoid costly regex evaluation on long filenames.

Size limits are inclusive: **1 KB = 1,024 bytes**, so a 200 KB rule accepts files up to 204,800 bytes. `0` means unlimited. When a rule is used as a group fallback, its regex and size limit do not restrict the fallback.

Only the current grouped settings structure is supported.

## JSON import and export

**Export JSON** downloads all current valid editor settings, including unsaved edits, groups and rules in their displayed order, defaults, limits, menu placement, and appearance.

**Import JSON** validates the file before replacing the editor draft. Review the result and **Save configuration** to apply it to the world, or **Cancel** to discard it. Invalid JSON, malformed rules, duplicate group identifiers, multiple defaults, and unsupported export versions are rejected without altering the draft or saved settings. Only current grouped configurations and exports from this module ID are accepted.

Exports have a versioned envelope:

```json
{
  "Module": "quick-file-upload",
  "Version": 2,
  "Settings": {
    "Groups": [
      {
        "Identifier": "Images",
        "Rules": [
          { "Name": "Small PNG", "Regex": "/\\.png$/i", "Limit": 200, "Path": "uploads/small", "Default": false },
          { "Name": "Other files", "Regex": "", "Limit": 0, "Path": "uploads/other", "Default": true }
        ]
      }
    ],
    "Fallback": "uploads"
  }
}
```

This abbreviated example uses default values for omitted appearance settings. Actual exports include every setting. Exports contain configuration only, not server files.

## Folders, controls, and appearance

Paths are relative to Foundry's user-data directory. Use **Browse / create folder** beside a destination or fallback field, or enter paths manually. The picker opens the entered path; for an empty destination it uses the fallback currently entered in the editor, then the saved module fallback, then `assets`. Existing saved fallback settings remain unchanged. URI-encoded paths such as `assets/03%20Musik` are normalized to `assets/03 Musik` for selection, saving and upload. Missing directories are created during upload when permissions allow. Creating a folder in the picker takes effect immediately; cancelling the settings editor does not remove that folder.

Scene-control placement can be a main control or a submenu tool under a control ID such as `tokens`, `tiles`, or `notes`. Position `0` is first and `-1` is last; oversized indices append. If a parent ID is unavailable, the module adds a main control. Saving refreshes the controls. The main control opens the window; its tool reopens it while that control remains active.

Window sizes accept pixels (`720`) or viewport percentages (`75%`). Pad width/height and header height accept pixels or percentages of the application. Header width follows pad width. The group column retains at least 20% of the content width, and the header/toggle retain a minimum height of two font units. Pixel panel sizes scale down with a smaller window. Lists scroll when needed. Reopen the upload window after changing its initial dimensions. A blank pad name uses the translated default; a custom name is used as entered.

Only users granted Foundry's **Upload New Files** permission can use the upload window; only GMs can save world settings. Browsing and folder creation also require server permissions. Uploads use Foundry's `data` file source and follow its supported file types, size limits and existing-filename behavior. Directory trees, URL drops and S3 destinations are not supported.

Optional macro: `await game.modules.get("quick-file-upload").api.Upload()`. Open the editor with `.api.Settings()`.

## Development and validation

Version 1.5.0 adds **Choose for each upload** to each rule's built-in action menu. After a successful upload, a dialog identifies the file and offers None, Chat, Show image to players, Create journal image page, and Create journal text page. The chosen action uses the configured journal and recipient defaults and its normal file-type checks. Canceling skips the built-in action; macro ordering continues to work as configured. The choice is requested separately for each file.

Version 1.4.0 adds optional actions to each rule: a Macro UUID (with resolved name), an action, and a checkbox to run the macro before the action. Both execute after confirmed upload. Macros receive `file`, `path` (the server-confirmed file path), and `rule` (the action configuration) in their execution scope. The first matching rule supplies the actions; a selected group's default supplies them when no regex matches. The module fallback has no actions. An action failure leaves the upload marked successful and displays the action error alongside its saved path.

Built-in actions post images to chat, show images to selected players, or create image/text pages in an editable journal. Global defaults choose the journal UUID, optional journal chooser, and whether created pages are linked in chat or shown directly. Recipient defaults support all players, comma-separated user IDs, or Observer-or-higher ownership on the reference journal. Observer mode requires a reference journal; standalone images have no ownership of their own. An optional recipient chooser preselects these defaults. Canceling a chooser skips that built-in action; a configured subsequent macro still runs. Sharing uses the current user's normal Foundry permissions.

Focus the drop pad and press Ctrl+V to upload clipboard images, HTML, or text. The Clipboard setting enables pasting anywhere inside the upload application except editable controls. Clicking the pad still opens file browsing and also focuses it for pasting. Clipboard HTML becomes an `.html` file; plain text and Markdown become `.txt`. Text and Markdown journal pages preserve literal text; HTML imports preserve HTML through Foundry's journal handling. Clipboard content follows the same routing, uploads, and actions as local files.

The four zones now place the pad at top left, All groups at top right, paths at bottom left, and groups at bottom right. Fresh defaults use equal column widths and a 40% pad height. Existing size settings remain valid; the top row is capped at 80% so paths remain accessible.

Action API references: [ImagePopout](https://foundryvtt.com/api/classes/foundry.applications.apps.ImagePopout.html), [Journal sharing](https://foundryvtt.com/api/v14/classes/foundry.documents.collections.Journal.html), [DialogV2](https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html). In a live v14 world, verify macro execution permissions, clipboard behavior, journal creation, both chooser cancellations, and sharing with a second connected client.

Defaults for the module, groups, and rules are exported from `scripts/settings.js`. Routing, validation and JSON serialization are in `scripts/core.js`; configuration/help, uploads, and DOM helpers are separate modules. Ordinary variables use two or three words in camel case, functions use capitalized camel case, constants use the `QFU_` prefix, and module properties use a single capitalized word. Foundry and browser API names remain unchanged. Translations call `game.i18n.localize()` directly, with English reference comments; catalogues live in `lang/`.

With Node.js 24 or newer, run `npm ci`, `npm test`, and `npm run check`. Tests exercise routing order, defaults, size boundaries, JSON validation, settings persistence, menu callbacks that open and reopen the uploader, file-picker callbacks, and DOM interactions using jsdom. The settings regression test prohibits raw storage reads and returns decoded objects through `game.settings.get()`. Foundry APIs are mocked; these tests do not constitute live Foundry verification. The check command also verifies module naming conventions.

Live Foundry v14 checks:

- Create multiple groups with overlapping rules. Test all-group and selected-group modes, group/rule reordering, and both fallback paths.
- Test files below, exactly at, and one byte above a size limit; ensure regex matching precedes size handling.
- Check duplicate rule names, unique group identifiers, blank patterns, and changing/deleting the default rule.
- Verify folder-panel order, group tooltips, selection highlights, long lists, and resized panels.
- Export edits, import into a draft, cancel, then import/save/reload; ensure all values persist.
- Open help and switch Foundry between English and German.
- Browse/create folders; test batch failures and upload/folder-creation permissions.
- Verify main/submenu placement and position `-1`.

API references: [ApplicationV2](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html), [scene controls](https://foundryvtt.com/api/functions/hookEvents.getSceneControlButtons.html), [FilePicker](https://foundryvtt.com/api/classes/foundry.applications.apps.FilePicker.html), [world settings storage](https://foundryvtt.com/api/classes/foundry.documents.collections.WorldSettings.html).


## Version 1.10.0 upload controls

In Configure Settings > Quick File Upload > Window and appearance, set the clipboard button name and color, and the initial state of All groups (default: checked). These settings also participate in JSON export/import. Reopen the upload window to apply the initial checkbox state.

Click the pad text and press Ctrl+V, or use Clipboard import to read images or HTML/text. The browser may request clipboard permission; if access fails, the module focuses the pad and explains the Ctrl+V alternative. The cloud icon opens local file selection; the text below it remains outside the button. Drag and drop works across the whole pad, including the clipboard button, within its configured dimensions. Foundry file browser below Upload actions and clipboard defaults opens the native server file browser at the fallback folder; existing server files are not re-uploaded.

## Version 1.11.0 clipboard processing

See [Clipboard Import](../docs/clipboard-import.md) for the new menu, clipboard-only rule matching, format conversion, fallback precedence, preprocessing action and reusable naming API. The implementation is split into `clipboard.js` (image preparation), `name-builder.js` (portable naming and storage adapter) and `name-editor.js` (modal Foundry v14 UI). Clipboard source metadata is passed explicitly from paste/button handlers to the upload pipeline; the File object is never mutated.
