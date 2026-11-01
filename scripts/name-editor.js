import { QFU_NAME_TYPES, ValidateNameSettings, GenerateFileName } from "./name-builder.js";
import { CreateElement, CreateButton, CreateField } from "./ui.js";

/* Label the six reusable token types through Foundry's localization boundary. */
export function GetTokenLabels() {
  return {
    date: game.i18n.localize("QFU.TokenDate"),
    // date: game.i18n.localize("Date / time"),
    separator: game.i18n.localize("QFU.TokenSeparator"),
    // separator: game.i18n.localize("Separator"),
    timestamp: game.i18n.localize("QFU.TokenTimestamp"),
    // timestamp: game.i18n.localize("Seconds since 1970"),
    random: game.i18n.localize("QFU.TokenRandom"),
    // random: game.i18n.localize("Random decimal digits"),
    hash: game.i18n.localize("QFU.TokenHash"),
    // hash: game.i18n.localize("SHA-256 of the saved content"),
    group: game.i18n.localize("QFU.TokenGroup")
    // group: game.i18n.localize("Active group name")
  };
}

/* Define a token in a modal v14 dialog. Cancel returns null; invalid input
 * keeps the definition open through native validation and localized errors.
 */
export async function DefineNameToken(tokenEntry = { Type: "separator", Value: "_" }) {
  let tokenLabels = GetTokenLabels();
  let contentElement = CreateElement("div", "qu-token-definition");
  let typeLabel = CreateElement("label", "", game.i18n.localize("QFU.TokenType"));
  // let typeLabel = CreateElement("label", "", game.i18n.localize("Token type"));
  let typeInput = document.createElement("select");
  typeInput.name = "Type";
  for (let tokenType of QFU_NAME_TYPES) {
    let optionElement = CreateElement("option", "", tokenLabels[tokenType]);
    optionElement.value = tokenType;
    typeInput.append(optionElement);
  }
  typeInput.value = tokenEntry.Type;
  typeLabel.append(typeInput);
  let valueField = CreateField("Value", game.i18n.localize("QFU.TokenValue"), tokenEntry.Value);
  // let valueField = CreateField("Value", game.i18n.localize("Pattern, separator or digit count"), tokenEntry.Value);
  valueField.Input.maxLength = 120;
  let hintText = game.i18n.localize("QFU.TokenValueHint");
  // let hintText = game.i18n.localize("Date: YYYY, YY, MM, MMM, DD, HH, mm, ss or combinations like YYYY-MM-DD. Random: 1–32 digits. Separator: any filename-safe text. Other types need no value.");
  let errorElement = CreateElement("p", "qu-validation");
  contentElement.append(typeLabel, valueField.Container, CreateElement("p", "", hintText), errorElement);
  function UpdateInput() {
    valueField.Input.disabled = ["timestamp", "hash", "group"].includes(typeInput.value);
    valueField.Input.type = "text";
    valueField.Input.required = typeInput.value === "date" || typeInput.value === "random";
    valueField.Input.removeAttribute("pattern");
    if (typeInput.value === "random") valueField.Input.pattern = "(?:[1-9]|[12][0-9]|3[0-2])";
  }
  typeInput.addEventListener("change", () => {
    if (typeInput.value === "random") valueField.Input.value = "4";
    if (typeInput.value === "date") valueField.Input.value = "YYYY-MM-DD";
    UpdateInput();
  });
  UpdateInput();
  let dialogTitle = game.i18n.localize("QFU.EditNameToken");
  // let dialogTitle = game.i18n.localize("Define name extension");
  return foundry.applications.api.DialogV2.prompt({
    window: { title: dialogTitle }, content: '<div class="qu-token-host"></div>', modal: true, rejectClose: false,
    // DialogV2 serializes content; mount the live controls after rendering so
    // event listeners and current DOM input properties remain intact in v14.
    render: (renderEvent, dialogApp) => {
      dialogApp.element.querySelector(".qu-token-host").replaceChildren(contentElement);
      let dialogForm = contentElement.closest("form");
      dialogForm.addEventListener("click", clickEvent => {
        if (clickEvent.target.closest('[data-action="ok"]') !== null && dialogForm.reportValidity() === false) {
          clickEvent.preventDefault();
          clickEvent.stopImmediatePropagation();
        }
      }, { capture: true });
    },
    ok: { callback: () => {
      let editedToken = { Type: typeInput.value, Value: valueField.Input.value };
      if (valueField.Input.disabled === true) editedToken.Value = "";
      try { ValidateNameSettings({ Base: "", Parts: [editedToken], Presets: [] }); }
      catch {
        errorElement.textContent = game.i18n.localize("QFU.InvalidClipboard");
        // errorElement.textContent = game.i18n.localize("Check the clipboard image format, naming tokens and default routing option.");
        throw new Error(errorElement.textContent);
      }
      return editedToken;
    } }
  });
}

/* Modal name builder backed by caller-supplied {Read, Write, Location}.
 * Read(location) returns the draft configuration; Write(location, settings)
 * applies only on Apply. Presets and active tokens are independent copies.
 * Returns the DialogV2 promise; Cancel leaves caller storage unchanged.
 */
export async function OpenNameEditor({ Read, Write, Location }) {
  let nameSettings = ValidateNameSettings(await Read(Location));
  let tokenLabels = GetTokenLabels();
  let contentElement = CreateElement("div", "qu-name-editor");
  let baseField = CreateField("Base", game.i18n.localize("QFU.NameBase"), nameSettings.Base);
  // let baseField = CreateField("Base", game.i18n.localize("Base filename (without extension)"), nameSettings.Base);
  baseField.Input.maxLength = 120;
  let builderHint = game.i18n.localize("QFU.NameBuilderHint");
  // let builderHint = game.i18n.localize("Drag available tokens into the filename, then drag to reorder. Double-click to define a token. Plus adds a definition; trash removes it. Arrow and add buttons also work without dragging. Preview uses sample content for the hash; the extension is added at import.");
  let listContainer = CreateElement("div", "qu-name-columns");
  let previewElement = CreateElement("output", "qu-name-preview");
  previewElement.setAttribute("aria-live", "polite");
  let errorElement = CreateElement("p", "qu-validation");
  let draggedToken = null;
  let previewNumber = 0;
  async function UpdatePreview() {
    let currentNumber = ++previewNumber;
    nameSettings.Base = baseField.Input.value;
    try {
      let generatedName = await GenerateFileName(nameSettings, { Group: "Group", Content: new Blob(["Preview"]) });
      if (currentNumber === previewNumber) previewElement.textContent = generatedName;
    } catch {
      if (currentNumber === previewNumber) previewElement.textContent = "";
    }
  }
  function ShowEditorError() {
    errorElement.textContent = game.i18n.localize("QFU.InvalidClipboard");
    // errorElement.textContent = game.i18n.localize("Check the clipboard image format, naming tokens and default routing option.");
  }
  async function EditToken(listName, tokenIndex) {
    try {
      let editedToken = await DefineNameToken(nameSettings[listName][tokenIndex]);
      if (editedToken === null || contentElement.isConnected === false) return;
      nameSettings[listName][tokenIndex] = editedToken;
      RenderLists();
    } catch { ShowEditorError(); }
  }
  function DropToken(dropEvent, targetIndex) {
    dropEvent.preventDefault();
    dropEvent.stopPropagation();
    if (draggedToken === null || dropEvent.dataTransfer?.getData("text/plain") !== "qfu-name-token") return;
    let tokenEntry = structuredClone(nameSettings[draggedToken.List][draggedToken.Index]);
    if (draggedToken.List === "Parts") {
      nameSettings.Parts.splice(draggedToken.Index, 1);
      if (draggedToken.Index < targetIndex) targetIndex--;
    } else if (nameSettings.Parts.length >= 64) return;
    nameSettings.Parts.splice(targetIndex, 0, tokenEntry);
    draggedToken = null;
    RenderLists();
  }
  function RenderLists() {
    listContainer.replaceChildren();
    for (let listName of ["Presets", "Parts"]) {
      let listPanel = CreateElement("section");
      let listTitle = game.i18n.localize("QFU.NamePresets");
      // let listTitle = game.i18n.localize("Available extensions");
      if (listName === "Parts") {
        listTitle = game.i18n.localize("QFU.NameParts");
        // listTitle = game.i18n.localize("Filename extensions in order");
      }
      let tokenList = CreateElement("ol", "qu-name-tokens");
      tokenList.dataset.list = listName;
      if (listName === "Parts") {
        tokenList.addEventListener("dragover", dragEvent => { if (draggedToken !== null) dragEvent.preventDefault(); });
        tokenList.addEventListener("drop", dropEvent => DropToken(dropEvent, nameSettings.Parts.length));
      }
      nameSettings[listName].forEach((tokenEntry, tokenIndex) => {
        let tokenRow = CreateElement("li", "qu-name-token");
        tokenRow.draggable = true;
        tokenRow.append(CreateElement("span", "", `${tokenLabels[tokenEntry.Type]} ${tokenEntry.Value}`));
        tokenRow.addEventListener("dragstart", dragEvent => {
          draggedToken = { List: listName, Index: tokenIndex };
          dragEvent.dataTransfer.setData("text/plain", "qfu-name-token");
          dragEvent.dataTransfer.effectAllowed = "copyMove";
        });
        tokenRow.addEventListener("dragend", () => { draggedToken = null; });
        if (listName === "Parts") {
          tokenRow.addEventListener("dragover", dragEvent => { if (draggedToken !== null) dragEvent.preventDefault(); });
          tokenRow.addEventListener("drop", dropEvent => DropToken(dropEvent, tokenIndex));
        }
        tokenRow.addEventListener("dblclick", tokenEvent => {
          if (tokenEvent.target.closest("button") === null) EditToken(listName, tokenIndex);
        });
        let editLabel = game.i18n.localize("QFU.EditNameToken");
        // let editLabel = game.i18n.localize("Define name extension");
        let editButton = CreateButton("", () => EditToken(listName, tokenIndex));
        editButton.append(CreateElement("i", "fa-solid fa-pen"));
        editButton.title = editLabel;
        editButton.setAttribute("aria-label", editLabel);
        tokenRow.append(editButton);
        if (listName === "Presets") {
          let addLabel = game.i18n.localize("QFU.UseNameToken");
          // let addLabel = game.i18n.localize("Add to filename");
          tokenRow.append(CreateButton(addLabel, () => {
            if (nameSettings.Parts.length >= 64) return;
            nameSettings.Parts.push(structuredClone(tokenEntry));
            RenderLists();
          }));
        } else {
          for (let directionValue of [-1, 1]) {
            let moveLabel = game.i18n.localize("QFU.MoveEarlier");
            // let moveLabel = game.i18n.localize("Move earlier");
            let buttonIcon = "fa-solid fa-arrow-up";
            if (directionValue === 1) {
              moveLabel = game.i18n.localize("QFU.MoveLater");
              // moveLabel = game.i18n.localize("Move later");
              buttonIcon = "fa-solid fa-arrow-down";
            }
            let moveButton = CreateButton("", () => {
              let targetIndex = tokenIndex + directionValue;
              if (targetIndex < 0 || targetIndex >= nameSettings.Parts.length) return;
              nameSettings.Parts.splice(targetIndex, 0, nameSettings.Parts.splice(tokenIndex, 1)[0]);
              RenderLists();
            });
            moveButton.append(CreateElement("i", buttonIcon));
            moveButton.title = moveLabel;
            moveButton.setAttribute("aria-label", moveLabel);
            tokenRow.append(moveButton);
          }
        }
        let deleteLabel = game.i18n.localize("QFU.DeleteEntry");
        // let deleteLabel = game.i18n.localize("Delete entry");
        let deleteButton = CreateButton("", () => { nameSettings[listName].splice(tokenIndex, 1); RenderLists(); });
        deleteButton.append(CreateElement("i", "fa-solid fa-trash"));
        deleteButton.title = deleteLabel;
        deleteButton.setAttribute("aria-label", deleteLabel);
        tokenRow.append(deleteButton);
        tokenList.append(tokenRow);
      });
      let plusLabel = game.i18n.localize("QFU.AddNameToken");
      // let plusLabel = game.i18n.localize("Add definition");
      listPanel.append(CreateElement("h3", "", listTitle), tokenList, CreateButton(`+ ${plusLabel}`, async () => {
        try {
          if (nameSettings[listName].length >= 64) return;
          let tokenEntry = await DefineNameToken();
          if (tokenEntry === null || contentElement.isConnected === false) return;
          nameSettings[listName].push(tokenEntry);
          RenderLists();
        } catch { ShowEditorError(); }
      }));
      listContainer.append(listPanel);
    }
    UpdatePreview();
  }
  baseField.Input.addEventListener("input", UpdatePreview);
  contentElement.append(baseField.Container, CreateElement("p", "", builderHint), listContainer, previewElement, errorElement);
  RenderLists();
  let editorTitle = game.i18n.localize("QFU.NameBuilder");
  // let editorTitle = game.i18n.localize("Clipboard filename builder");
  return foundry.applications.api.DialogV2.wait({
    window: { title: editorTitle, resizable: true }, classes: ["quick-upload", "qu-settings", "qu-name-dialog"],
    position: { width: 900, height: 650 }, modal: true, content: '<div class="qu-name-host"></div>', rejectClose: false,
    render: (renderEvent, dialogApp) => dialogApp.element.querySelector(".qu-name-host").replaceChildren(contentElement),
    buttons: [{ action: "apply", label: game.i18n.localize("QFU.ApplyDraft"), callback: async () => {
      // buttons: [{ action: "apply", label: game.i18n.localize("Apply to settings draft"), callback: async () => {
      nameSettings.Base = baseField.Input.value;
      await Write(Location, ValidateNameSettings(nameSettings));
    } }, { action: "cancel", label: game.i18n.localize("QFU.CancelButton") }]
    // } }, { action: "cancel", label: game.i18n.localize("Cancel") }]
  });
}
