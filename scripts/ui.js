
/* Apply persisted theme colors at the document root so both existing and new
 * settings windows inherit them. Fixed base rows remain independent of groups.
 */
export function ApplyRuleColors(moduleSettings) {
  document.documentElement.style.setProperty("--qu-rule-light", moduleSettings.Rulelight);
  document.documentElement.style.setProperty("--qu-rule-dark", moduleSettings.Ruledark);
}

// Use DOM nodes and textContent for user-controlled names, paths, and messages.
export class ContentApplication extends foundry.applications.api.ApplicationV2 {
  _replaceHTML(renderedContent, contentElement) { contentElement.replaceChildren(renderedContent); }
}

/* Create an HTMLElement from a tag string, optional class and plain text. */
export function CreateElement(tagName, className = "", textContent = "") {
  let newElement = document.createElement(tagName);
  newElement.className = className;
  newElement.textContent = textContent;
  return newElement;
}

/* Create a non-submit button with a label string and click callback function. */
export function CreateButton(buttonLabel, ClickHandler, className = "") {
  let buttonElement = CreateElement("button", className, buttonLabel);
  buttonElement.type = "button";
  buttonElement.addEventListener("click", ClickHandler);
  return buttonElement;
}

/* Return {Container,Input} for a labeled input. inputType is text, number,
 * color, or checkbox; fieldName and fieldLabel are strings; fieldValue is a
 * string, number or boolean. Checkbox values are assigned to checked.
 */
export function CreateField(fieldName, fieldLabel, fieldValue, inputType = "text") {
  let fieldContainer = CreateElement("label", "qu-field", fieldLabel);
  let inputElement = document.createElement("input");
  inputElement.name = fieldName;
  inputElement.type = inputType;
  if (inputType === "checkbox") inputElement.checked = fieldValue === true;
  else inputElement.value = String(fieldValue ?? "");
  fieldContainer.append(inputElement);
  return { Container: fieldContainer, Input: inputElement };
}

/* Add move-up, move-down, optional clone and delete buttons for an HTMLElement.
 * CloneHandler is a callback or null to omit cloning.
 * Returns the action bar. Removing/reordering nodes also reorders saved data.
 */
export function CreateOrdering(entryElement, CloneHandler = null) {
  let actionBar = CreateElement("div", "qu-row-actions");
  let earlierLabel = game.i18n.localize("QFU.MoveEarlier");
  // let earlierLabel = game.i18n.localize("Move earlier");
  let laterLabel = game.i18n.localize("QFU.MoveLater");
  // let laterLabel = game.i18n.localize("Move later");
  let deleteLabel = game.i18n.localize("QFU.DeleteEntry");
  // let deleteLabel = game.i18n.localize("Delete entry");
  let cloneButton = null;
  if (CloneHandler !== null) {
    let cloneLabel = game.i18n.localize("QFU.CloneEntry");
    // let cloneLabel = game.i18n.localize("Clone entry");
    cloneButton = CreateButton("⧉", CloneHandler, "qu-clone");
    cloneButton.title = cloneLabel;
    cloneButton.setAttribute("aria-label", cloneLabel);
  }
  let earlierButton = CreateButton("↑", () => {
    if (entryElement.previousElementSibling !== null) entryElement.previousElementSibling.before(entryElement);
  });
  let laterButton = CreateButton("↓", () => {
    if (entryElement.nextElementSibling !== null) entryElement.nextElementSibling.after(entryElement);
  });
  let deleteButton = CreateButton("×", () => entryElement.remove());
  for (let [buttonElement, buttonLabel] of [[earlierButton, earlierLabel], [laterButton, laterLabel], [deleteButton, deleteLabel]]) {
    buttonElement.title = buttonLabel;
    buttonElement.setAttribute("aria-label", buttonLabel);
    actionBar.append(buttonElement);
  }
  if (CloneHandler !== null) actionBar.insertBefore(cloneButton, actionBar.lastElementChild);
  return actionBar;
}

/* Append a heading and paragraph to an HTMLElement from plain text strings. */
export function AddSection(parentElement, sectionTitle, sectionText = "") {
  parentElement.append(CreateElement("h3", "", sectionTitle));
  if (sectionText.length > 0) parentElement.append(CreateElement("p", "", sectionText));
}
