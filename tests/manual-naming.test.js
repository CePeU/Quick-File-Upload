import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { UploadBatch, ValidateSettings, SerializeSettings, ParseSettings } from "../scripts/core.js";
import { QFU_SETTINGS, QFU_ACTION_SETTINGS } from "../scripts/settings.js";
import { LocalizeText } from "../testing/fixtures.js";

let browserWindow = new JSDOM("<!doctype html><body></body>").window;
globalThis.document = browserWindow.document;
globalThis.game = { i18n: { localize: LocalizeText }, user: {} };
globalThis.foundry = { applications: { api: { DialogV2: {} } } };

function CreateManualSettings() {
  return ValidateSettings({ ...structuredClone(QFU_SETTINGS), Groups: [{ Identifier: "Maps", Rules: [
    { Name: "Manual", Regex: ".*", Path: "maps", Default: false, Limit: 0,
      Action: { ...QFU_ACTION_SETTINGS, Function: "manual" } }
  ] }] });
}

function MountDialog(dialogOptions) {
  let formElement = document.createElement("form");
  formElement.innerHTML = dialogOptions.content;
  document.body.replaceChildren(formElement);
  dialogOptions.render({}, { element: formElement });
  return formElement;
}

function CreatePicker(savedFiles) {
  return {
    browse: async () => ({}),
    createDirectory: async () => assert.fail("Existing folder"),
    upload: async (source, path, file) => {
      savedFiles.push(file);
      return { path: `${path}/${file.name}` };
    }
  };
}

test("single manual name is sanitized, preserves extension/content and supports clipboard schema", async () => {
  let settings = CreateManualSettings();
  settings.Clipname = { Base: "map", Parts: [{ Type: "separator", Value: "_" }, { Type: "group", Value: "" }], Presets: [] };
  assert.equal(ParseSettings(SerializeSettings(settings)).Groups[0].Rules[0].Action.Function, "manual");
  foundry.applications.api.DialogV2.wait = async options => {
    assert.equal(options.modal, true);
    let form = MountDialog(options);
    assert.equal(form.querySelector('[name="Individual"]'), null);
    assert.equal(form.querySelector('[name="Name"]').value, "source");
    form.querySelector('button[type="button"]').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(form.querySelector('[name="Name"]').value, "map_Maps");
    form.querySelector('[name="Name"]').value = "../new:name";
    return options.buttons[0].callback();
  };
  let saved = [], results = [];
  await UploadBatch([new File(["contents"], "source.png", { type: "image/png" })], settings, true, "Maps", CreatePicker(saved), result => results.push(result));
  assert.equal(saved[0].name, "newname.png");
  assert.equal(saved[0].type, "image/png");
  assert.equal(await saved[0].text(), "contents");
  assert.equal(results.at(-1).Status, "Uploaded");
});

test("shared batch copies only the base, expands extensions per file and disambiguates duplicates", async () => {
  let settings = CreateManualSettings();
  settings.Clipname = { Base: "preset", Parts: [{ Type: "separator", Value: "_" }, { Type: "group", Value: "" }], Presets: [] };
  let prompts = 0;
  foundry.applications.api.DialogV2.wait = async options => {
    prompts++;
    let form = MountDialog(options);
    form.querySelector('[name="Name"]').value = "draft";
    form.querySelector('button[type="button"]').click();
    assert.equal(form.querySelector('[name="Name"]').value, "preset");
    form.querySelector('[name="Name"]').value = "shared";
    return options.buttons[0].callback();
  };
  let saved = [];
  await UploadBatch([new File(["a"], "one.png"), new File(["b"], "two.png"), new File(["c"], "three.txt")],
    settings, true, "Maps", CreatePicker(saved), () => {});
  assert.equal(prompts, 1);
  assert.deepEqual(saved.map(file => file.name), ["shared_Maps.png", "shared_Maps-2.png", "shared_Maps.txt"]);
});

test("separate names are all collected before uploads and a later Cancel aborts ordinary files too", async () => {
  let settings = CreateManualSettings();
  settings.Groups[0].Rules[0].Regex = "png$";
  let saved = [], prompts = 0, reports = [];
  foundry.applications.api.DialogV2.wait = async options => {
    assert.equal(saved.length, 0);
    let form = MountDialog(options);
    prompts++;
    if (prompts === 1) form.querySelector('[name="Individual"]').checked = true;
    if (prompts === 3) return options.buttons[1].callback() ?? "cancel";
    form.querySelector('[name="Name"]').value = `chosen-${prompts}`;
    return options.buttons[0].callback();
  };
  let files = [new File(["ordinary"], "first.txt"), new File(["a"], "one.png"), new File(["b"], "two.png")];
  await UploadBatch(files, settings, true, "Maps", CreatePicker(saved), result => reports.push(result));
  assert.equal(prompts, 3);
  assert.deepEqual(saved, []);
  assert.deepEqual(reports, []);
  // Closing the first dialog also cancels the whole import.
  foundry.applications.api.DialogV2.wait = async () => null;
  await UploadBatch(files, settings, true, "Maps", CreatePicker(saved), () => assert.fail("Canceled"));
  assert.deepEqual(saved, []);
});

test("separate naming uses exact stems, skips batch extensions and rejects invalid input", async () => {
  let settings = CreateManualSettings();
  let prompts = 0, saved = [];
  foundry.applications.api.DialogV2.wait = async options => {
    let form = MountDialog(options);
    prompts++;
    let input = form.querySelector('[name="Name"]');
    input.value = "///";
    assert.throws(() => options.buttons[0].callback(), /valid filename/);
    input.value = `exact-${prompts}`;
    let checkbox = form.querySelector('[name="Individual"]');
    if (checkbox !== null) checkbox.checked = true;
    return options.buttons[0].callback();
  };
  await UploadBatch([new File(["a"], "one.png"), new File(["b"], "extensionless")], settings, true, "Maps", CreatePicker(saved), () => {});
  assert.equal(prompts, 3);
  assert.deepEqual(saved.map(file => file.name), ["exact-2.png", "exact-3"]);
});

test("manual names on clipboard imports preserve actual image conversion and macro scope", async () => {
  let settings = CreateManualSettings();
  settings.Groups[0].Rules[0].Cliponly = true;
  settings.Groups[0].Rules[0].Clipformat = "png";
  settings.Groups[0].Rules[0].Action.Macro = "Macro.test";
  foundry.applications.api.DialogV2.wait = async options => {
    let form = MountDialog(options);
    form.querySelector('[name="Name"]').value = "handout";
    return options.buttons[0].callback();
  };
  let macroScope;
  globalThis.fromUuid = async () => ({ documentName: "Macro", execute: async scope => { macroScope = scope; } });
  let saved = [];
  let png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "misleading.jpg", { type: "image/png" });
  await UploadBatch([png], settings, true, "Maps", CreatePicker(saved), () => {}, { Clipboard: true });
  assert.equal(saved[0].name, "handout.png");
  assert.equal(macroScope.file, saved[0]);
  assert.equal(macroScope.path, "maps/handout.png");
});
