import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { JSDOM } from "jsdom";
import { QFU_MODULE_ID, QFU_SETTINGS_KEY, QFU_SETTINGS } from "../scripts/settings.js";
import { CreateSettings, LocalizeText, QFU_ENGLISH } from "../testing/fixtures.js";
import { SerializeSettings } from "../scripts/core.js";

let browserWindow = new JSDOM("<!doctype html><body></body>").window;
globalThis.window = browserWindow;
globalThis.document = browserWindow.document;
globalThis.Event = browserWindow.Event;
globalThis.getComputedStyle = browserWindow.getComputedStyle;
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
let hookHandlers = new Map(), registeredSettings = new Map(), registeredMenus = new Map();
let moduleRecord = {}, worldValues = new Map(), writtenSettings = [], notificationMessages = [];
let currentSettings = CreateSettings(), uploadAllowed = true, controlRefresh;

// This adapter exercises real DOM rendering while mocking only Foundry's frame
// lifecycle. It intentionally does not claim to emulate Foundry's full runtime.
class ApplicationV2 {
  constructor(applicationOptions = {}) { this.options = applicationOptions; this.rendered = false; this.element = null; }
  async render(renderOptions = {}) {
    if (this.element === null) { this.element = document.createElement("section"); document.body.append(this.element); }
    this.rendered = true;
    this.Last = renderOptions;
    let renderedContent = await this._renderHTML();
    this._replaceHTML(renderedContent, this.element);
    this._onRender({}, renderOptions);
    return this;
  }
  _onRender() {}
  bringToFront() { this.Front = true; }
  async close() { this.element?.remove(); this.element = null; this.rendered = false; return this; }
}
globalThis.foundry = { applications: { api: { ApplicationV2 }, apps: {} } };
globalThis.Hooks = { once: (hookName, hookHandler) => hookHandlers.set(hookName, hookHandler), on: (hookName, hookHandler) => hookHandlers.set(hookName, hookHandler) };
globalThis.game = {
  i18n: { localize: LocalizeText }, user: { isGM: true, can: () => uploadAllowed },
  modules: { get: moduleName => { assert.equal(moduleName, QFU_MODULE_ID); return moduleRecord; } },
  settings: {
    // The reported Foundry runtime returns objects here. Startup must never
    // depend on serializing/parsing this lower-level storage interface.
    storage: new Map([["world", { getItem: () => currentSettings }]]),
    get: (moduleName, settingName) => { assert.equal(moduleName, QFU_MODULE_ID); assert.equal(settingName, QFU_SETTINGS_KEY); return currentSettings; },
    set: async (moduleName, settingName, settingValue) => {
      assert.equal(moduleName, QFU_MODULE_ID);
      writtenSettings.push(structuredClone(settingValue)); currentSettings = settingValue;
      worldValues.set(`${moduleName}.${settingName}`, JSON.stringify(settingValue));
    },
    register: (moduleName, settingName, settingOptions) => { assert.equal(moduleName, QFU_MODULE_ID); registeredSettings.set(settingName, settingOptions); },
    registerMenu: (moduleName, settingName, settingOptions) => { assert.equal(moduleName, QFU_MODULE_ID); registeredMenus.set(settingName, settingOptions); }
  }
};
globalThis.ui = {
  controls: { render: renderOptions => { controlRefresh = renderOptions; } },
  notifications: { warn: messageText => notificationMessages.push(messageText), error: messageText => notificationMessages.push(messageText), info: messageText => notificationMessages.push(messageText) }
};
let { OpenUpload } = await import("../scripts/main.js");
let { UploadApplication } = await import("../scripts/upload.js");
let { ConfigurationApplication, HelpApplication, ControlsApplication, LayoutApplication, ActionsApplication, ClipboardApplication, JournalListApplication } = await import("../scripts/configuration.js");
let { ReadSettings } = await import("../scripts/storage.js");
let { LoadHelpContent, QFU_HELP_STATE } = await import("../scripts/help.js");

async function FetchHelpFixture(requestPath) {
  try {
    let languageFile = requestPath.split("/").at(-1);
    return { ok: true, json: async () => JSON.parse(readFileSync(new URL(`../help/${languageFile}`, import.meta.url), "utf8")) };
  } catch { return { ok: false }; }
}


beforeEach(() => {
  globalThis.fetch = FetchHelpFixture;
  game.i18n.lang = "en";
  currentSettings = CreateSettings();
  worldValues.clear(); writtenSettings.length = 0; notificationMessages.length = 0;
  uploadAllowed = true; game.user.isGM = true;
  document.body.replaceChildren();
});

test("new action controls persist and macro names resolve", async () => {
  globalThis.fromUuid = async () => ({ documentName: "Macro", name: "Upload macro" });
  let settingsWindow = new ConfigurationApplication();
  await settingsWindow.render();
  let ruleRow = settingsWindow.Form.querySelector(".qu-rule");
  let macroInput = ruleRow.querySelector('[name="Macro"]');
  macroInput.value = "Macro.test";
  macroInput.dispatchEvent(new Event("change", { bubbles: true }));
  await Promise.resolve();
  assert.equal(ruleRow.querySelector(".qu-macro-name").textContent, "Upload macro");
  assert.equal(ruleRow.querySelector('[name="Function"] option[value="choose"]').textContent, "Choose for each upload");
  ruleRow.querySelector('[name="Function"]').value = "choose";
  ruleRow.querySelector('[name="Before"]').checked = true;
  let settings = settingsWindow.ReadDraft();
  assert.deepEqual(settings.Groups[0].Rules[0].Action, { Macro: "Macro.test", Before: true, Function: "choose" });
  assert.deepEqual(JSON.parse(SerializeSettings(settings)).Settings.Groups[0].Rules[0].Action, settings.Groups[0].Rules[0].Action);
});

test("clipboard paste routes HTML, literal Markdown and images with focus restrictions", async () => {
  globalThis.File = browserWindow.File;
  let uploadWindow = new UploadApplication();
  await uploadWindow.render();
  let batches = [];
  uploadWindow.UploadFiles = files => batches.push(files);
  function PasteEvent(target, html, text, files = []) {
    let pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", { value: { files, getData: type => type === "text/html" ? html : text } });
    target.dispatchEvent(pasteEvent);
    return pasteEvent;
  }
  let pad = uploadWindow.element.querySelector(".qu-pad");
  assert.equal(PasteEvent(pad, "<b>Hello</b>", "Hello").defaultPrevented, true);
  assert.equal(batches[0][0].type, "text/html");
  PasteEvent(pad, "", "# Heading");
  assert.equal(batches[1][0].type, "text/plain");
  let image = new File(["image"], "clipboard.png", { type: "image/png" });
  PasteEvent(pad, "", "", [image]);
  assert.equal(batches[2][0], image);
  PasteEvent(uploadWindow.element.querySelector(".qu-toggle"), "", "ignored");
  assert.equal(batches.length, 3);
  currentSettings.Clipboard = true;
  await uploadWindow.render();
  PasteEvent(uploadWindow.element.querySelector(".qu-toggle"), "", "included");
  assert.equal(batches.length, 4);
  PasteEvent(uploadWindow.element.querySelector("input"), "", "native");
  assert.equal(batches.length, 4);
});

test("manifest namespace, ApplicationV2 settings, help menu and API agree", async () => {
  let moduleManifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
  assert.equal(moduleManifest.id, QFU_MODULE_ID);
  await hookHandlers.get("init")();
  await hookHandlers.get("i18nInit")();
  assert.equal(registeredSettings.get(QFU_SETTINGS_KEY).scope, "world");
  assert.equal(registeredMenus.get("configure").type, ConfigurationApplication);
  assert.equal(registeredMenus.get("configure").restricted, true);
  assert.equal(registeredMenus.get("controls").type, ControlsApplication);
  assert.equal(registeredMenus.get("layout").type, LayoutApplication);
  assert.equal(registeredMenus.get("actions").type, ActionsApplication);
  assert.equal(registeredMenus.get("clipboard").type, ClipboardApplication);
  assert.equal(registeredMenus.get("help").type, HelpApplication);
  assert.equal(moduleRecord.api.Upload, OpenUpload);
  assert.deepEqual(Object.keys(moduleRecord.api), ["Upload", "Settings"]);
  registeredSettings.get(QFU_SETTINGS_KEY).onChange();
  assert.deepEqual(controlRefresh, { force: true, reset: true });
});

test("separate menus show only their fields and preserve concurrent settings", async () => {
  let groupsWindow = await new ConfigurationApplication().render();
  let actionsWindow = await new ActionsApplication().render();
  let controlsWindow = await new ControlsApplication().render();
  let layoutWindow = await new LayoutApplication().render();
  assert.equal(groupsWindow.Form.elements.namedItem("Clipboard"), null);
  assert.equal(actionsWindow.Form.querySelector(".qu-groups"), null);
  assert.equal(controlsWindow.Form.elements.namedItem("Color"), null);
  assert.equal(layoutWindow.Form.elements.namedItem("Parent"), null);
  let parentInput = controlsWindow.Form.elements.namedItem("Parent");
  assert.equal(controlsWindow.Form.querySelector('datalist option[value="tokens"]').value, "tokens");
  parentInput.value = "custom-control";
  await controlsWindow.SaveDraft();
  actionsWindow.Form.elements.namedItem("Clipboard").checked = true;
  await actionsWindow.SaveDraft();
  layoutWindow.Form.elements.namedItem("Color").value = "#112233";
  await layoutWindow.SaveDraft();
  groupsWindow.Form.elements.namedItem("Fallback").value = "new-folder";
  await groupsWindow.SaveDraft();
  assert.equal(currentSettings.Parent, "custom-control");
  assert.equal(currentSettings.Color, "#112233");
  assert.equal(currentSettings.Clipboard, true);
  assert.equal(currentSettings.Fallback, "new-folder");
});

test("theme rule color pickers save, export and update already open editors", async () => {
  await hookHandlers.get("init")();
  await hookHandlers.get("i18nInit")();
  let groupsWindow = await new ConfigurationApplication().render();
  let layoutWindow = await new LayoutApplication().render();
  for (let fieldName of ["Rulelight", "Ruledark"]) {
    assert.equal(layoutWindow.Form.elements.namedItem(fieldName).type, "color");
    assert.equal(groupsWindow.Form.elements.namedItem(fieldName), null);
  }
  layoutWindow.Form.elements.namedItem("Rulelight").value = "#abcdef";
  layoutWindow.Form.elements.namedItem("Ruledark").value = "#123456";
  await layoutWindow.SaveDraft();
  assert.equal(currentSettings.Rulelight, "#abcdef");
  assert.equal(currentSettings.Ruledark, "#123456");
  let exportedSettings = JSON.parse(SerializeSettings(currentSettings)).Settings;
  assert.equal(exportedSettings.Rulelight, "#abcdef");
  assert.equal(exportedSettings.Ruledark, "#123456");
  registeredSettings.get(QFU_SETTINGS_KEY).onChange();
  assert.equal(document.documentElement.style.getPropertyValue("--qu-rule-light"), "#abcdef");
  assert.equal(document.documentElement.style.getPropertyValue("--qu-rule-dark"), "#123456");
  // An older groups draft must not reset separately saved appearance settings.
  await groupsWindow.SaveDraft();
  assert.equal(currentSettings.Rulelight, "#abcdef");
  assert.equal(currentSettings.Ruledark, "#123456");
});

test("setup dropdowns sort visible labels in English and German while preserving selections", async () => {
  let germanText = JSON.parse(readFileSync(new URL("../lang/de.json", import.meta.url), "utf8")).QFU;
  let originalLocalize = game.i18n.localize;
  try {
    for (let language of ["en", "de"]) {
      game.i18n.lang = language;
      game.i18n.localize = key => {
        if (language === "de") return germanText[key.replace(/^QFU\./, "")];
        return LocalizeText(key);
      };
      currentSettings.Audience = "playersonly";
      currentSettings.Journalsort = true;
      for (let EditorClass of [ConfigurationApplication, ControlsApplication, ActionsApplication]) {
        let settingsWindow = await new EditorClass().render();
        for (let selectInput of settingsWindow.Form.querySelectorAll("select, datalist")) {
          let labels = Array.from(selectInput.querySelectorAll("option"), option => option.textContent);
          assert.deepEqual(labels, [...labels].sort((first, second) => first.localeCompare(second, language, { sensitivity: "base" })));
        }
        if (settingsWindow.Menu === "Actions") {
          assert.equal(settingsWindow.ReadDraft().Audience, "playersonly");
          assert.equal(settingsWindow.ReadDraft().Journalsort, true);
        }
        await settingsWindow.close();
      }
    }
  } finally {
    game.i18n.localize = originalLocalize;
    delete game.i18n.lang;
  }
});

test("group colors persist through save and export and optionally color the overview", async () => {
  let groupsWindow = await new ConfigurationApplication().render();
  let groupBlock = groupsWindow.Form.querySelector(".qu-group");
  let colorInput = groupBlock.querySelector('[name="Groupcolor"]');
  colorInput.value = "#123456";
  colorInput.dispatchEvent(new Event("input", { bubbles: true }));
  groupBlock.querySelector('[name="Overview"]').checked = true;
  await groupsWindow.SaveDraft();
  assert.equal(currentSettings.Groups[0].Color, "#123456");
  assert.equal(JSON.parse(SerializeSettings(currentSettings)).Settings.Groups[0].Overview, true);
  let uploadWindow = await new UploadApplication().render();
  assert.equal(uploadWindow.element.querySelector('[data-identifier="Images"]').style.getPropertyValue("--qu-group-color"), "#123456");
  assert.equal(uploadWindow.element.querySelector(".qu-overview-group").style.getPropertyValue("--qu-group-color"), "#123456");
  let togglePanel = uploadWindow.element.querySelector(".qu-toggle");
  assert.deepEqual(Array.from(togglePanel.children, entry => entry.tagName), ["BUTTON", "BUTTON", "BUTTON", "LABEL"]);
  assert.equal(uploadWindow.element.querySelector(".qu-sidebar .qu-config"), null);
  currentSettings.Groups[0].Overview = false;
  await uploadWindow.render();
  assert.equal(uploadWindow.element.querySelector('[data-identifier="Images"]').style.getPropertyValue("--qu-group-color"), "");
});

test("journal UUID editor resolves names as text and supports semicolon lists", async () => {
  globalThis.fromUuid = async uuid => ({ documentName: "JournalEntry", name: `<${uuid}>` });
  let actionsWindow = await new ActionsApplication().render();
  let uuidInput = actionsWindow.Form.elements.namedItem("Journaluuids");
  uuidInput.value = "JournalEntry.one; JournalEntry.two;JournalEntry.one";
  uuidInput.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  let journalList = actionsWindow.Form.querySelector(".qu-journal-list");
  assert.equal(journalList.children.length, 2);
  assert.match(journalList.textContent, /<JournalEntry.one>/);
  assert.equal(journalList.querySelector("JournalEntry"), null);
  actionsWindow.Form.elements.namedItem("Audience").value = "choose";
  await actionsWindow.SaveDraft();
  assert.equal(currentSettings.Audience, "choose");
  assert.equal(currentSettings.Journaluuids, uuidInput.value);
});

test("separate journal list applies only to the parent draft and cancels safely", async () => {
  globalThis.fromUuid = async uuid => ({ documentName: "JournalEntry", name: `Name: ${uuid}` });
  let actionsWindow = await new ActionsApplication().render();
  let targetInput = actionsWindow.Form.elements.namedItem("Journaluuids");
  targetInput.value = "JournalEntry.one";
  let journalWindow = await new JournalListApplication(targetInput).render();
  let journalList = journalWindow.element.querySelector(".qu-settings-scroll");
  journalWindow.AddJournalRow(journalList, "JournalEntry.two");
  await Promise.resolve();
  assert.match(journalList.textContent, /Name: JournalEntry.two/);
  journalWindow.element.querySelectorAll(".qu-settings-form > button")[1].click();
  assert.equal(targetInput.value, "JournalEntry.one;JournalEntry.two");
  assert.equal(writtenSettings.length, 0);
  journalWindow = await new JournalListApplication(targetInput).render();
  journalWindow.element.querySelector("input").value = "JournalEntry.changed";
  await journalWindow.close();
  assert.equal(targetInput.value, "JournalEntry.one;JournalEntry.two");
  journalWindow = await new JournalListApplication(targetInput).render();
  await actionsWindow.close();
  journalWindow.element.querySelectorAll(".qu-settings-form > button")[1].click();
  assert.equal(writtenSettings.length, 0);
});

test("settings reads use decoded objects from the public API and never raw storage", () => {
  let originalStorage = game.settings.storage;
  Object.defineProperty(game.settings, "storage", { configurable: true, get() { throw Error("Raw storage must not be accessed"); } });
  try {
    let copiedSettings = ReadSettings();
    assert.deepEqual(copiedSettings, currentSettings);
    copiedSettings.Groups[0].Identifier = "Changed copy";
    assert.equal(currentSettings.Groups[0].Identifier, "Images");
    assert.equal(writtenSettings.length, 0);
  } finally { Object.defineProperty(game.settings, "storage", { configurable: true, writable: true, value: originalStorage }); }
});

test("scene controls support both placements, -1, missing parents, and permissions", async () => {
  let BuildControls = () => {
    let controlRecord = { tokens: { order: 0, tools: { select: { order: 0 } } }, tiles: { order: 1, tools: {} } };
    hookHandlers.get("getSceneControlButtons")(controlRecord);
    return controlRecord;
  };
  currentSettings.Order = -1;
  assert.equal(BuildControls()[QFU_MODULE_ID].order, 2);
  currentSettings.Placement = "sub";
  assert.equal(BuildControls().tokens.tools[QFU_MODULE_ID].order, 1);
  assert.equal(BuildControls()[QFU_MODULE_ID], undefined);
  currentSettings.Parent = "missing";
  assert.ok(BuildControls()[QFU_MODULE_ID]);
  uploadAllowed = false;
  assert.equal(BuildControls()[QFU_MODULE_ID], undefined);
  assert.equal(await OpenUpload(), undefined);
});

test("registered main and submenu callbacks actually open, focus, close and reopen the uploader", async () => {
  currentSettings = structuredClone(QFU_SETTINGS);
  let controlRecord = { tokens: { order: 0, tools: {} } };
  hookHandlers.get("getSceneControlButtons")(controlRecord);
  let mainControl = controlRecord[QFU_MODULE_ID];
  assert.ok(mainControl);
  let uploadApp = await mainControl.onChange(new Event("click"), true);
  assert.equal(uploadApp.rendered, true);
  assert.ok(uploadApp.element.querySelector(".qu-drop"));
  assert.deepEqual(mainControl.tools, {});
  assert.equal(await mainControl.onChange(new Event("click"), true), uploadApp);
  assert.equal(uploadApp.Front, true);
  await uploadApp.close();
  assert.equal(mainControl.onChange(new Event("click"), false), undefined);
  assert.equal(uploadApp.rendered, false);
  currentSettings.Placement = "sub";
  controlRecord = { tokens: { order: 0, tools: {} } };
  hookHandlers.get("getSceneControlButtons")(controlRecord);
  let reopenedApp = await controlRecord.tokens.tools[QFU_MODULE_ID].onChange(new Event("click"));
  assert.equal(reopenedApp.rendered, true);
  await reopenedApp.close();
  let registeredWindow = await new (registeredMenus.get("configure").type)().render({ force: true });
  assert.ok(registeredWindow.Form.querySelector(".qu-groups"));
  await registeredWindow.close();
});

test("editor renders groups and rules, reorders both levels and saves visible order", async () => {
  let settingsWindow = await new ConfigurationApplication().render();
  let groupList = settingsWindow.Form.querySelector(".qu-groups");
  assert.equal(groupList.children.length, 2);
  assert.equal(groupList.children[0].querySelectorAll(".qu-rule").length, 3);
  // Move Sounds before Images using the actual UI action.
  groupList.children[1].querySelector(".qu-group-header .qu-row-actions button").click();
  assert.equal(settingsWindow.ReadDraft().Groups[0].Identifier, "Sounds");
  let imageRules = groupList.children[1].querySelector(".qu-rules");
  imageRules.children[1].querySelector(".qu-row-actions button").click();
  assert.equal(settingsWindow.ReadDraft().Groups[1].Rules[0].Path, "uploads/large");
  imageRules.children[0].querySelector('[name="Default"]').click();
  assert.equal(imageRules.querySelectorAll('[name="Default"]:checked').length, 1);
  await settingsWindow.SaveDraft();
  assert.equal(writtenSettings[0].Groups[0].Identifier, "Sounds");
  assert.equal(writtenSettings[0].Groups[1].Rules[0].Default, true);
});

test("editor adds/deletes groups and rules and supports repeated rule names", async () => {
  let settingsWindow = await new ConfigurationApplication().render();
  let groupList = settingsWindow.Form.querySelector(".qu-groups");
  let newGroup = settingsWindow.AddGroup(groupList, { Identifier: "Documents", Rules: [] });
  let ruleList = newGroup.querySelector(".qu-rules");
  settingsWindow.AddRule(ruleList, { Name: "PDF", Regex: "pdf$", Limit: 0, Path: "uploads/pdf", Default: false });
  settingsWindow.AddRule(ruleList, { Name: "PDF", Regex: "", Limit: 0, Path: "uploads/docs", Default: true });
  assert.equal(settingsWindow.ReadDraft().Groups[2].Rules.length, 2);
  ruleList.children[0].querySelector(".qu-row-actions button:last-child").click();
  assert.equal(settingsWindow.ReadDraft().Groups[2].Rules.length, 1);
  newGroup.querySelector(".qu-group-header .qu-row-actions button:last-child").click();
  assert.equal(settingsWindow.ReadDraft().Groups.length, 2);
});

test("import stages settings and saves only the current menu; invalid import leaves edits intact", async () => {
  let settingsWindow = await new ConfigurationApplication().render();
  settingsWindow.Form.elements.namedItem("Fallback").value = "unsaved-folder";
  await assert.rejects(settingsWindow.ImportSettings("{broken"));
  assert.equal(settingsWindow.Form.elements.namedItem("Fallback").value, "unsaved-folder");
  let importedSettings = CreateSettings();
  importedSettings.Color = "#112233";
  importedSettings.Groups.reverse();
  await settingsWindow.ImportSettings(SerializeSettings(importedSettings));
  assert.equal(writtenSettings.length, 0);
  assert.equal(settingsWindow.ReadDraft().Color, "#112233");
  assert.equal(settingsWindow.ReadDraft().Groups[0].Identifier, "Sounds");
  await settingsWindow.close();
  assert.equal(writtenSettings.length, 0);
  let reopenedWindow = await new ConfigurationApplication().render();
  assert.equal(reopenedWindow.ReadDraft().Color, QFU_SETTINGS.Color);
  await reopenedWindow.ImportSettings(SerializeSettings(importedSettings));
  await reopenedWindow.SaveDraft();
  assert.deepEqual(writtenSettings[0].Groups, importedSettings.Groups);
  assert.equal(writtenSettings[0].Color, QFU_SETTINGS.Color);
});

test("export downloads the current validated draft and creates no settings writes", async () => {
  let settingsWindow = await new LayoutApplication().render();
  settingsWindow.Form.elements.namedItem("Label").value = "Export this draft";
  let exportBlob, downloadName;
  let originalCreate = URL.createObjectURL;
  let originalClick = browserWindow.HTMLAnchorElement.prototype.click;
  URL.createObjectURL = blobValue => { exportBlob = blobValue; return "blob:test"; };
  browserWindow.HTMLAnchorElement.prototype.click = function () { downloadName = this.download; };
  try { settingsWindow.ExportSettings(); }
  finally { URL.createObjectURL = originalCreate; browserWindow.HTMLAnchorElement.prototype.click = originalClick; }
  assert.equal(downloadName, "quick-file-upload-settings.json");
  assert.equal(JSON.parse(await exportBlob.text()).Settings.Label, "Export this draft");
  assert.equal(writtenSettings.length, 0);
});

test("non-GM settings save is rejected without writes", async () => {
  let settingsWindow = await new ConfigurationApplication().render();
  game.user.isGM = false;
  await assert.rejects(settingsWindow.SaveDraft(), /Only a GM/);
  assert.equal(writtenSettings.length, 0);
});

test("folder picker keeps manual edits and rejects other file sources", async () => {
  let pickerInstance;
  foundry.applications.apps.FilePicker = { implementation: class {
    constructor(pickerOptions) { this.Options = pickerOptions; this.activeSource = pickerOptions.activeSource; pickerInstance = this; }
    async browse(targetPath, browseOptions = {}) {
      assert.equal(typeof browseOptions, "object");
      this.Browsed = targetPath;
    }
  } };
  let settingsWindow = await new ConfigurationApplication().render();
  let pathInput = settingsWindow.Form.querySelector('[name="Path"]');
  pathInput.value = "uploads/manual";
  await settingsWindow.PickDirectory(pathInput);
  assert.equal(pickerInstance.Browsed, "uploads/manual");
  assert.equal(pickerInstance.Options.activeSource, "data");
  assert.equal(pickerInstance.Options.type, "folder");
  pickerInstance.Options.callback("uploads/new-folder");
  assert.equal(pathInput.value, "uploads/new-folder");
  pickerInstance.Options.callback("assets/03%20Musik");
  assert.equal(pathInput.value, "assets/03 Musik");
  await settingsWindow.PickDirectory(pathInput);
  assert.equal(pickerInstance.Browsed, "assets/03 Musik");
  pickerInstance.activeSource = "s3";
  pickerInstance.Options.callback("remote/folder");
  assert.equal(pathInput.value, "assets/03 Musik");
  pickerInstance.activeSource = "data";
  pickerInstance.Options.callback("../secret");
  assert.equal(pathInput.value, "assets/03 Musik");
});

test("empty picker targets use draft fallback, saved fallback, then assets", async () => {
  let pickerInstance;
  foundry.applications.apps.FilePicker = { implementation: class {
    constructor(pickerOptions) { this.Options = pickerOptions; pickerInstance = this; }
    async browse(targetPath) { this.Browsed = targetPath; }
  } };
  let settingsWindow = await new ConfigurationApplication().render();
  let pathInput = settingsWindow.Form.querySelector('[name="Path"]');
  pathInput.value = "";
  let fallbackInput = settingsWindow.Form.elements.namedItem("Fallback");
  fallbackInput.value = "assets/Meine%20Musik";
  await settingsWindow.PickDirectory(pathInput);
  assert.equal(pickerInstance.Browsed, "assets/Meine Musik");
  assert.equal(pickerInstance.Options.current, "assets/Meine Musik");
  fallbackInput.value = "";
  await settingsWindow.PickDirectory(pathInput);
  assert.equal(pickerInstance.Browsed, currentSettings.Fallback);
  currentSettings.Fallback = "";
  await settingsWindow.PickDirectory(fallbackInput);
  assert.equal(pickerInstance.Browsed, "assets");
  assert.equal(pathInput.value, "");
});

test("upload window shows only group selectors and every active named rule/path", async () => {
  let uploadApp = await new UploadApplication().render();
  let selectorsList = uploadApp.element.querySelectorAll("[data-identifier]");
  assert.deepEqual(Array.from(selectorsList, buttonElement => buttonElement.textContent), ["Images", "Sounds"]);
  assert.equal(uploadApp.element.querySelectorAll(".qu-folder-rules li").length, 5);
  assert.match(uploadApp.element.querySelector(".qu-folder").textContent, /Small images → uploads\/small/);
  let toggleInput = uploadApp.element.querySelector('.qu-toggle input');
  toggleInput.click();
  selectorsList[1].click();
  assert.equal(uploadApp.All, false);
  assert.equal(uploadApp.Selected, "Sounds");
  assert.equal(uploadApp.element.querySelectorAll(".qu-folder-rules li").length, 2);
  assert.match(uploadApp.element.querySelector(".qu-folder").textContent, /Fallback: uploads\/sound-default/);
  assert.equal(selectorsList[1].getAttribute("aria-pressed"), "true");
});

test("user-controlled names are rendered as text rather than HTML", async () => {
  currentSettings.Groups[0].Identifier = '<img src=x onerror="bad()">';
  currentSettings.Groups[0].Rules[0].Name = "<script>bad()</script>";
  let uploadApp = await new UploadApplication().render();
  assert.equal(uploadApp.element.querySelectorAll("img, script").length, 0);
  assert.match(uploadApp.element.textContent, /<script>bad\(\)<\/script>/);
});

test("help renders structured expandable topics and the agreed fallback behavior", async () => {
  let helpWindow = await new HelpApplication().render();
  assert.equal(helpWindow.element.querySelectorAll("details").length, 11);
  assert.equal(helpWindow.element.querySelector("details").open, true);
  assert.match(helpWindow.element.textContent, /group defaults are ignored/);
  assert.match(helpWindow.element.textContent, /1,024 bytes/);
});

test("language JSON determines help contents, including fresh changes and working regex examples", async () => {
  game.i18n.lang = "de-DE";
  let helpWindow = await new HelpApplication().render();
  assert.match(helpWindow.element.textContent, /Manuell benamen/);
  assert.match(helpWindow.element.textContent, /Alle Dateinamen: \.\*/);
  assert.match(helpWindow.element.textContent, /png\|webp/);
  assert.equal(helpWindow.element.querySelectorAll("details").length, 11);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ Intro: "Updated <script>text</script>", Topics: [
    { Title: "New topic", Paragraphs: ["New help without changing JavaScript"] }
  ] }) });
  await helpWindow.render();
  assert.match(helpWindow.element.textContent, /New help without changing JavaScript/);
  assert.equal(helpWindow.element.querySelector("script"), null);
  assert.equal(helpWindow.element.querySelectorAll("details").length, 1);
  assert.equal(helpWindow.element.querySelector("details").open, true);
  // Test the shipped examples against filenames, rather than only their text.
  for (let language of ["en", "de"]) {
    let helpData = JSON.parse(readFileSync(new URL(`../help/${language}_help.json`, import.meta.url), "utf8"));
    let examples = helpData.Topics[2].Paragraphs.slice(0, 6);
    let matchingNames = ["any.file", "map.PNG", "cave-monster.png", "TOKEN_orc.webp", "ambience.WAV", "map-12.png"];
    for (let [index, paragraph] of examples.entries()) {
      let pattern = paragraph.match(/: (\/.*?\/[a-z]*|\.\*)/)[1];
      let literal = pattern.match(/^\/(.*)\/([a-z]*)$/);
      let regex = literal === null ? new RegExp(pattern) : new RegExp(literal[1], literal[2]);
      assert.equal(regex.test(matchingNames[index]), true, paragraph);
      if (index > 0) assert.equal(regex.test("unrelated.txt"), false, paragraph);
    }
  }
});

test("missing or invalid help omits menu and editor button; available help is last", async () => {
  for (let failureMode of ["missing", "invalid", "network"]) {
    globalThis.fetch = async () => {
      if (failureMode === "network") throw new Error("Offline");
      return { ok: failureMode !== "missing", json: async () => ({ Intro: "bad", Topics: [{}] }) };
    };
    registeredMenus.clear();
    await hookHandlers.get("init")();
  await hookHandlers.get("i18nInit")();
    assert.equal(registeredMenus.has("help"), false);
    assert.equal(QFU_HELP_STATE.Content, null);
    let editor = await new ConfigurationApplication().render();
    assert.equal(Array.from(editor.Form.querySelectorAll(".qu-toolbar button")).some(button => button.textContent === LocalizeText("QFU.HelpButton")), false);
  }
  globalThis.fetch = FetchHelpFixture;
  registeredMenus.clear();
  await hookHandlers.get("init")();
  await hookHandlers.get("i18nInit")();
  assert.equal(Array.from(registeredMenus.keys()).at(-1), "help");
  let editor = await new ConfigurationApplication().render();
  assert.equal(editor.Form.querySelector(".qu-toolbar button:last-child").textContent, LocalizeText("QFU.HelpButton"));
  assert.match(editor.Form.querySelector('[name="Regex"]').placeholder, /or \.\* for all/);
  game.i18n.lang = "fr";
  assert.equal(await LoadHelpContent(), null);
});

test("help menu hint contains a clickable documentation link and is safe to render repeatedly", () => {
  let settingsElement = document.createElement("section");
  settingsElement.innerHTML = '<div class="form-group"><button data-key="quick-file-upload.help"></button><p class="hint">Old hint</p></div>';
  hookHandlers.get("renderSettingsConfig")({ element: settingsElement });
  hookHandlers.get("renderSettingsConfig")({ element: settingsElement });
  let links = settingsElement.querySelectorAll(".hint a");
  assert.equal(links.length, 1);
  assert.equal(links[0].href, "https://cepeu.github.io/Quick-File-Upload/");
  assert.equal(links[0].textContent, "Github documentation");
  assert.match(settingsElement.textContent, /Description and help for Quick File Upload/);
});

test("group exclusion persists through editor save and JSON import", async () => {
  let settingsWindow = await new ConfigurationApplication().render();
  let excludedInput = settingsWindow.Form.querySelector('[name="Excluded"]');
  assert.equal(excludedInput.checked, false);
  excludedInput.click();
  let exportText = SerializeSettings(settingsWindow.ReadDraft());
  await settingsWindow.SaveDraft();
  assert.equal(writtenSettings[0].Groups[0].Excluded, true);
  settingsWindow = await new ConfigurationApplication().render();
  assert.equal(settingsWindow.Form.querySelector('[name="Excluded"]').checked, true);
  await settingsWindow.ImportSettings(exportText);
  assert.equal(settingsWindow.Form.querySelector('[name="Excluded"]').checked, true);
});

test("excluded groups remain selectable while the folder panel shows only active rules", async () => {
  currentSettings.Groups[0].Excluded = true;
  let uploadApp = await new UploadApplication().render();
  assert.equal(uploadApp.element.querySelectorAll('[data-identifier]').length, 2);
  assert.equal(uploadApp.element.querySelectorAll('.qu-folder-rules li').length, 2);
  assert.doesNotMatch(uploadApp.element.querySelector('.qu-folder').textContent, /Small images/);
  uploadApp.element.querySelector('.qu-toggle input').click();
  uploadApp.element.querySelector('[data-identifier="Images"]').click();
  assert.equal(uploadApp.element.querySelectorAll('.qu-folder-rules li').length, 3);
  assert.match(uploadApp.element.querySelector('.qu-folder').textContent, /Small images/);
});

test("English and German contain every translation key used in scripts", () => {
  let germanText = JSON.parse(readFileSync(new URL("../lang/de.json", import.meta.url), "utf8")).QFU;
  assert.deepEqual(Object.keys(germanText).sort(), Object.keys(QFU_ENGLISH).sort());
  let scriptsDirectory = new URL("../scripts/", import.meta.url);
  for (let fileName of readdirSync(scriptsDirectory)) {
    if (fileName.endsWith(".js") === false) continue;
    let sourceText = readFileSync(new URL(fileName, scriptsDirectory), "utf8").split("\n").filter(sourceLine => sourceLine.trim().startsWith("//") === false).join("\n");
    assert.equal(sourceText.includes("i18n.format"), false);
    assert.equal(sourceText.includes("TranslateText"), false);
    for (let keyMatch of sourceText.matchAll(/"QFU\.([A-Za-z]+)"/g)) {
      let messageKey = keyMatch[1];
      assert.equal(typeof QFU_ENGLISH[messageKey], "string", `${fileName}: ${messageKey}`);
    }
  }
});


test("main button intercepts repeated clicks and combined placement opens through its tool", async () => {
  currentSettings = structuredClone(QFU_SETTINGS);
  let controlElement = document.createElement("div");
  let controlButton = document.createElement("button");
  controlButton.dataset.control = QFU_MODULE_ID;
  controlElement.append(controlButton);
  document.body.append(controlElement);
  let selectionCount = 0;
  controlElement.addEventListener("click", () => selectionCount++);
  hookHandlers.get("renderSceneControls")({ element: controlElement });
  hookHandlers.get("renderSceneControls")({ element: controlElement });
  controlButton.click();
  let uploadApp = await OpenUpload();
  await uploadApp.close();
  controlButton.click();
  uploadApp = await OpenUpload();
  assert.equal(uploadApp.rendered, true);
  assert.equal(selectionCount, 0);
  await uploadApp.close();
  currentSettings.Placement = "main-sub";
  let controlRecord = {};
  hookHandlers.get("getSceneControlButtons")(controlRecord);
  let mainControl = controlRecord[QFU_MODULE_ID];
  assert.equal(mainControl.onChange, undefined);
  assert.equal(mainControl.activeTool, undefined);
  assert.equal(mainControl.tools[QFU_MODULE_ID].button, true);
  for (let clickIndex = 0; clickIndex < 2; clickIndex++) {
    uploadApp = await mainControl.tools[QFU_MODULE_ID].onChange(new Event("click"), true);
    assert.equal(uploadApp.rendered, true);
    await uploadApp.close();
  }
  let controlsWindow = await new ControlsApplication().render();
  assert.equal(controlsWindow.Form.elements.namedItem("Placement").value, "main-sub");
  await controlsWindow.SaveDraft();
  assert.equal(writtenSettings[0].Placement, "main-sub");
});

test("clones preserve unsaved fields, unique numbering, adjacency and independent defaults", async () => {
  let settingsWindow = await new ConfigurationApplication().render();
  let groupList = settingsWindow.Form.querySelector(".qu-groups");
  let sourceGroup = groupList.firstElementChild;
  sourceGroup.querySelector('[name="Identifier"]').value = "Edited";
  sourceGroup.querySelector('[name="Excluded"]').checked = true;
  let sourceRule = sourceGroup.querySelector(".qu-rule");
  sourceRule.querySelector('[name="Name"]').value = "Edited rule";
  sourceRule.querySelector('[name="Path"]').value = "uploads/edited";
  sourceRule.querySelector('[name="Default"]').click();
  sourceRule.querySelector('[name="Function"]').value = "chat";
  sourceRule.querySelector('[name="Function"]').dispatchEvent(new Event("change", { bubbles: true }));
  sourceGroup.querySelector(".qu-group-header .qu-clone").click();
  sourceGroup.querySelector(".qu-group-header .qu-clone").click();
  let draftSettings = settingsWindow.ReadDraft();
  assert.deepEqual(draftSettings.Groups.map(groupData => groupData.Identifier), ["Edited", "Edited 2", "Edited 1", "Sounds"]);
  let expectedGroup = structuredClone(draftSettings.Groups[0]);
  expectedGroup.Identifier = "Edited 2";
  assert.deepEqual(draftSettings.Groups[1], expectedGroup);
  sourceRule.querySelector(".qu-clone").click();
  sourceRule.querySelector(".qu-clone").click();
  draftSettings = settingsWindow.ReadDraft();
  assert.deepEqual(draftSettings.Groups[0].Rules.slice(0, 3).map(ruleData => ruleData.Name), ["Edited rule", "Edited rule 2", "Edited rule 1"]);
  let expectedRule = structuredClone(draftSettings.Groups[0].Rules[0]);
  expectedRule.Name = "Edited rule 2";
  expectedRule.Default = false;
  assert.deepEqual(draftSettings.Groups[0].Rules[1], expectedRule);
  assert.equal(draftSettings.Groups[0].Rules.filter(ruleData => ruleData.Default === true).length, 1);
  assert.equal(draftSettings.Groups[1].Rules.length, 3);
  assert.equal(writtenSettings.length, 0);
  await settingsWindow.SaveDraft();
  assert.equal(writtenSettings[0].Groups.length, 4);
  assert.equal(writtenSettings[0].Groups[0].Rules.length, 5);
});


test("pad controls retain focus, import clipboard representations and apply opening defaults", async () => {
  globalThis.File = browserWindow.File;
  currentSettings.Allgroups = false;
  currentSettings.Cliplabel = "Import now";
  currentSettings.Clipcolor = "#123456";
  let uploadWindow = await new UploadApplication().render();
  let pad = uploadWindow.element.querySelector(".qu-pad");
  assert.equal(uploadWindow.All, false);
  assert.equal(uploadWindow.element.querySelector(".qu-toggle input").checked, false);
  assert.equal(pad.querySelector(".qu-drop").children.length, 1);
  pad.querySelector(".qu-pad-label").click();
  assert.equal(document.activeElement, pad);
  let clipboardButton = pad.querySelector(".qu-clipboard");
  assert.equal(clipboardButton.textContent, "Import now");
  assert.equal(clipboardButton.style.getPropertyValue("--qu-clipboard-color"), "#123456");
  assert.ok(clipboardButton.title.length > 0);
  let batches = [];
  uploadWindow.UploadFiles = files => batches.push(files);
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: {
    read: async () => [{ types: ["text/plain", "text/html"], getType: async type => new browserWindow.Blob(["<b>Text</b>"], { type }) }]
  } });
  await uploadWindow.ImportClipboard();
  assert.equal(batches.length, 1);
  assert.equal(batches[0][0].type, "text/html");
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { read: async () => { throw new Error("Denied"); } } });
  await uploadWindow.ImportClipboard();
  assert.equal(batches.length, 1);
  assert.equal(document.activeElement, pad);
  assert.ok(notificationMessages.at(-1).includes("Ctrl+V"));
  let pickerOptions;
  foundry.applications.apps.FilePicker = { implementation: class {
    constructor(options) { pickerOptions = options; }
    render(options) { assert.equal(options.force, true); }
  } };
  let pickerButton = uploadWindow.element.querySelector(".qu-file-browser");
  assert.equal(pickerButton.previousElementSibling.className, "qu-actions");
  pickerButton.click();
  assert.equal(pickerOptions.type, "any");
  assert.equal(pickerOptions.current, currentSettings.Fallback);
  let layoutWindow = await new LayoutApplication().render();
  layoutWindow.Form.elements.namedItem("Allgroups").checked = true;
  assert.equal(layoutWindow.ReadDraft().Allgroups, true);
});

test("clipboard menu and rule overrides save independently and round-trip through JSON", async () => {
  let groupWindow = await new ConfigurationApplication().render();
  let clipboardWindow = await new ClipboardApplication().render();
  assert.equal(clipboardWindow.Form.querySelector(".qu-groups"), null);
  clipboardWindow.Form.elements.namedItem("Clipformat").value = "jpg";
  clipboardWindow.Form.elements.namedItem("Clippath").value = "clipboard/destination";
  clipboardWindow.Form.elements.namedItem("Clipoverride").checked = true;
  clipboardWindow.Draft.Clipname.Base = "new-name";
  await clipboardWindow.SaveDraft();
  let ruleRow = groupWindow.Form.querySelector(".qu-rule");
  ruleRow.querySelector('[name="Cliponly"]').click();
  ruleRow.querySelector('[name="Ruleformat"]').value = "webp";
  ruleRow.querySelector('[name="Path"]').value = "";
  assert.equal(ruleRow.querySelector('[name="Path"]').required, false);
  assert.equal(ruleRow.querySelector('[name="Ruleformat"]').disabled, false);
  ruleRow.querySelector('[name="Function"]').value = "clipboard";
  ruleRow.querySelector('[name="Function"]').dispatchEvent(new Event("change", { bubbles: true }));
  await groupWindow.SaveDraft();
  assert.equal(currentSettings.Clipformat, "jpg");
  assert.equal(currentSettings.Clippath, "clipboard/destination");
  assert.equal(currentSettings.Clipoverride, true);
  assert.equal(currentSettings.Clipname.Base, "new-name");
  assert.equal(currentSettings.Groups[0].Rules[0].Cliponly, true);
  assert.equal(currentSettings.Groups[0].Rules[0].Clipformat, "webp");
  assert.equal(currentSettings.Groups[0].Rules[0].Action.Function, "clipboard");
  let exportText = SerializeSettings(currentSettings);
  let reopenedWindow = await new ClipboardApplication().render();
  await reopenedWindow.ImportSettings(exportText);
  assert.equal(reopenedWindow.ReadDraft().Clipname.Base, "new-name");
  assert.equal(reopenedWindow.ReadDraft().Clipformat, "jpg");
});

test("paste and clipboard button mark imports while drag and local selection remain ordinary", async () => {
  let uploadWindow = await new UploadApplication().render();
  let imports = [];
  uploadWindow.UploadFiles = (files, context) => imports.push({ files, context });
  uploadWindow.PasteClipboard({ files: [], getData: type => type === "text/plain" ? "Hello" : "" });
  assert.deepEqual(imports[0].context, { Clipboard: true });
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: {
    read: async () => [{ types: ["text/plain"], getType: async () => new browserWindow.Blob(["Hello"], { type: "text/plain" }) }]
  } });
  await uploadWindow.ImportClipboard();
  assert.deepEqual(imports[1].context, { Clipboard: true });
  let dropEvent = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(dropEvent, "dataTransfer", { value: { files: [new File(["Hello"], "local.txt")] } });
  uploadWindow.element.querySelector(".qu-pad").dispatchEvent(dropEvent);
  assert.equal(imports[2].context, undefined);
  let fileInput = uploadWindow.element.querySelector('input[type="file"]');
  Object.defineProperty(fileInput, "files", { value: [new File(["Hello"], "local.txt")] });
  fileInput.dispatchEvent(new Event("change"));
  assert.equal(imports[3].context, undefined);
});


test("registered file browser hook reads the uploader's current selection at each click", async () => {
  let uploadApp = await OpenUpload();
  let root = document.createElement("form");
  root.innerHTML = '<input name="file" value="existing/map.png"><footer class="form-footer"><button type="submit">Select File</button></footer>';
  document.body.append(root);
  let posted = [];
  globalThis.CONST = { IMAGE_FILE_EXTENSIONS: { png: "image/png" } };
  globalThis.ChatMessage = { create: async data => posted.push(data) };
  globalThis.fetch = async () => ({ ok: true, blob: async () => new Blob(["map"]) });
  currentSettings.Groups[0].Rules[0].Action = { Function: "chat", Macro: "", Before: false };
  hookHandlers.get("renderFilePicker")({ element: root, type: "any" });
  uploadApp.All = false;
  uploadApp.Selected = "Sounds";
  root.querySelector('[data-qu-action="group"]').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(posted.length, 0);
  uploadApp.Selected = "Images";
  root.querySelector('[data-qu-action="group"]').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(posted.length, 1);
  assert.match(posted[0].content, /existing\/map.png/);
  await uploadApp.close();
});
