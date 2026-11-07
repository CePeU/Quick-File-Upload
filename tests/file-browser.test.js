import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { DecorateFileBrowser, ExecuteBrowserAction } from "../scripts/file-browser.js";
import { QFU_SETTINGS, QFU_ACTION_SETTINGS } from "../scripts/settings.js";
import { LocalizeText } from "../testing/fixtures.js";

let currentSettings, postedMessages, sharedImages, macroCalls, readPaths, errorMessages;
beforeEach(() => {
  globalThis.document = new JSDOM("<!doctype html><body></body>").window.document;
  currentSettings = structuredClone(QFU_SETTINGS);
  postedMessages = []; sharedImages = []; macroCalls = []; readPaths = []; errorMessages = [];
  globalThis.game = {
    i18n: { localize: LocalizeText }, settings: { get: () => currentSettings },
    users: [{ id: "one", isGM: false }, { id: "two", isGM: false }, { id: "gm", isGM: true }]
  };
  globalThis.CONST = { IMAGE_FILE_EXTENSIONS: { png: "image/png", tiff: "image/tiff", apng: "image/apng", webp: "image/webp" }, JOURNAL_ENTRY_PAGE_FORMATS: { HTML: 1 } };
  globalThis.foundry = { applications: {
    api: { DialogV2: { prompt: async () => null } },
    apps: { ImagePopout: class {
      constructor(options) { this.options = options; }
      shareImage(options) { sharedImages.push({ ...options, src: this.options.src }); }
    }, FilePicker: { upload: () => assert.fail("No upload allowed"), createDirectory: () => assert.fail("No directory writes allowed") } }
  } };
  globalThis.ChatMessage = { create: async data => postedMessages.push(data) };
  globalThis.fromUuid = async () => ({ documentName: "Macro", execute: async scope => macroCalls.push(scope) });
  globalThis.ui = { notifications: { error: message => errorMessages.push(message) } };
  globalThis.fetch = async path => {
    readPaths.push(path);
    return { ok: true, blob: async () => new Blob(["x".repeat(2048)]) };
  };
});

function CreatePicker(path = "") {
  let root = document.createElement("form");
  root.innerHTML = '<input name="file"><footer class="form-footer"><button type="submit">Select File</button></footer>';
  root.querySelector("input").value = path;
  document.body.append(root);
  return { element: root, type: "any" };
}

async function FlushActions() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

test("direct sharing targets every player despite audience defaults and preserves encoded URLs", async () => {
  currentSettings.Audience = "selected";
  currentSettings.Users = "gm";
  currentSettings.Audienceprompt = true;
  currentSettings.Journal = "invalid";
  await ExecuteBrowserAction("assets/A%20map.TIFF?version=1", "players");
  assert.deepEqual(sharedImages, [{ users: ["one", "two"], src: "assets/A%20map.TIFF?version=1" }]);
  await ExecuteBrowserAction('https://cdn.example/map%20one.apng', "chat");
  assert.match(postedMessages[0].content, /src="https:\/\/cdn.example\/map%20one.apng"/);
  assert.match(postedMessages[0].content, /alt="map one.apng"/);
  assert.deepEqual(readPaths, []);
  await assert.rejects(() => ExecuteBrowserAction("assets/file.pdf", "chat"), /requires an image/);
});

test("group actions use real size, ordered rules and existing path in macro scope", async () => {
  currentSettings.Groups = [{ Identifier: "Maps", Rules: [
    { Name: "Small", Regex: "png$", Limit: 1, Action: { ...QFU_ACTION_SETTINGS, Function: "chat" } },
    { Name: "Large", Regex: "png$", Limit: 0, Path: "different/folder", Action: { Function: "chat", Macro: "Macro.test", Before: true } }
  ] }];
  await ExecuteBrowserAction("original/My%20Map.png", "group", { All: false, Selected: "Maps" });
  assert.equal(macroCalls.length, 1);
  assert.equal(macroCalls[0].path, "original/My%20Map.png");
  assert.equal(macroCalls[0].file.name, "My Map.png");
  assert.equal(macroCalls[0].file.size, 2048);
  assert.equal(postedMessages.length, 1);
  assert.match(postedMessages[0].content, /original\/My%20Map.png/);
  assert.deepEqual(readPaths, ["original/My%20Map.png"]);
});

test("group defaults, exclusions and upload-only actions retain existing-file behavior", async () => {
  currentSettings.Groups = [{ Identifier: "Excluded", Excluded: true, Rules: [
    { Name: "Default", Regex: "", Limit: 0, Default: true, Action: { ...QFU_ACTION_SETTINGS, Function: "chat" } }
  ] }];
  await ExecuteBrowserAction("assets/map.png", "group", { All: true, Selected: "Excluded" });
  assert.equal(postedMessages.length, 0);
  await ExecuteBrowserAction("assets/map.png", "group", { All: false, Selected: "Excluded" });
  assert.equal(postedMessages.length, 1);
  for (let action of ["clipboard", "manual"]) {
    currentSettings.Groups[0].Rules[0].Action = { Function: action, Macro: "Macro.test", Before: false };
    await ExecuteBrowserAction("assets/map.png", "group", { All: false, Selected: "Excluded" });
  }
  assert.equal(macroCalls.length, 2);
  assert.equal(postedMessages.length, 1);
});

test("Drop action supports cancellation and reads existing text only for journal text", async () => {
  await ExecuteBrowserAction("notes/note.txt", "choose");
  assert.deepEqual(readPaths, []);
  let createdPages = [];
  foundry.applications.api.DialogV2.prompt = async config => {
    assert.match(config.content, /journalimage/);
    assert.match(config.content, /journaltext/);
    return ["journaltext"];
  };
  currentSettings.Journalprompt = false;
  currentSettings.Journal = "JournalEntry.test";
  globalThis.fromUuid = async () => ({
    documentName: "JournalEntry", isOwner: true,
    createEmbeddedDocuments: async (type, pages) => { createdPages.push(...pages); return [{ uuid: "JournalEntry.test.Page.one" }]; }
  });
  globalThis.fetch = async path => {
    readPaths.push(path);
    return { ok: true, blob: async () => new Blob(["<plain text>"]) };
  };
  await ExecuteBrowserAction("notes/note.txt", "choose");
  assert.deepEqual(readPaths, ["notes/note.txt"]);
  assert.equal(createdPages[0].text.content, "<pre>&lt;plain text&gt;</pre>");
});

test("browser buttons follow input and programmatic picks without duplicating on renders", async () => {
  let picker = CreatePicker();
  let root = picker.element;
  DecorateFileBrowser(picker, () => ({ All: true, Selected: null }));
  DecorateFileBrowser(picker, () => ({ All: true, Selected: null }));
  assert.equal(root.querySelectorAll(".qu-browser-actions").length, 1);
  assert.equal(root.querySelector(".form-footer").nextElementSibling.className, "qu-browser-actions");
  assert.equal(root.querySelectorAll('[data-qu-action]:disabled').length, 4);
  root.querySelector("input").value = "assets/map.apng";
  root.dispatchEvent(new document.defaultView.Event("click", { bubbles: true }));
  await FlushActions();
  assert.equal(root.querySelectorAll('[data-qu-action]:disabled').length, 0);
  root.querySelector("input").value = "notes/note.txt";
  root.querySelector("input").dispatchEvent(new document.defaultView.Event("input", { bubbles: true }));
  assert.equal(root.querySelector('[data-qu-action="players"]').disabled, true);
  assert.equal(root.querySelector('[data-qu-action="choose"]').disabled, false);
  assert.equal(root.querySelector('[data-qu-action="group"]').disabled, false);
  let folders = CreatePicker(); folders.type = "folder";
  DecorateFileBrowser(folders, () => ({}));
  assert.equal(folders.element.querySelector(".qu-browser-actions"), null);
});

test("browser clicks keep the form open, serialize actions and recover after read errors", async () => {
  let picker = CreatePicker("assets/map.png");
  let submitted = 0, selectionReads = 0, completeRequest;
  picker.element.addEventListener("submit", event => { submitted++; event.preventDefault(); });
  DecorateFileBrowser(picker, () => { selectionReads++; return { All: true, Selected: null }; });
  let button = picker.element.querySelector('[data-qu-action="group"]');
  globalThis.fetch = async () => new Promise(resolve => { completeRequest = resolve; });
  button.click(); button.click();
  assert.equal(selectionReads, 1);
  assert.equal(button.disabled, true);
  // A partial footer render must retain the busy state.
  DecorateFileBrowser(picker, () => ({ All: true, Selected: null }));
  completeRequest({ ok: false });
  await FlushActions();
  assert.equal(picker.element.querySelector('[data-qu-action="group"]').disabled, false);
  assert.deepEqual(errorMessages, ["The selected file could not be read."]);
  picker.element.querySelector('[data-qu-action="chat"]').click();
  await FlushActions();
  assert.equal(postedMessages.length, 1);
  assert.equal(submitted, 0);
  assert.equal(picker.element.isConnected, true);
});
