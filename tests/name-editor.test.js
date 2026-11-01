import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { LocalizeText } from "../testing/fixtures.js";
import { QFU_SETTINGS } from "../scripts/settings.js";

let browserWindow = new JSDOM("<!doctype html><body></body>").window;
globalThis.document = browserWindow.document;
globalThis.game = { i18n: { localize: LocalizeText } };
globalThis.foundry = { applications: { api: { ApplicationV2: class {} } } };
let { OpenNameEditor } = await import("../scripts/name-editor.js");

// Emulate v14's content serialization plus its render callback. In particular,
// tests must not accidentally preserve event listeners on serialized content.
function RenderDialog(dialogOptions) {
  let formElement = document.createElement("form");
  formElement.innerHTML = dialogOptions.content;
  document.body.append(formElement);
  dialogOptions.render({}, { element: formElement });
  return formElement;
}

function DispatchDrag(targetElement, eventName, transferData) {
  let dragEvent = new browserWindow.Event(eventName, { bubbles: true, cancelable: true });
  Object.defineProperty(dragEvent, "dataTransfer", { value: transferData });
  targetElement.dispatchEvent(dragEvent);
}

test("modal naming editor copies presets, reorders via drag/drop and applies only its draft", async () => {
  let nameSettings = structuredClone(QFU_SETTINGS.Clipname);
  nameSettings.Parts = [];
  let writeCount = 0;
  foundry.applications.api.DialogV2 = { wait: async dialogOptions => {
    assert.equal(dialogOptions.modal, true);
    let formElement = RenderDialog(dialogOptions);
    let transferValues = new Map();
    let transferData = { setData: (key, value) => transferValues.set(key, value), getData: key => transferValues.get(key) };
    let sourceToken = formElement.querySelector('[data-list="Presets"] li');
    DispatchDrag(sourceToken, "dragstart", transferData);
    DispatchDrag(formElement.querySelector('[data-list="Parts"]'), "drop", transferData);
    assert.equal(formElement.querySelectorAll('[data-list="Parts"] li').length, 1);
    assert.equal(formElement.querySelectorAll('[data-list="Presets"] li').length, nameSettings.Presets.length);
    // The add button is a keyboard-accessible alternative to dragging.
    formElement.querySelectorAll('[data-list="Presets"] li')[1].querySelectorAll("button")[1].click();
    let partRows = formElement.querySelectorAll('[data-list="Parts"] li');
    DispatchDrag(partRows[1], "dragstart", transferData);
    DispatchDrag(partRows[0], "drop", transferData);
    assert.match(formElement.querySelector('[data-list="Parts"] li').textContent, /MM/);
    formElement.querySelector('[name="Base"]').value = "new-name";
    await dialogOptions.buttons[0].callback();
    formElement.remove();
    return "apply";
  } };
  await OpenNameEditor({ Location: "Naming", Read: () => nameSettings, Write: (location, draftSettings) => {
    assert.equal(location, "Naming"); writeCount++; nameSettings = draftSettings;
  } });
  assert.equal(writeCount, 1);
  assert.equal(nameSettings.Base, "new-name");
  assert.deepEqual(nameSettings.Parts, [{ Type: "date", Value: "MM" }, { Type: "date", Value: "YYYY" }]);
});

test("token definitions mount live controls, support double-click editing and cancel safely", async () => {
  let nameSettings = structuredClone(QFU_SETTINGS.Clipname);
  nameSettings.Parts = [{ Type: "random", Value: "4" }];
  let promptCount = 0;
  foundry.applications.api.DialogV2 = {
    prompt: async dialogOptions => {
      promptCount++;
      assert.equal(dialogOptions.modal, true);
      let formElement = RenderDialog(dialogOptions);
      let typeInput = formElement.querySelector('[name="Type"]');
      typeInput.value = "date";
      typeInput.dispatchEvent(new browserWindow.Event("change"));
      assert.equal(formElement.querySelector('[name="Value"]').value, "YYYY-MM-DD");
      typeInput.value = "random";
      typeInput.dispatchEvent(new browserWindow.Event("change"));
      let valueInput = formElement.querySelector('[name="Value"]');
      valueInput.value = "33";
      assert.equal(valueInput.checkValidity(), false);
      valueInput.value = "8";
      let editedToken = dialogOptions.ok.callback();
      formElement.remove();
      return editedToken;
    },
    wait: async dialogOptions => {
      let formElement = RenderDialog(dialogOptions);
      formElement.querySelector('[data-list="Parts"] li span').dispatchEvent(new browserWindow.Event("dblclick", { bubbles: true }));
      await new Promise(resolveTick => setImmediate(resolveTick));
      assert.match(formElement.querySelector('[data-list="Parts"] li').textContent, /8/);
      assert.equal(promptCount, 1);
      // Trash removes the selected token but leaves the source preset available.
      let tokenRow = formElement.querySelector('[data-list="Parts"] li');
      Array.from(tokenRow.querySelectorAll("button")).at(-1).click();
      assert.equal(formElement.querySelectorAll('[data-list="Parts"] li').length, 0);
      formElement.remove();
      return null;
    }
  };
  let originalSettings = structuredClone(nameSettings);
  await OpenNameEditor({ Location: "Naming", Read: () => nameSettings, Write: () => assert.fail("Cancel must not save") });
  assert.deepEqual(nameSettings, originalSettings);
});
