import { CleanNamePart, GenerateFileName, SanitizeFileName } from "./name-builder.js";

/* Prompt for a filename stem. entryData contains File and Group. batchFlag true
 * offers a shared base name and a per-file checkbox; false edits one full stem.
 * Returns {Name, Individual}, or null when Cancel/close dismisses the modal.
 */
export async function PromptManualName(entryData, nameSettings, batchFlag) {
  let contentElement = document.createElement("div");
  let fileLabel = document.createElement("p");
  fileLabel.textContent = entryData.File.name;
  let nameLabel = document.createElement("label");
  nameLabel.textContent = game.i18n.localize("QFU.ManualName");
  // nameLabel.textContent = game.i18n.localize("Filename without extension");
  let nameInput = document.createElement("input");
  nameInput.name = "Name";
  nameInput.type = "text";
  nameInput.required = true;
  nameInput.maxLength = 220;
  nameInput.value = entryData.File.name.replace(/\.[^.]+$/, "");
  if (batchFlag === true) {
    nameInput.maxLength = 120;
    nameInput.value = nameSettings.Base;
  }
  nameLabel.append(nameInput);
  let copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = game.i18n.localize("QFU.ManualCopy");
  // copyButton.textContent = game.i18n.localize("Use clipboard naming scheme");
  let namingContext = { Group: entryData.Group ?? "", Content: entryData.File, Locale: game.i18n.lang ?? "en" };
  function ValidateInput() {
    let errorText = "";
    if (CleanNamePart(nameInput.value).length === 0) {
      errorText = game.i18n.localize("QFU.ManualInvalid");
      // errorText = game.i18n.localize("Enter a valid filename.");
    }
    nameInput.setCustomValidity(errorText);
  }
  nameInput.addEventListener("input", ValidateInput);
  copyButton.addEventListener("click", async () => {
    copyButton.disabled = true;
    try {
      if (batchFlag === true) nameInput.value = nameSettings.Base;
      else nameInput.value = await GenerateFileName(nameSettings, namingContext);
      ValidateInput();
    } catch (namingError) {
      ui.notifications.error(namingError.message);
    } finally { copyButton.disabled = false; }
  });
  let individualInput = document.createElement("input");
  individualInput.name = "Individual";
  individualInput.type = "checkbox";
  contentElement.append(fileLabel, nameLabel, copyButton);
  if (batchFlag === true) {
    let individualLabel = document.createElement("label");
    individualLabel.textContent = game.i18n.localize("QFU.ManualIndividual");
    // individualLabel.textContent = game.i18n.localize("Name each file separately");
    individualLabel.prepend(individualInput);
    let batchHint = document.createElement("p");
    batchHint.textContent = game.i18n.localize("QFU.ManualBatchHint");
    // batchHint.textContent = game.i18n.localize("The shared base receives the clipboard naming extensions for each file. With separate naming, confirm this base to continue to each file.");
    contentElement.append(individualLabel, batchHint);
  }
  ValidateInput();
  let dialogResult = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("QFU.Choice_manual") },
    // window: { title: game.i18n.localize("Manual naming") },
    content: '<div class="qu-manual-host"></div>', modal: true, rejectClose: false,
    render: (renderEvent, dialogApp) => {
      dialogApp.element.querySelector(".qu-manual-host").replaceChildren(contentElement);
      let dialogForm = contentElement.closest("form");
      dialogForm.addEventListener("click", clickEvent => {
        if (clickEvent.target.closest('[data-action="ok"]') !== null && dialogForm.reportValidity() === false) {
          clickEvent.preventDefault();
          clickEvent.stopImmediatePropagation();
        }
      }, { capture: true });
      nameInput.focus();
      nameInput.select();
    },
    buttons: [
      { action: "ok", label: game.i18n.localize("QFU.ManualOk"), default: true, callback: () => {
        // label: game.i18n.localize("OK – start import"),
        ValidateInput();
        if (nameInput.checkValidity() === false) throw new Error(nameInput.validationMessage);
        return { Name: nameInput.value, Individual: individualInput.checked };
      } },
      { action: "cancel", label: game.i18n.localize("QFU.Cancel"), type: "button", callback: () => null }
      // { action: "cancel", label: game.i18n.localize("Cancel"), type: "button", callback: () => null }
    ]
  });
  if (typeof dialogResult !== "object" || dialogResult === null) return null;
  return dialogResult;
}

/* Collect all manual names before any server writes. entries contain File and
 * Group; batchFlag indicates more than one source file in the complete import.
 * Returns Map<File, stem>, or null to cancel the entire batch.
 */
export async function CollectManualNames(manualEntries, nameSettings, batchFlag) {
  let manualNames = new Map();
  if (manualEntries.length === 0) return manualNames;
  let firstEntry = manualEntries[0];
  let sharedChoice = await PromptManualName(firstEntry, nameSettings, batchFlag);
  if (sharedChoice === null) return null;
  for (let entryData of manualEntries) {
    let nameText = sharedChoice.Name;
    if (batchFlag === true && sharedChoice.Individual === true) {
      let fileChoice = await PromptManualName(entryData, { ...nameSettings, Base: sharedChoice.Name }, false);
      if (fileChoice === null) return null;
      nameText = fileChoice.Name;
    } else if (batchFlag === true) {
      nameText = await GenerateFileName({ ...nameSettings, Base: sharedChoice.Name }, {
        Group: entryData.Group ?? "", Content: entryData.File, Locale: game.i18n.lang ?? "en"
      });
    }
    manualNames.set(entryData.File, SanitizeFileName(nameText));
  }
  return manualNames;
}
