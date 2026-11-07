# Change 1.14.0 - 2026-11-07

## Original requirements from ToDO.md

# BUG

# Change

1) Füge dem Foundry File Browser vier buttons unter dem select button hinzu. "Show to players" und "Post to chat" und "Drop action" und "Group Action". Wenn ein File selected ist das vom typ png, jpg, webp ist (oder weitere Bildformate die Foundry erlaubt) und einer dieser beiden neuen Buttons aktiviert wird, dann wird das File an alle Spieler gesendet zur ansicht. Wenn der Button "Post to chat" aktiviert wird, dann wird das File an den Chat gesendet. Wenn group action ausgewählt wurde dann wird das File wie durch die aktuelle aktivierte Gruppenregel verarbeitet aber ohne das es erneut hochgeladen wird oder in ein anderes verzeichnis kopiert wird - aus sicht des moduls ist die datei hochgeladen worden und auch im richtigen verzeichnis (für die aktion muss allerdings der aktuell pfad genutzt werden).
Beim Button drop action wird der dialog angezeigt der alle actions aufführt und eine auswahl erlaubt.


## Implementation

- Added existing-file browser actions using Foundry v14?s renderFilePicker hook and ApplicationV2 markup.
- Group Action uses the current uploader selection, reads actual file size and runs the matching rule action/macro with the selected path, without server writes. Upload-time naming and conversion are skipped.
- Added translations, help and regression tests; updated release manifest to 1.14.0.
- Validation: all 90 tests, syntax/naming checks and git diff whitespace checks pass. Live Foundry interaction remains a manual verification step.

# Change 1.9.0 - 2026-10-25

- Implemented the BUG and Change entries from ToDO.md.
- Scene controls now support main (direct action without submenu), main-sub (own submenu with upload button), and sub (upload button under the configured parent).
- Direct main clicks bypass Foundry's active-control selection guard, allowing close and reopen without changing controls. Submenu buttons are not assigned as active tools.
- Group and rule clone buttons copy current unsaved fields, add the first available numeric suffix starting at 1, and insert immediately below the source. Group clones retain rules, defaults, colors and exclusion; individual rule clones clear Default to retain one default per group.
- Added English/German labels and help, settings validation and regression coverage. All 60 tests and syntax/naming checks pass. Live Foundry interaction remains a manual verification step.


# Change 1.8.0 — 2026-10-18

- Added separate light/dark alternating rule-row color pickers under Window and appearance.
- Kept the fixed light/dark base rows and existing gray defaults; group colors remain independent.
- Applied saved colors to open and future settings windows through inherited CSS variables, with hex validation and export/import support.

# Change 1.7.0 — 2026-10-17

- Rule rows now use opaque neutral alternating backgrounds for light/dark themes, independent of group colors.
- Added a distinct All players recipient mode alongside All players and GMs. Existing all-user settings retain their behavior.
- Dropdowns sort by displayed names in the current language. Explicit journal UUIDs lead in input order by default; a new action setting merges them into the fully alphabetized list.
- UUID lists accept commas as well as semicolons, remove duplicates in dropdowns, and preserve ownership restrictions.

# Change 1.6.0 — 2026-10-17

- Added alternating rule-row backgrounds and per-group color pickers, with optional colors on upload selectors and path sections.
- Added semicolon-separated Journal UUID and journal-name regex filters, combined with OR. Explicit UUIDs retain ownership checks. A separate draft list window resolves names automatically.
- Parent scene control uses a dropdown with core ID suggestions and free entry for custom IDs.
- Split configuration into regex groups/rules, scene controls, appearance, and upload actions/clipboard menus. Only regex and action buttons appear in the upload toggle panel, followed by All groups.
- Each editor saves only its own fields, preserving concurrent changes in other menus. JSON imports follow the same scope.
- All recipients now includes GMs. Recipient permissions can be selected during import, followed optionally by individual recipient selection.
- Added regression coverage for filters, settings isolation, colors, UUID drafts, and recipient mode choice.

# Change 1.5.0 — 2026-10-17

- Added "Choose for each upload" to rule actions. After storage, a localized dialog offers all existing concrete actions for that file.
- Canceling the chooser skips the built-in action and preserves configured macro ordering. The new option survives settings validation and JSON round trips.

# Change 1.4.0 — 2026-10-17

- Confirmed existing complete-group exclusion behavior; retained regression coverage.
- Added per-rule Macro UUID/name, built-in action, and macro ordering after confirmed upload.
- Added chat images, targeted image sharing, image/text/Markdown/HTML journal pages, destination and recipient defaults and optional choosers.
- Added focused-pad clipboard paste and optional application-wide paste, preserving native input editing.
- Moved pad/toggle above paths/groups; added action and clipboard regression tests and English/German labels.
- Existing settings receive new defaults on read. Action failures retain the successful saved-file result.

# Bug 1.2.1

1) On each selection of the directory picker I get this error message, Use assets as standard directory to access. Best would be to use the configured module default path

foundry.mjs:145485 Error: Directory data does not exist or is not accessible in this storage location
    at n.<anonymous> (foundry.mjs:33196:43)
    at o.onack (socket.js:578:13)
    at o.onpacket (socket.js:497:22)
    at I.emit (index.js:136:20)
    at manager.js:209:18
#fetch	@	foundry.mjs:145485
notify	@	foundry.mjs:145344
warn	@	foundry.mjs:145371
(anonymous)	@	foundry.mjs:33461
Promise.catch
browse	@	foundry.mjs:33460
PickDirectory	@	configuration.js:77
(anonymous)	@	configuration.js:88

2) Datenpfade mit spaces in den Namen werden nicht korrekt aufgelöst.
Beispiel:
Der Datenpfad ist: assets/03 Musik
Foundry codiert den Pfad als: assets/03%20Musik

Dies ist das standard URI format soweit ich weiß. Dieser Pfad  wird abgelehnt vom Modul

# Change 1.2.1

1) Add an additional helper modal in the settings which holds a description of the settings and what they do. Style the help information in a way that it is easy to read and structured. This might mean to add details tags to be able to open and close blocks of information which belong together

2) Add a json export for all settings informations and a json import function for the settings.

3) Change the order of handling regex and size information again. First the regex should be checked and then the size information

4) Reorder the logic and the settings structure in the following way:
- the identifier can now be used for several regex rules. The identifier now is a unique identifier for a regex rule group. If selected in the application only that regex group will be used.
- identifierts can be set into an ordering of how they are checked.
- regex in an identiefier group can be likewise still ordered.
- the identifier groups will be checked in order of appearance from top to bottom. Likewise the regex groups in them will be checked from top to bottom in the order they are put.
- each regex rule will get a name (name of the rule)
- identifiers must be unique but names need not to be unique. Only identifiers will be shown as selectable  items in the application
- In the Folder panel all names of the regex rules including their folder destinations will be listed in the order the regex rules have been placed
- Each regex rule will have an additional parameter which can be set which defines if it is the default for that group. Any files not matched while a group is executed will be saved into that default folder. If no default folder is defined then the default folder of the module will be used.
- The regex checkbox in the toggle panel will now trigger that all regex from all groups will be checked. Group by group as the order has been defined and the regex rules within that group once a group is checked.


# Start Specs

I need a module for Foundry VTT v14. It should use the Application v2 framework.
The goal is a module that allows to start an app/window which offers a download pad/area where local files can be dragged and dropped uppon.
The application will recognize this and then those files will be uploaded to the server and saved in specific directory on the server.

If you have questions or need answers to determine the correct course of the implementation then ask.

There will be two options to upload files or define the path on  the server where the files will be stored:
1) A regex will investigate the filename and store a match in a folder which was mapped to this regex
2) A list of defined namesIdentifiers for folders (like "images", "sounds", "documents") with a corresponding path on the server will be used. This list can be scrolled and an entry selected. This entry will be highlighted and an addition information about the path and Name/Identiefier of this selection will be displayed above the drop pad.
If an identifier is hovered over in the list it will display the path which is mapped to this identifier as a tooltip

The settings will allow to enter the following values:
- Identiefier (like image, sound, document)
- Regex
- destination path

The settings will have a modal which allows to enter these values and create entries for a list of a potentially undeterminded long list of entries. The modal should be able to add, edit and delete entries from this list.

There is also a fallback mechanism: If no regex matches, then there is a default folder where all files will be stored. This default can be specified.

3) The module should also provide a button in the left menu bar to open this modal.

The settings should allow to do the following in determining the button placement for the menue:
- define if the button is placed as a main button - meaning it will be displayed as a menue button along the other main buttons (maybe thats directly root)
- define if the button is placed as a sub menu button - meaning it will be displayed as a submenu button under a specific menu item
- define on which place in the menue it belongs to it will be displayed

4) The drop pad for the files will also work if more than one local file is dropped on it. Then each file will be processed separatly.

5) There is a toggle button above the drop pad which turns regex on and off. If regex is turned off, then all files will be stored in the folder whose tag/identiefier was selected.
If the toggle is turned on, then the regex will be parsed in the order they have been input in the settings.
If a file matches a regex, it will be stored in the folder of that regex.

6) Layout:
P: drop pad
I: Identifier (tag)
R: Regex (optional)
F: Folder (optional)
T: Toggle
| : seperator vertikal
- :separator horizontal

General Layout idea:

F F F F | T
- - - - - -
P P P P | I
P P P P | I
P P P P | I

7) Additional settings
There will be settings to define with and hight of the application. An entry in percent 75% will mean 75 percent of the available window hight or width depending what setting it was defined for otherweise a number entry will mean in pixel.

The drop pad size can be defined likewise. A percentage here will mean percent in pixels of the application size, a number means pixel.
The drop header size can be defined likewise. A percentage here will mean percent in pixels of the application size, a number means pixel.
The Toggle and Identifier size will be the remaining space filling the application up to its defined size. The toggle will be as high as the Folder definition.

The minimum size width of the Identifier space will be 20 percent width of the application. If the application is resized below the necessary size (like the pixel definition width) then the relations between the four field take over.

The minimum hight of the Toggle is 2 em (two times the font heigh) the same applies to the Folder display.

8) The color of the drop pad can be set in the settings. And also how it is named. The name should be shown in the drop pad. Feel free to design it visually appealing.
