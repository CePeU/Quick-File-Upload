/* Insert a control at positionIndex (-1 last, 0 first, otherwise indexed).
 * Mutates the record and Foundry order properties; has no module dependencies.
 */
export function InsertControl(controlRecord, controlName, controlValue, positionIndex) {
  let orderedEntries = Object.entries(controlRecord).filter(([entryName]) => entryName !== controlName)
    .sort((firstEntry, secondEntry) => (firstEntry[1].order ?? 0) - (secondEntry[1].order ?? 0));
  let insertIndex = Math.min(positionIndex, orderedEntries.length);
  if (positionIndex === -1) insertIndex = orderedEntries.length;
  orderedEntries.splice(insertIndex, 0, [controlName, controlValue]);
  orderedEntries.forEach(([entryName, controlEntry], entryIndex) => { controlEntry.order = entryIndex; controlRecord[entryName] = controlEntry; });
}

/* Register a reusable action control. Options: Identifier, Title, Icon, Placement
 * (main, main-sub, sub), Parent, Order. OpenHandler opens the caller's app.
 * generationNumber is 13 or 14; v13 removes controls with empty tools records.
 */
export function RegisterActionControl(controlRecord, controlOptions, OpenHandler, generationNumber) {
  let controlName = controlOptions.Identifier;
  let uploadTool = {
    name: controlName, title: controlOptions.Title, icon: controlOptions.Icon,
    button: true, visible: true, onChange: OpenHandler
  };
  if (controlOptions.Placement === "sub" && controlRecord[controlOptions.Parent] !== undefined) {
    controlRecord[controlOptions.Parent].tools ??= {};
    InsertControl(controlRecord[controlOptions.Parent].tools, controlName, uploadTool, controlOptions.Order);
    return;
  }
  let mainControl = { name: controlName, title: controlOptions.Title, icon: controlOptions.Icon, visible: true, tools: {} };
  if (controlOptions.Placement === "main-sub" || generationNumber === 13) {
    // Keep one real tool for v13's cleanup. Direct main clicks are intercepted
    // before selection, so this compatibility tool does not open a submenu.
    mainControl.tools[controlName] = { ...uploadTool, order: 0 };
  }
  if (controlOptions.Placement !== "main-sub") {
    mainControl.onChange = (controlEvent, activeFlag) => { if (activeFlag === true) return OpenHandler(); };
  }
  InsertControl(controlRecord, controlName, mainControl, controlOptions.Order);
}

/* Bind a direct main action after each render. Repeated binding replaces the
 * handler, and repeated clicks never select an empty tool palette.
 */
export function BindActionControl(rootElement, controlName, OpenHandler) {
  let controlButton = Array.from(rootElement.querySelectorAll("[data-control]"))
    .find(buttonElement => buttonElement.dataset.control === controlName);
  if (controlButton === undefined) return;
  controlButton.onclick = controlEvent => {
    controlEvent.preventDefault();
    controlEvent.stopImmediatePropagation();
    OpenHandler();
  };
}
