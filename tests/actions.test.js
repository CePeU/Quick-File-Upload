import test from "node:test";
import assert from "node:assert/strict";
import { QFU_SETTINGS, QFU_ACTION_SETTINGS } from "../scripts/settings.js";
import { LocalizeText } from "../testing/fixtures.js";
import { ExecuteActions, ExecuteBuiltin, ResolveAudience, FilterJournals } from "../scripts/actions.js";
import { UploadBatch, ValidateSettings, SerializeSettings, ParseSettings } from "../scripts/core.js";
import { JSDOM } from "jsdom";

globalThis.game = { i18n: { localize: LocalizeText } };

test("actions retain UUID and order on export, rejecting invalid options", () => {
  let settings = structuredClone(QFU_SETTINGS);
  settings.Groups = [{ Identifier: "Images", Rules: [{ Name: "Image", Regex: "png$", Path: "assets", Action: { Macro: "Macro.example", Before: true, Function: "chat" } }] }];
  let clean = ValidateSettings(settings);
  assert.deepEqual(ParseSettings(SerializeSettings(clean)), clean);
  settings.Groups[0].Rules[0].Action.Function = "unknown";
  assert.throws(() => ValidateSettings(settings), /action settings/);
  settings.Groups = [];
  settings.Clipboard = "true";
  assert.throws(() => ValidateSettings(settings), /action settings/);
});

test("macro and chat actions run in configured order with confirmed path", async () => {
  let calls = [];
  globalThis.fromUuid = async uuid => ({ documentName: "Macro", execute: async scope => calls.push([uuid, scope.path]) });
  globalThis.ChatMessage = { create: async data => calls.push(data.content) };
  let file = { name: 'map".png', type: "image/png" };
  for (let before of [true, false]) {
    calls.length = 0;
    await ExecuteActions(file, "assets/map.png", { Macro: "Macro.test", Before: before, Function: "chat" }, QFU_SETTINGS);
    assert.deepEqual(calls[Number(before === false)], ["Macro.test", "assets/map.png"]);
    assert.match(calls[Number(before === true)], /map&quot;\.png/);
  }
});

test("choose action survives export and offers every concrete action after upload", async () => {
  globalThis.document = new JSDOM("<!doctype html><body></body>").window.document;
  let settings = structuredClone(QFU_SETTINGS);
  settings.Groups = [{ Identifier: "Files", Rules: [{ Name: "All", Regex: ".", Path: "assets", Action: { ...QFU_ACTION_SETTINGS, Function: "choose" } }] }];
  assert.equal(ParseSettings(SerializeSettings(settings)).Groups[0].Rules[0].Action.Function, "choose");
  let calls = [];
  globalThis.ChatMessage = { create: async data => calls.push(data.content) };
  globalThis.foundry = { applications: { api: { DialogV2: { prompt: async config => {
    calls.push("choose");
    let container = document.createElement("div");
    container.innerHTML = config.content;
    assert.deepEqual(Array.from(container.querySelectorAll("option"), option => option.value), ["chat", "journalimage", "journaltext", "none", "image"]);
    assert.equal(config.window.title, "Choose an action for map.png");
    assert.equal(container.querySelector("select").multiple, false);
    return ["chat"];
  } } } } };
  let picker = { browse: async () => ({}), upload: async () => { calls.push("upload"); return { path: "assets/confirmed.png" }; } };
  await UploadBatch([{ name: "map.png" }], settings, true, null, picker, () => {});
  assert.deepEqual(calls.slice(0, 2), ["upload", "choose"]);
  assert.match(calls[2], /assets\/confirmed.png/);
});

test("canceling action choice preserves macro order and skips file-type validation", async () => {
  globalThis.document = new JSDOM("<!doctype html><body></body>").window.document;
  let calls = [];
  foundry.applications.api.DialogV2.prompt = async () => { calls.push("choose"); return null; };
  globalThis.fromUuid = async () => ({ documentName: "Macro", execute: async () => calls.push("macro") });
  for (let before of [true, false]) {
    calls.length = 0;
    await ExecuteActions({ name: "note.txt" }, "assets/note.txt", { Macro: "Macro.test", Before: before, Function: "choose" }, QFU_SETTINGS);
    let expected = ["choose", "macro"];
    if (before === true) expected.reverse();
    assert.deepEqual(calls, expected);
  }
  foundry.applications.api.DialogV2.prompt = async () => ["none"];
  await ExecuteBuiltin({ name: "note.txt" }, "assets/note.txt", "choose", QFU_SETTINGS);
  foundry.applications.api.DialogV2.prompt = async () => ["chat"];
  await assert.rejects(() => ExecuteBuiltin({ name: "note.txt" }, "assets/note.txt", "choose", QFU_SETTINGS), /requires an image/);
});

test("upload failure skips actions; action failure retains saved status and batch continues", async () => {
  let results = [], calls = [];
  let settings = structuredClone(QFU_SETTINGS);
  settings.Groups = [{ Identifier: "Images", Rules: [{ Name: "Images", Regex: "png$", Path: "assets", Action: { ...QFU_ACTION_SETTINGS, Macro: "Macro.test" } }] }];
  globalThis.fromUuid = async () => ({ documentName: "Macro", execute: async scope => { calls.push(scope.path); throw Error("macro failed"); } });
  let picker = { browse: async () => ({}), upload: async (source, target, file) => {
    if (file.name === "bad.png") throw Error("upload failed");
    return { path: `assets/${file.name}` };
  } };
  await UploadBatch([{ name: "bad.png" }, { name: "good.png" }, { name: "last.png" }], settings, true, null, picker, result => results.push(result));
  assert.deepEqual(calls, ["assets/good.png", "assets/last.png"]);
  assert.deepEqual(results.filter(result => result.Status !== "Uploading").map(result => result.Status), ["Failed", "Uploaded", "Uploaded"]);
  assert.equal(results.at(-1).Error, "macro failed");
});

test("journal imports distinguish HTML from literal text and Markdown", async () => {
  let pages = [], shows = [];
  let journal = { documentName: "JournalEntry", isOwner: true, createEmbeddedDocuments: async (type, data) => {
    assert.equal(type, "JournalEntryPage"); pages.push(...data); return [{ uuid: "JournalEntry.test.JournalEntryPage.page" }];
  } };
  globalThis.fromUuid = async () => journal;
  globalThis.CONST = { JOURNAL_ENTRY_PAGE_FORMATS: { HTML: 1 } };
  globalThis.foundry = { documents: { collections: { Journal: { show: async (...args) => shows.push(args) } } } };
  game.users = [{ id: "player", isGM: false }, { id: "gm", isGM: true }];
  let settings = { ...QFU_SETTINGS, Journal: "JournalEntry.test", Journalprompt: false, Display: "players" };
  for (let extension of ["txt", "md", "html"]) {
    await ExecuteBuiltin({ name: `note.${extension}`, text: async () => "<h1>Hello</h1>" }, "assets/note", "journaltext", settings);
  }
  assert.equal(pages[0].text.content, "<pre>&lt;h1&gt;Hello&lt;/h1&gt;</pre>");
  assert.equal(pages[1].text.content, pages[0].text.content);
  assert.equal(pages[2].text.content, "<h1>Hello</h1>");
  assert.deepEqual(shows[0][1], { users: ["player", "gm"], force: true });
  await ExecuteBuiltin({ name: "map.png" }, "assets/map.png", "journalimage", { ...settings, Display: "none" });
  assert.equal(pages.at(-1).src, "assets/map.png");
  assert.equal(pages.at(-1).type, "image");
});

test("recipients include GMs and filter unknown IDs, and Observer requires a reference", async () => {
  game.users = [{ id: "one", isGM: false }, { id: "two", isGM: false }, { id: "gm", isGM: true }];
  assert.deepEqual(await ResolveAudience({ ...QFU_SETTINGS, Audience: "selected", Users: "two,gm,missing" }, null), ["two", "gm"]);
  await assert.rejects(() => ResolveAudience({ ...QFU_SETTINGS, Audience: "observer" }, null), /reference journal/);
  assert.deepEqual(await ResolveAudience({ ...QFU_SETTINGS, Audience: "observer" }, { testUserPermission: user => user.id === "one" }), ["one"]);
});

test("chooser defaults survive HTML serialization and cancellation skips creation", async () => {
  globalThis.document = new JSDOM("<!doctype html><body></body>").window.document;
  let created = 0;
  game.journal = [{ uuid: "JournalEntry.first", name: "<First>", isOwner: true }, { uuid: "JournalEntry.second", name: "Second", isOwner: true }];
  let captured = null;
  foundry.applications = { api: { DialogV2: { prompt: async config => { captured = config; return null; } } } };
  globalThis.fromUuid = async () => ({ documentName: "JournalEntry", isOwner: true, createEmbeddedDocuments: async () => { created++; } });
  await ExecuteBuiltin({ name: "map.png" }, "assets/map.png", "journalimage", { ...QFU_SETTINGS, Journal: "JournalEntry.second" });
  assert.equal(created, 0);
  let container = document.createElement("div");
  container.innerHTML = captured.content;
  assert.equal(container.querySelector("select").value, "JournalEntry.second");
  assert.equal(container.querySelector("option").textContent, "<First>");
  assert.equal(container.querySelector("First"), null);
  assert.deepEqual(captured.ok.callback(null, null, { element: container }), ["JournalEntry.second"]);
});

test("image sharing targets only chosen players and never broadcasts empty lists", async () => {
  let shared = [], rendered = [];
  foundry.applications.apps = { ImagePopout: class {
    constructor(options) { this.options = options; }
    async render(options) { rendered.push({ ...options, src: this.options.src }); return this; }
    shareImage(options) { shared.push({ ...options, src: this.options.src }); }
  } };
  game.users = [{ id: "one", isGM: false }];
  let settings = { ...QFU_SETTINGS, Audience: "selected", Users: "one" };
  await ExecuteBuiltin({ name: "map.png" }, "assets/map.png", "image", settings);
  assert.deepEqual(shared, [{ users: ["one"], src: "assets/map.png" }]);
  await ExecuteBuiltin({ name: "map.png" }, "assets/map.png", "image", { ...settings, Users: "" });
  assert.equal(shared.length, 1);
  assert.equal(rendered.length, 2);
  game.user = { id: "one" };
  await ExecuteBuiltin({ name: "map.png" }, "assets/map.png", "image", settings);
  assert.equal(shared.length, 2);
  assert.equal(rendered.length, 2, "sender in audience receives the image through the socket without a duplicate local window");
  delete game.user;
  await assert.rejects(() => ExecuteBuiltin({ name: "data.pdf" }, "assets/data.pdf", "image", settings), /requires an image/);
});

test("journal filters combine explicit UUIDs and name regex without bypassing ownership", async () => {
  game.journal = [
    { uuid: "JournalEntry.one", name: "Maps One", isOwner: true },
    { uuid: "JournalEntry.two", name: "Maps Two", isOwner: true },
    { uuid: "JournalEntry.three", name: "Notes", isOwner: true },
    { uuid: "JournalEntry.private", name: "Maps Private", isOwner: false }
  ];
  globalThis.fromUuid = async uuid => {
    if (uuid === "broken") throw Error("Invalid UUID");
    return game.journal.find(entry => entry.uuid === uuid) ?? null;
  };
  let identifiers = entries => entries.map(entry => entry.uuid);
  assert.deepEqual(identifiers(await FilterJournals(QFU_SETTINGS)), ["JournalEntry.one", "JournalEntry.two", "JournalEntry.three"]);
  let settings = { ...QFU_SETTINGS, Journaluuids: " JournalEntry.three;broken;JournalEntry.private;JournalEntry.three ", Journalpattern: "/^Maps/g" };
  assert.deepEqual(identifiers(await FilterJournals(settings)), ["JournalEntry.three", "JournalEntry.one", "JournalEntry.two"]);
  settings.Journalpattern = "";
  assert.deepEqual(identifiers(await FilterJournals(settings)), ["JournalEntry.three"]);
  settings.Journaluuids = "";
  settings.Journalpattern = "[";
  assert.throws(() => ValidateSettings(settings), /regular expression/i);
});

test("recipient permission chooser supports GMs, selected defaults and cancellation", async () => {
  globalThis.document = new JSDOM("<!doctype html><body></body>").window.document;
  game.users = [{ id: "player", isGM: false }, { id: "gm", isGM: true }];
  foundry.applications.api.DialogV2.prompt = async config => {
    let container = document.createElement("div");
    container.innerHTML = config.content;
    assert.deepEqual(Array.from(container.querySelectorAll("option"), option => option.value), ["playersonly", "all", "observer", "selected"]);
    return ["all"];
  };
  assert.deepEqual(await ResolveAudience({ ...QFU_SETTINGS, Audience: "choose" }, null), ["player", "gm"]);
  let promptCount = 0;
  foundry.applications.api.DialogV2.prompt = async config => {
    promptCount++;
    if (promptCount === 1) return ["selected"];
    let container = document.createElement("div");
    container.innerHTML = config.content;
    assert.equal(container.querySelector('option[value="gm"]').selected, true);
    return ["gm"];
  };
  assert.deepEqual(await ResolveAudience({ ...QFU_SETTINGS, Audience: "choose", Users: "gm", Audienceprompt: true }, null), ["gm"]);
  foundry.applications.api.DialogV2.prompt = async () => null;
  assert.equal(await ResolveAudience({ ...QFU_SETTINGS, Audience: "choose" }, null), null);
});

test("player-only and all-user recipients remain distinct and survive settings exports", async () => {
  game.users = [{ id: "player", isGM: false }, { id: "gm", isGM: true }];
  for (let audience of ["playersonly", "all"]) {
    let settings = { ...QFU_SETTINGS, Audience: audience, Journalsort: true };
    let restored = ParseSettings(SerializeSettings(settings));
    assert.equal(restored.Audience, audience);
    assert.equal(restored.Journalsort, true);
    let expected = ["player"];
    if (audience === "all") expected.push("gm");
    assert.deepEqual(await ResolveAudience(restored, null), expected);
  }
  assert.throws(() => ValidateSettings({ ...QFU_SETTINGS, Journalsort: "true" }), /action settings/);
});

test("explicit journals retain input order or merge alphabetically without duplicates", async () => {
  game.journal = [
    { uuid: "JournalEntry.a", name: "Alpha", isOwner: true },
    { uuid: "JournalEntry.z", name: "Zulu", isOwner: true },
    { uuid: "JournalEntry.b", name: "Beta", isOwner: true },
    { uuid: "JournalEntry.c", name: "Charlie", isOwner: true }
  ];
  let settings = { ...QFU_SETTINGS, Journaluuids: "JournalEntry.z,JournalEntry.c;JournalEntry.z", Journalpattern: "." };
  let journalNames = entries => entries.map(entry => entry.name);
  assert.deepEqual(journalNames(await FilterJournals(settings)), ["Zulu", "Charlie", "Alpha", "Beta"]);
  assert.deepEqual(journalNames(await FilterJournals({ ...settings, Journalsort: true })), ["Alpha", "Beta", "Charlie", "Zulu"]);
  settings.Journaluuids = "";
  assert.deepEqual(journalNames(await FilterJournals(settings)), ["Alpha", "Beta", "Charlie", "Zulu"]);
});
