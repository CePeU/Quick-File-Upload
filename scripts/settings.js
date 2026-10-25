// Keep the registry namespace aligned with module.json.
export const QFU_MODULE_ID = "quick-file-upload";
export const QFU_SETTINGS_KEY = "groupSettings";
export const QFU_SCHEMA_VERSION = 2;

// All persisted module settings and their defaults live in this object.
export const QFU_SETTINGS = Object.freeze({
  Groups: [], Fallback: "assets", Placement: "main", Parent: "tokens", Order: 0,
  Width: "720", Height: "520", Padwidth: "50%", Padheight: "40%",
  Headerheight: "15%", Color: "#24586b", Rulelight: "#e0e0e0", Ruledark: "#383838", Label: "", Clipboard: false,
  Journal: "", Journalprompt: true, Journaluuids: "", Journalpattern: "", Journalsort: false, Display: "none", Audience: "all", Users: "", Audienceprompt: false
});

// Nested settings defaults are shared by the editor and validation code.
export const QFU_GROUP_SETTINGS = Object.freeze({ Identifier: "", Excluded: false, Color: "#424a55", Overview: false, Rules: [] });
export const QFU_RULE_SETTINGS = Object.freeze({ Name: "", Regex: "", Limit: 0, Path: "", Default: false });

// Optional per-rule action settings preserve compatibility with existing exports.
export const QFU_ACTION_SETTINGS = Object.freeze({ Macro: "", Before: false, Function: "none" });

// Each settings application edits only its own fields, preserving other menus.
export const QFU_MENU_FIELDS = Object.freeze({
  Groups: ["Groups", "Fallback"],
  Controls: ["Placement", "Parent", "Order"],
  Layout: ["Width", "Height", "Padwidth", "Padheight", "Headerheight", "Color", "Rulelight", "Ruledark", "Label"],
  Actions: ["Clipboard", "Journal", "Journalprompt", "Journaluuids", "Journalpattern", "Journalsort", "Users", "Audienceprompt", "Display", "Audience"]
});
