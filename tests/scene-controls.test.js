import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { RegisterActionControl, BindActionControl } from "../scripts/scene-controls.js";

test("v13 main control survives Foundry empty-tools cleanup and repeated render/click cycles", () => {
  let options = { Identifier: "other-module", Title: "Other", Icon: "fa-cloud", Placement: "main", Parent: "tokens", Order: 0 };
  let calls = 0;
  let open = () => calls++;
  let controls = {};
  RegisterActionControl(controls, options, open, 13);
  // Reproduce v13's cleanup, which previously removed the entire control.
  for (let [id, control] of Object.entries(controls)) {
    for (let [toolId, tool] of Object.entries(control.tools)) {
      if (tool.visible === false) delete control.tools[toolId];
    }
    if (Object.keys(control.tools).length === 0) delete controls[id];
  }
  assert.ok(controls[options.Identifier]);
  let document = new JSDOM('<section><menu><li><button data-action="control" data-control="other-module"></button></li></menu></section>').window.document;
  let root = document.querySelector("section"), button = document.querySelector("button");
  let selections = 0;
  root.addEventListener("click", () => selections++);
  BindActionControl(root, options.Identifier, open);
  BindActionControl(root, options.Identifier, open);
  button.click();
  button.click();
  assert.equal(calls, 2);
  assert.equal(selections, 0);
  controls = {};
  RegisterActionControl(controls, options, open, 14);
  assert.deepEqual(controls[options.Identifier].tools, {});
});

test("submenus and main-sub remain action tools on both generations", () => {
  for (let generation of [13, 14]) {
    let options = { Identifier: "example", Title: "Example", Icon: "fa-cloud", Placement: "sub", Parent: "tokens", Order: -1 };
    let calls = 0, open = () => calls++;
    let controls = { tokens: { tools: {} } };
    RegisterActionControl(controls, options, open, generation);
    assert.equal(controls.example, undefined);
    controls.tokens.tools.example.onChange();
    options.Placement = "main-sub";
    RegisterActionControl(controls, options, open, generation);
    assert.equal(controls.example.onChange, undefined);
    controls.example.tools.example.onChange();
    assert.equal(calls, 2);
  }
});
