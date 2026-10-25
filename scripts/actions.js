import { QFU_ACTION_SETTINGS } from "./settings.js";
import { SortEntries } from "./sorting.js";

/* Validate global action defaults and an optional per-rule action object. */
export function ValidateActions(moduleSettings, actionSettings = QFU_ACTION_SETTINGS) {
  if (typeof moduleSettings.Clipboard !== "boolean" || typeof moduleSettings.Journalprompt !== "boolean"
    || typeof moduleSettings.Audienceprompt !== "boolean" || typeof moduleSettings.Journal !== "string"
    || typeof moduleSettings.Journaluuids !== "string" || typeof moduleSettings.Journalpattern !== "string"
    || typeof moduleSettings.Journalsort !== "boolean"
    || typeof moduleSettings.Users !== "string" || ["all", "playersonly", "observer", "selected", "choose"].includes(moduleSettings.Audience) === false
    || ["none", "chat", "players"].includes(moduleSettings.Display) === false
    || actionSettings === null || typeof actionSettings !== "object" || typeof actionSettings.Macro !== "string"
    || typeof actionSettings.Before !== "boolean" || ["none", "chat", "image", "journalimage", "journaltext", "choose"].includes(actionSettings.Function) === false) {
    throw new Error(game.i18n.localize("QFU.InvalidAction"));
    // throw new Error(game.i18n.localize("Check the upload action settings."));
  }
  CompileJournal(moduleSettings.Journalpattern);
}

/* Compile a plain or /pattern/flags journal-name filter, blank means no regex. */
export function CompileJournal(patternText) {
  if (patternText.trim().length === 0) return null;
  let literalMatch = patternText.match(/^\/(.*)\/([a-z]*)$/s);
  if (literalMatch !== null) return new RegExp(literalMatch[1], literalMatch[2]);
  return new RegExp(patternText);
}

/* Return editable journals selected by explicit UUID OR name regex. Explicit
 * UUIDs may refer to compendium journals; ownership is always respected.
 */
export async function FilterJournals(moduleSettings) {
  let journalUuids = [...new Set((moduleSettings.Journaluuids ?? "").split(/[;,]/).map(uuidText => uuidText.trim()).filter(uuidText => uuidText.length > 0))];
  let journalPattern = CompileJournal(moduleSettings.Journalpattern ?? "");
  let journalEntries = game.journal.filter(journalEntry => journalEntry.isOwner === true);
  for (let journalUuid of journalUuids) {
    if (journalEntries.some(journalEntry => journalEntry.uuid === journalUuid) === true) continue;
    try {
      let journalEntry = await fromUuid(journalUuid);
      if (journalEntry?.documentName === "JournalEntry" && journalEntry.isOwner === true) journalEntries.push(journalEntry);
    } catch {
      // An unresolved explicit UUID must not hide other matching journals.
    }
  }
  let filteredEntries = journalEntries.filter(journalEntry => {
    if (journalUuids.length === 0 && journalPattern === null) return true;
    if (journalUuids.includes(journalEntry.uuid) === true) return true;
    if (journalPattern === null) return false;
    journalPattern.lastIndex = 0;
    return journalPattern.test(journalEntry.name);
  });
  if (moduleSettings.Journalsort === true) return SortEntries(filteredEntries, journalEntry => journalEntry.name);
  let explicitEntries = journalUuids.map(journalUuid => filteredEntries.find(journalEntry => journalEntry.uuid === journalUuid))
    .filter(journalEntry => journalEntry !== undefined);
  let remainingEntries = filteredEntries.filter(journalEntry => journalUuids.includes(journalEntry.uuid) === false);
  return [...explicitEntries, ...SortEntries(remainingEntries, journalEntry => journalEntry.name)];
}

/* Escape untrusted text before composing chat or dialog HTML. */
export function EscapeMarkup(textValue) {
  return String(textValue).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/* Select named entries using a cancellable v14 dialog. multipleFlag true
 * permits multiple recipients; false selects one entry. preserveOrder true
 * retains the preordered journal list; false sorts by visible localized name.
 */
export async function SelectEntries(entryList, selectedValues, multipleFlag, titleText, preserveOrder = false) {
  let selectElement = document.createElement("select");
  selectElement.name = "Selection";
  selectElement.multiple = multipleFlag;
  let orderedEntries = entryList;
  if (preserveOrder === false) orderedEntries = SortEntries(entryList, entryData => entryData.Name);
  for (let entryData of orderedEntries) {
    let optionElement = document.createElement("option");
    optionElement.value = entryData.Identifier;
    optionElement.textContent = entryData.Name;
    optionElement.selected = selectedValues.includes(entryData.Identifier);
    if (optionElement.selected === true) optionElement.setAttribute("selected", "");
    selectElement.append(optionElement);
  }
  return foundry.applications.api.DialogV2.prompt({
    window: { title: titleText }, content: selectElement.outerHTML, rejectClose: false,
    ok: { callback: (eventData, buttonElement, dialogApp) => Array.from(dialogApp.element.querySelector("select").selectedOptions, optionElement => optionElement.value) }
  });
}

/* Resolve recipient defaults. Observer uses ownership on the selected journal;
 * for standalone images the configured journal supplies the permission context.
 */
export async function ResolveAudience(moduleSettings, journalEntry) {
  let audienceMode = moduleSettings.Audience;
  if (audienceMode === "choose") {
    let choiceTitle = game.i18n.localize("QFU.SelectAudience");
    // let choiceTitle = game.i18n.localize("Choose recipient permissions");
    let audienceChoices = [
      { Identifier: "all", Name: game.i18n.localize("QFU.Choice_all") },
      // { Identifier: "all", Name: game.i18n.localize("All players and GMs") },
      { Identifier: "playersonly", Name: game.i18n.localize("QFU.Choice_playersonly") },
      // { Identifier: "playersonly", Name: game.i18n.localize("All players") },
      { Identifier: "observer", Name: game.i18n.localize("QFU.Choice_observer") },
      // { Identifier: "observer", Name: game.i18n.localize("Journal Observers and Owners") },
      { Identifier: "selected", Name: game.i18n.localize("QFU.Choice_selected") }
      // { Identifier: "selected", Name: game.i18n.localize("Selected users") }
    ];
    let chosenModes = await SelectEntries(audienceChoices, ["all"], false, choiceTitle);
    if (chosenModes === null || chosenModes.length === 0) return null;
    audienceMode = chosenModes[0];
  }
  let playerUsers = game.users.filter(() => true);
  let selectedUsers = moduleSettings.Users.split(",").map(userIdentifier => userIdentifier.trim());
  if (audienceMode === "all") selectedUsers = playerUsers.map(userEntry => userEntry.id);
  if (audienceMode === "playersonly") selectedUsers = playerUsers.filter(userEntry => userEntry.isGM === false).map(userEntry => userEntry.id);
  if (audienceMode === "observer") {
    if (journalEntry === null) throw new Error(game.i18n.localize("QFU.ObserverJournal"));
    // if (journalEntry === null) throw new Error(game.i18n.localize("Select a reference journal for Observer permissions."));
    selectedUsers = playerUsers.filter(userEntry => journalEntry.testUserPermission(userEntry, "OBSERVER") === true).map(userEntry => userEntry.id);
  }
  if (moduleSettings.Audienceprompt === true) {
    let titleText = game.i18n.localize("QFU.Recipients");
    // let titleText = game.i18n.localize("Image / journal recipients");
    return SelectEntries(playerUsers.map(userEntry => ({ Identifier: userEntry.id, Name: userEntry.name })), selectedUsers, true, titleText);
  }
  return playerUsers.filter(userEntry => selectedUsers.includes(userEntry.id)).map(userEntry => userEntry.id);
}

/* Execute a resolved Macro UUID with a file/path/rule scope after upload. */
export async function ExecuteMacro(uploadFile, savedPath, actionSettings) {
  if (actionSettings.Macro.trim().length === 0) return;
  let macroDocument = await fromUuid(actionSettings.Macro.trim());
  if (macroDocument?.documentName !== "Macro") throw new Error(game.i18n.localize("QFU.InvalidMacro"));
  // if (macroDocument?.documentName !== "Macro") throw new Error(game.i18n.localize("The UUID does not resolve to a Macro."));
  await macroDocument.execute({ file: uploadFile, path: savedPath, rule: structuredClone(actionSettings) });
}

/* Run optional macro before/after one built-in action. Both run only after the
 * server confirms storage; canceling a chooser skips the built-in action.
 */
export async function ExecuteActions(uploadFile, savedPath, actionSettings, moduleSettings) {
  if (actionSettings === undefined) return;
  if (actionSettings.Before === true) await ExecuteMacro(uploadFile, savedPath, actionSettings);
  await ExecuteBuiltin(uploadFile, savedPath, actionSettings.Function, moduleSettings);
  if (actionSettings.Before === false) await ExecuteMacro(uploadFile, savedPath, actionSettings);
}

/* Execute a saved File action: none skips, choose prompts, chat posts an image,
 * image shares it, journalimage creates an image page, journaltext a text page.
 * Returns Promise<void>; canceling the action chooser skips this action.
 */
export async function ExecuteBuiltin(uploadFile, savedPath, functionName, moduleSettings) {
  if (functionName === "choose") {
    // Offer every concrete action without recursively offering the chooser itself.
    let actionEntries = [
      { Identifier: "none", Name: game.i18n.localize("QFU.Choice_none") },
      // { Identifier: "none", Name: game.i18n.localize("None") },
      { Identifier: "chat", Name: game.i18n.localize("QFU.Choice_chat") },
      // { Identifier: "chat", Name: game.i18n.localize("Chat") },
      { Identifier: "image", Name: game.i18n.localize("QFU.Choice_image") },
      // { Identifier: "image", Name: game.i18n.localize("Show image to players") },
      { Identifier: "journalimage", Name: game.i18n.localize("QFU.Choice_journalimage") },
      // { Identifier: "journalimage", Name: game.i18n.localize("Create journal image page") },
      { Identifier: "journaltext", Name: game.i18n.localize("QFU.Choice_journaltext") }
      // { Identifier: "journaltext", Name: game.i18n.localize("Create journal text page") }
    ];
    let dialogTitle = game.i18n.localize("QFU.SelectAction");
    // let dialogTitle = game.i18n.localize("Choose an action for {file}");
    let chosenActions = await SelectEntries(actionEntries, ["none"], false,
      dialogTitle.replace("{file}", () => uploadFile.name));
    if (chosenActions === null || chosenActions.length === 0) return;
    functionName = chosenActions[0];
  }
  if (functionName === "none") return;
  let imageFlag = uploadFile.type?.startsWith("image/") === true || /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(uploadFile.name);
  if (functionName !== "journaltext" && imageFlag === false) throw new Error(game.i18n.localize("QFU.ImageRequired"));
  // if (functionName !== "journaltext" && imageFlag === false) throw new Error(game.i18n.localize("This action requires an image file."));
  let imageMarkup = `<img src="${EscapeMarkup(savedPath)}" alt="${EscapeMarkup(uploadFile.name)}">`;
  if (functionName === "chat") { await ChatMessage.create({ content: imageMarkup }); return; }
  let journalUuid = moduleSettings.Journal;
  if (["journalimage", "journaltext"].includes(functionName) === true && moduleSettings.Journalprompt === true) {
    let titleText = game.i18n.localize("QFU.SelectJournal");
    // let titleText = game.i18n.localize("Select a destination journal");
    let chosenEntries = await SelectEntries((await FilterJournals(moduleSettings))
      .map(journalEntry => ({ Identifier: journalEntry.uuid, Name: journalEntry.name })), [journalUuid], false, titleText, true);
    if (chosenEntries === null || chosenEntries.length === 0) return;
    journalUuid = chosenEntries[0];
  }
  let journalEntry = null;
  if (journalUuid.length > 0) journalEntry = await fromUuid(journalUuid);
  if (journalEntry !== null && journalEntry.documentName !== "JournalEntry") throw new Error(game.i18n.localize("QFU.InvalidJournal"));
  // if (journalEntry !== null && journalEntry.documentName !== "JournalEntry") throw new Error(game.i18n.localize("Choose an editable Journal Entry UUID."));
  let recipientUsers = null;
  if (functionName === "image" || moduleSettings.Display === "players") {
    recipientUsers = await ResolveAudience(moduleSettings, journalEntry);
    if (recipientUsers === null) return;
  }
  if (functionName === "image") {
    if (recipientUsers.length > 0) new foundry.applications.apps.ImagePopout({ src: savedPath, window: { title: uploadFile.name } }).shareImage({ users: recipientUsers });
    return;
  }
  if (journalEntry === null || journalEntry.isOwner !== true) throw new Error(game.i18n.localize("QFU.InvalidJournal"));
  // if (journalEntry === null || journalEntry.isOwner !== true) throw new Error(game.i18n.localize("Choose an editable Journal Entry UUID."));
  let pageData = { name: uploadFile.name, type: "image", src: savedPath };
  if (functionName === "journaltext") {
    if (/\.(txt|md|markdown|html?)$/i.test(uploadFile.name) === false && ["text/plain", "text/markdown", "text/html"].includes(uploadFile.type) === false) {
      throw new Error(game.i18n.localize("QFU.TextRequired"));
      // throw new Error(game.i18n.localize("This action requires a text, Markdown, or HTML file."));
    }
    let fileContent = await uploadFile.text();
    let htmlContent = `<pre>${EscapeMarkup(fileContent)}</pre>`;
    if (uploadFile.type === "text/html" || /\.html?$/i.test(uploadFile.name)) htmlContent = fileContent;
    pageData = { name: uploadFile.name, type: "text", text: { content: htmlContent, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML } };
  }
  let [createdPage] = await journalEntry.createEmbeddedDocuments("JournalEntryPage", [pageData]);
  if (moduleSettings.Display === "chat") await ChatMessage.create({ content: `@UUID[${createdPage.uuid}]` });
  if (moduleSettings.Display === "players" && recipientUsers.length > 0) {
    await foundry.documents.collections.Journal.show(createdPage, { users: recipientUsers, force: true });
  }
}
