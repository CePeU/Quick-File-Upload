import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { QFU_SETTINGS, QFU_ACTION_SETTINGS } from "../scripts/settings.js";
import { GenerateFileName, CreateNameService, ValidateNameSettings, FormatNameDate, HashNameBytes } from "../scripts/name-builder.js";
import { DetectImageType, ConvertImageBlob } from "../scripts/clipboard.js";
import { ResolveRouting, UploadBatch, ValidateSettings, SerializeSettings, ParseSettings } from "../scripts/core.js";
import { LocalizeText, CreateSettings } from "../testing/fixtures.js";

globalThis.game = { i18n: { localize: LocalizeText } };

test("portable SHA-256 fallback matches native hashes across padding and block boundaries", () => {
  for (let contentText of ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(1000)]) {
    assert.equal(HashNameBytes(new TextEncoder().encode(contentText)), createHash("sha256").update(contentText).digest("hex"));
  }
});

test("name library expands date patterns, random digits, group and content SHA-256", async () => {
  let dateValue = new Date(2024, 9, 2, 3, 4, 5);
  let contentBlob = new Blob(["abc"]);
  let nameSettings = { Base: "clipboard-image", Parts: [
    { Type: "separator", Value: "_" }, { Type: "date", Value: "YYYY-MM-DD_HH-mm-ss" },
    { Type: "separator", Value: "_" }, { Type: "random", Value: "4" },
    { Type: "separator", Value: "_" }, { Type: "group", Value: "" },
    { Type: "separator", Value: "_" }, { Type: "hash", Value: "" }
  ], Presets: [] };
  let generatedName = await GenerateFileName(nameSettings, { Date: dateValue, Group: "Images", Content: contentBlob });
  let contentHash = createHash("sha256").update("abc").digest("hex");
  assert.match(generatedName, new RegExp(`^clipboard-image_2024-10-02_03-04-05_[0-9]{4}_Images_${contentHash}$`));
  assert.equal(FormatNameDate(dateValue, "YY MMM", "en"), "24 Oct");
  assert.equal(await GenerateFileName({ Base: "", Parts: [], Presets: [] }, { Date: dateValue }), `clipboard_${Math.floor(dateValue.getTime() / 1000)}`);
  assert.equal(await GenerateFileName({ Base: "../\\map:*?", Parts: [], Presets: [] }), "map");
  assert.equal(await GenerateFileName({ Base: "CON", Parts: [], Presets: [] }), "_CON");
});

test("name library uses caller-owned read/write location and rejects unsafe token definitions", async () => {
  let savedSettings = { Base: "First", Parts: [], Presets: [] };
  let nameService = CreateNameService({ Location: "other-app/naming", Read: location => {
    assert.equal(location, "other-app/naming"); return savedSettings;
  }, Write: (location, nameSettings) => { assert.equal(location, "other-app/naming"); savedSettings = nameSettings; } });
  assert.equal(await nameService.GenerateName(), "First");
  let draftSettings = await nameService.ReadSettings();
  draftSettings.Base = "Second";
  assert.equal(await nameService.GenerateName(), "First");
  await nameService.SaveSettings(draftSettings);
  assert.equal(await nameService.GenerateName(), "Second");
  for (let tokenEntry of [{ Type: "unknown", Value: "" }, { Type: "random", Value: "0" }, { Type: "random", Value: "33" }, null]) {
    assert.throws(() => ValidateNameSettings({ Base: "", Parts: [tokenEntry], Presets: [] }));
  }
});

test("clipboard rules outrank ordinary rules and never receive ordinary files or defaults", () => {
  let moduleSettings = CreateSettings();
  let clipboardRule = { Name: "Clipboard", Regex: "", Limit: 0, Path: "", Default: false, Cliponly: true, Clipformat: "webp" };
  moduleSettings.Groups[1].Rules.push(clipboardRule);
  let sourceFile = new File(["text"], "image.png");
  let clipboardRoute = ResolveRouting(sourceFile, moduleSettings, true, "Images", { Clipboard: true });
  assert.equal(clipboardRoute.Rule, clipboardRule);
  assert.equal(clipboardRoute.Path, moduleSettings.Clippath);
  assert.equal(ResolveRouting(sourceFile, moduleSettings, true, "Images").Path, "uploads/small");
  // Group filtering and source regex/size conditions still apply.
  assert.equal(ResolveRouting(sourceFile, moduleSettings, false, "Images", { Clipboard: true }).Path, "uploads/small");
  clipboardRule.Regex = "png$";
  clipboardRule.Limit = 0.001;
  assert.equal(ResolveRouting(sourceFile, moduleSettings, true, "Images", { Clipboard: true }).Path, "uploads/small");
  moduleSettings.Clipoverride = true;
  assert.equal(ResolveRouting(sourceFile, moduleSettings, true, "Images", { Clipboard: true }).Path, moduleSettings.Clippath);
  clipboardRule.Limit = 0;
  assert.equal(ResolveRouting(sourceFile, moduleSettings, true, "Images", { Clipboard: true }).Rule, clipboardRule);
  moduleSettings.Groups[1].Excluded = true;
  assert.equal(ResolveRouting(sourceFile, moduleSettings, true, "Images", { Clipboard: true }).Rule, null);
  clipboardRule.Default = true;
  clipboardRule.Regex = "nomatch";
  moduleSettings.Groups[1].Rules = [clipboardRule];
  assert.equal(ResolveRouting(sourceFile, moduleSettings, false, "Sounds").Path, moduleSettings.Fallback);
  assert.equal(ResolveRouting(sourceFile, moduleSettings, false, "Sounds", { Clipboard: true }).Path, moduleSettings.Clippath);
});

test("clipboard settings and rule overrides survive export; malformed imports fail", () => {
  let moduleSettings = CreateSettings();
  moduleSettings.Clipoverride = true;
  moduleSettings.Clipformat = "jpg";
  moduleSettings.Clippath = "clipboard/images";
  Object.assign(moduleSettings.Groups[0].Rules[0], { Cliponly: true, Clipformat: "webp", Path: "" });
  assert.deepEqual(ParseSettings(SerializeSettings(moduleSettings)), moduleSettings);
  for (let invalidSettings of [
    { Clipformat: "gif" }, { Clipoverride: "true" }, { Clippath: "../escape" },
    { Clipname: { Base: "", Parts: [{ Type: "random", Value: "100" }], Presets: [] } }
  ]) assert.throws(() => ValidateSettings({ ...moduleSettings, ...invalidSettings }));
  moduleSettings.Groups[0].Rules[0].Cliponly = false;
  assert.throws(() => ValidateSettings(moduleSettings), /relative user-data folder/);
});

test("image detection uses magic bytes even with misleading names and MIME types", async () => {
  assert.equal(await DetectImageType(new File([new Uint8Array([137,80,78,71,13,10,26,10])], "wrong.jpg", { type: "image/jpeg" })), "image/png");
  assert.equal(await DetectImageType(new File([new Uint8Array([255,216,255])], "wrong.png", { type: "text/plain" })), "image/jpeg");
  assert.equal(await DetectImageType(new File(["RIFF1234WEBP"], "unknown.bin")), "image/webp");
  assert.equal(await DetectImageType(new File(["# markdown"], "note.txt", { type: "text/plain" })), "");
});

test("image conversion selects the encoder, flattens JPEG transparency and closes resources", async () => {
  let closeCount = 0, fillCount = 0, drawCount = 0;
  globalThis.createImageBitmap = async () => ({ width: 2, height: 3, close: () => closeCount++ });
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect: () => fillCount++, drawImage: () => drawCount++ }),
    toBlob: (callback, mimeType) => callback(new Blob(["encoded"], { type: mimeType })) }) };
  for (let mimeType of ["image/png", "image/webp", "image/jpeg"]) {
    assert.equal((await ConvertImageBlob(new Blob(), mimeType)).type, mimeType);
  }
  assert.equal(closeCount, 3);
  assert.equal(drawCount, 3);
  assert.equal(fillCount, 1);
  document.createElement = () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => callback(new Blob(["fallback PNG"], { type: "image/png" })) });
  await assert.rejects(ConvertImageBlob(new Blob(), "image/webp"), /could not be decoded/);
  assert.equal(closeCount, 4);
});

test("upload pipeline preprocesses clipboard action once, retains macros and continues after conversion failures", async () => {
  let moduleSettings = CreateSettings();
  moduleSettings.Clipname = { Base: "renamed", Parts: [{ Type: "separator", Value: "_" }, { Type: "group", Value: "" }], Presets: [] };
  moduleSettings.Clipformat = "webp";
  moduleSettings.Groups[0].Rules[0].Action = { ...QFU_ACTION_SETTINGS, Function: "clipboard", Macro: "Macro.test" };
  let actionCalls = [];
  globalThis.fromUuid = async () => ({ documentName: "Macro", execute: scope => actionCalls.push(scope) });
  globalThis.createImageBitmap = async () => { throw new Error("Corrupt image"); };
  let uploadedFiles = [], results = [];
  let filePicker = { browse: async () => ({}), upload: async (source, target, file) => {
    uploadedFiles.push(file); return { path: `${target}/${file.name}` };
  } };
  let imageFile = new File(["corrupt"], "source.png", { type: "image/png" });
  let textFile = new File(["# literal markdown"], "note.txt", { type: "text/plain" });
  await UploadBatch([imageFile, textFile], moduleSettings, false, "Images", filePicker, result => results.push(result), { Clipboard: true });
  assert.equal(results[0].Status, "Failed");
  assert.equal(uploadedFiles.length, 1);
  assert.equal(uploadedFiles[0].name, "renamed_Images.txt");
  assert.equal(await uploadedFiles[0].text(), "# literal markdown");
  // Ordinary local file receives clipboard defaults via the predefined action.
  moduleSettings.Clipformat = "png";
  let pngFile = new File([new Uint8Array([137,80,78,71,13,10,26,10])], "source.png", { type: "image/png" });
  await UploadBatch([pngFile], moduleSettings, false, "Images", filePicker, result => results.push(result));
  assert.equal(uploadedFiles.length, 2);
  assert.equal(uploadedFiles[1].name, "renamed_Images.png");
  assert.equal(actionCalls.length, 1);
  assert.equal(actionCalls[0].path, `${moduleSettings.Clippath}/renamed_Images.png`);
});
