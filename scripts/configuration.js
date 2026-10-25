import { QFU_MODULE_ID, QFU_SETTINGS_KEY, QFU_SETTINGS, QFU_GROUP_SETTINGS, QFU_RULE_SETTINGS, QFU_ACTION_SETTINGS, QFU_MENU_FIELDS } from "./settings.js";
import { NormalizePath, ValidateSettings, ParseSettings, SerializeSettings } from "./core.js";
import { ContentApplication, CreateElement, CreateButton, CreateField, CreateOrdering, AddSection } from "./ui.js";
import { ReadSettings } from "./storage.js";
import { SortEntries } from "./sorting.js";

export class HelpApplication extends ContentApplication {
  static DEFAULT_OPTIONS = {
    id: "quick-file-upload-help", classes: ["quick-upload", "qu-help"],
    window: { title: "QFU.HelpTitle", icon: "fa-solid fa-circle-question", resizable: true },
    // window: { title: "Quick File Upload — Help", icon: "fa-solid fa-circle-question", resizable: true },
    position: { width: 680, height: 620 }
  };

  async _renderHTML() {
    let helpContent = CreateElement("article", "qu-help-content");
    let helpIntro = game.i18n.localize("QFU.HelpIntro");
    // let helpIntro = game.i18n.localize("Configure ordered groups of upload rules. Expand a topic below for details.");
    helpContent.append(CreateElement("p", "qu-help-intro", helpIntro));
    // Catalogue sections keep explanatory prose separate from rendering code.
    let helpTopics = [
      [game.i18n.localize("QFU.GroupsTitle"), game.i18n.localize("QFU.HelpGroups")],
      // [game.i18n.localize("Groups and rules"), game.i18n.localize("Group identifiers must be unique. Rule names may repeat. Use the arrows to order groups and the rules within each group. Only group identifiers appear in the upload window's list. The folder panel lists active rule names and paths in evaluation order.")],
      [game.i18n.localize("QFU.RoutingTitle"), game.i18n.localize("QFU.HelpRouting")],
      // [game.i18n.localize("Routing and defaults"), game.i18n.localize("With All groups checked, every group and its rules are checked from top to bottom. The first qualifying rule wins. If no rule qualifies, the module fallback is used; group defaults are ignored. Uncheck All groups to run only the selected group. Its default rule receives unmatched files, or the module fallback is used if no group default exists. At most one rule per group may be marked default. Defaults ignore regex and size limits when used as fallbacks.")],
      [game.i18n.localize("QFU.PatternsTitle"), game.i18n.localize("QFU.HelpPatterns")],
      // [game.i18n.localize("Regex and file size"), game.i18n.localize("Each rule tests the filename regex first, then its maximum size. Use a plain pattern or /pattern/i for case-insensitive matching. A blank regex never matches, but its rule can be a group default. Maximum size is inclusive, in KB (1 KB = 1,024 bytes); 0 is unlimited. If a matching file is too large, evaluation continues to the next rule.")],
      [game.i18n.localize("QFU.PathsTitle"), game.i18n.localize("QFU.HelpPaths")],
      // [game.i18n.localize("Folders and permissions"), game.i18n.localize("Paths are relative to Foundry's user-data directory, such as uploads/images. Type a path or use Browse to select or create a folder. Missing upload folders are created when permissions allow. Folder creation in the picker is immediate and is not undone by Cancel. Upload, browse and folder creation permissions still apply. Only GMs can save settings.")],
      [game.i18n.localize("QFU.ControlsTitle"), game.i18n.localize("QFU.HelpControls")],
      // [game.i18n.localize("Scene controls"), game.i18n.localize("Main opens the upload window on every click without a submenu. Main control with submenu adds a top-level menu whose upload tool opens the window. Submenu adds the upload tool under the parent control ID, such as tokens, tiles or notes. An unavailable parent falls back to Main. Position 0 is first, -1 is last; larger positions append.")],
      [game.i18n.localize("QFU.LayoutTitle"), game.i18n.localize("QFU.HelpLayout")],
      // [game.i18n.localize("Window and appearance"), game.i18n.localize("Sizes accept pixels (720) or percentages (75%). Window percentages use the viewport; pad and header percentages use the application size. Header width follows pad width. The group list retains at least 20% width. Header and toggle retain at least two font units in height. Pixel sizes scale down on shrink. Reopen the upload window to apply initial dimensions. A blank pad name uses the translated default label.")],
      [game.i18n.localize("QFU.TransferTitle"), game.i18n.localize("QFU.HelpTransfer")]
      // [game.i18n.localize("JSON import and export"), game.i18n.localize("Export downloads the current valid editor contents, including unsaved edits, groups, rules and appearance. Import validates a JSON file and replaces only the editor draft. Review it and Save to apply it to the world, or Cancel to discard it. Invalid imports leave the draft unchanged. Only the current grouped settings schema is accepted. Files created or uploaded on the server are not part of the export.")]
    ];
    for (let [topicTitle, topicText] of helpTopics) {
      let topicBlock = CreateElement("details", "qu-help-topic");
      topicBlock.append(CreateElement("summary", "", topicTitle), CreateElement("p", "", topicText));
      helpContent.append(topicBlock);
    }
    let exclusionText = game.i18n.localize("QFU.ExclusionHelp");
    // let exclusionText = game.i18n.localize("Groups marked Skip when processing all groups are ignored entirely in All groups mode. They remain selectable and run normally when All groups is unchecked, including their group default.");
    helpContent.querySelector("details").append(CreateElement("p", "", exclusionText));
    helpContent.querySelector("details").open = true;
    return helpContent;
  }
}

export class ConfigurationApplication extends ContentApplication {
  static DEFAULT_OPTIONS = {
    id: "quick-file-upload-configuration", classes: ["quick-upload", "qu-settings"],
    window: { title: "QFU.ConfigurationTitle", icon: "fa-solid fa-gear", resizable: true },
    // window: { title: "Quick File Upload Configuration", icon: "fa-solid fa-gear", resizable: true },
    position: { width: 840, height: 720 }
  };

  Draft = null;
  Form = null;
  Pending = false;
  Menu = "Groups";

  /* Open a folder picker for an HTMLInputElement, retaining manual path entry.
   * Returns Promise<void>; only valid user-data selections update the input.
   */
  async PickDirectory(inputElement) {
    let initialPath = inputElement.value.trim();
    if (initialPath.length === 0) {
      // Prefer unsaved edits to the module fallback in the current editor.
      initialPath = this.Form?.elements.namedItem("Fallback")?.value.trim() ?? "";
      if (initialPath.length === 0) initialPath = ReadSettings().Fallback.trim();
      if (initialPath.length === 0) initialPath = QFU_SETTINGS.Fallback;
    }
    try { initialPath = NormalizePath(initialPath); }
    catch (pathError) { ui.notifications.error(pathError.message); return; }
    let filePicker = new foundry.applications.apps.FilePicker.implementation({
      type: "folder", activeSource: "data", current: initialPath,
      callback: selectedPath => {
        try {
          if (filePicker.activeSource !== "data") {
            throw new Error(game.i18n.localize("QFU.DataSourceOnly"));
            // throw new Error(game.i18n.localize("Choose a folder in the user-data source."));
          }
          let normalizedPath = NormalizePath(selectedPath);
          if (inputElement.isConnected === false) return;
          inputElement.value = normalizedPath;
          inputElement.dispatchEvent(new Event("change", { bubbles: true }));
        } catch (pickerError) { ui.notifications.error(pickerError.message); }
      }
    });
    // Instance browse takes a target, unlike static browse(source, target).
    try { await filePicker.browse(initialPath); }
    catch (pickerError) { ui.notifications.error(pickerError.message); }
  }

  /* Create a labeled path field with a browse button. Returns an HTMLElement. */
  CreatePathField(fieldName, fieldLabel, fieldValue) {
    let pathField = CreateField(fieldName, fieldLabel, fieldValue);
    pathField.Input.required = true;
    let pathContainer = CreateElement("div", "qu-path-field");
    let browseLabel = game.i18n.localize("QFU.BrowseFolder");
    // let browseLabel = game.i18n.localize("Browse / create folder");
    pathContainer.append(pathField.Container, CreateButton(browseLabel, () => this.PickDirectory(pathField.Input)));
    return pathContainer;
  }

  /* Add a rule object to a group's rule-list HTMLElement; return its row. */
  AddRule(ruleList, ruleData = structuredClone(QFU_RULE_SETTINGS)) {
    let ruleRow = CreateElement("div", "qu-rule");
    let nameField = CreateField("Name", game.i18n.localize("QFU.RuleName"), ruleData.Name);
    // let nameField = CreateField("Name", game.i18n.localize("Rule name"), ruleData.Name);
    nameField.Input.required = true;
    let regexField = CreateField("Regex", game.i18n.localize("QFU.RegexLabel"), ruleData.Regex);
    // let regexField = CreateField("Regex", game.i18n.localize("Filename regex"), ruleData.Regex);
    regexField.Input.placeholder = "/\\.(png|webp)$/i";
    let limitField = CreateField("Limit", game.i18n.localize("QFU.LimitLabel"), ruleData.Limit, "number");
    // let limitField = CreateField("Limit", game.i18n.localize("Max size (KB; 0 = unlimited)"), ruleData.Limit, "number");
    limitField.Input.min = "0";
    limitField.Input.step = "any";
    limitField.Input.required = true;
    let defaultField = CreateField("Default", game.i18n.localize("QFU.DefaultLabel"), ruleData.Default, "checkbox");
    // let defaultField = CreateField("Default", game.i18n.localize("Group default"), ruleData.Default, "checkbox");
    defaultField.Container.classList.add("qu-checkbox");
    // Selecting a new default clears the old flag without removing its rule.
    defaultField.Input.addEventListener("change", () => {
      if (defaultField.Input.checked === true) {
        ruleList.querySelectorAll('input[name="Default"]').forEach(inputElement => {
          if (inputElement !== defaultField.Input) inputElement.checked = false;
        });
      }
    });
    let pathLabel = game.i18n.localize("QFU.DestinationPath");
    // let pathLabel = game.i18n.localize("Destination path");
    ruleRow.append(nameField.Container, regexField.Container, limitField.Container,
      this.CreatePathField("Path", pathLabel, ruleData.Path), defaultField.Container, CreateOrdering(ruleRow, () => this.CloneRule(ruleRow)));
    let actionSettings = { ...QFU_ACTION_SETTINGS, ...ruleData.Action };
    let actionPanel = CreateElement("div", "qu-action-fields");
    // Only persist action settings after edits, preserving existing export shapes.
    actionPanel.dataset.changed = String(ruleData.Action !== undefined);
    let macroField = CreateField("Macro", game.i18n.localize("QFU.MacroUuid"), actionSettings.Macro);
    // let macroField = CreateField("Macro", game.i18n.localize("Macro UUID"), actionSettings.Macro);
    let macroName = CreateElement("span", "qu-macro-name");
    let lookupNumber = 0;
    async function UpdateMacro() {
      let currentNumber = ++lookupNumber;
      try {
        let macroDocument = await fromUuid(macroField.Input.value.trim());
        if (currentNumber === lookupNumber) macroName.textContent = macroDocument?.name ?? "";
      } catch { if (currentNumber === lookupNumber) macroName.textContent = ""; }
    }
    macroField.Input.addEventListener("change", UpdateMacro);
    if (actionSettings.Macro.length > 0) UpdateMacro();
    actionPanel.append(macroField.Container, macroName,
      this.CreateChoice("Function", actionSettings.Function, ["none", "chat", "image", "journalimage", "journaltext", "choose"]));
    let beforeField = CreateField("Before", game.i18n.localize("QFU.MacroBefore"), actionSettings.Before, "checkbox");
    // let beforeField = CreateField("Before", game.i18n.localize("Run macro before built-in action"), actionSettings.Before, "checkbox");
    actionPanel.append(beforeField.Container);
    actionPanel.addEventListener("change", () => { actionPanel.dataset.changed = "true"; });
    ruleRow.append(actionPanel);
    ruleList.append(ruleRow);
    return ruleRow;
  }

  /* Add an ordered group object to a list HTMLElement; return its container. */
  AddGroup(groupList, groupData = structuredClone(QFU_GROUP_SETTINGS)) {
    let groupBlock = CreateElement("section", "qu-group");
    let groupHeader = CreateElement("div", "qu-group-header");
    let identifierField = CreateField("Identifier", game.i18n.localize("QFU.IdentifierLabel"), groupData.Identifier);
    // let identifierField = CreateField("Identifier", game.i18n.localize("Group identifier (unique)"), groupData.Identifier);
    identifierField.Input.required = true;
    groupHeader.append(identifierField.Container, CreateOrdering(groupBlock, () => this.CloneGroup(groupBlock)));
    let excludedField = CreateField("Excluded", game.i18n.localize("QFU.ExcludedLabel"), groupData.Excluded, "checkbox");
    // let excludedField = CreateField("Excluded", game.i18n.localize("Skip when processing all groups"), groupData.Excluded, "checkbox");
    excludedField.Container.classList.add("qu-checkbox");
    let colorField = CreateField("Groupcolor", game.i18n.localize("QFU.GroupColor"), groupData.Color ?? QFU_GROUP_SETTINGS.Color, "color");
    // let colorField = CreateField("Groupcolor", game.i18n.localize("Group background color"), groupData.Color ?? QFU_GROUP_SETTINGS.Color, "color");
    let overviewField = CreateField("Overview", game.i18n.localize("QFU.GroupOverview"), groupData.Overview ?? QFU_GROUP_SETTINGS.Overview, "checkbox");
    // let overviewField = CreateField("Overview", game.i18n.localize("Use group color in the upload overview"), groupData.Overview ?? QFU_GROUP_SETTINGS.Overview, "checkbox");
    groupBlock.dataset.colored = String(groupData.Color !== undefined);
    function UpdateColor() {
      groupBlock.dataset.colored = "true";
      groupBlock.style.setProperty("--qu-group-color", colorField.Input.value);
    }
    if (groupData.Color !== undefined) groupBlock.style.setProperty("--qu-group-color", groupData.Color);
    colorField.Input.addEventListener("input", UpdateColor);
    colorField.Input.addEventListener("change", UpdateColor);
    overviewField.Input.addEventListener("change", UpdateColor);
    groupHeader.append(colorField.Container, overviewField.Container);
    let ruleList = CreateElement("div", "qu-rules");
    groupData.Rules.forEach(ruleData => this.AddRule(ruleList, ruleData));
    let addLabel = game.i18n.localize("QFU.AddRule");
    // let addLabel = game.i18n.localize("Add rule");
    groupBlock.append(groupHeader, excludedField.Container, ruleList, CreateButton(addLabel, () => this.AddRule(ruleList).querySelector("input").focus()));
    groupList.append(groupBlock);
    return groupBlock;
  }

  /* Return a numbered name unique among the supplied strings, starting at 1. */
  CloneName(sourceName, usedNames) {
    let copyNumber = 1;
    while (usedNames.includes(`${sourceName} ${copyNumber}`) === true) copyNumber++;
    return `${sourceName} ${copyNumber}`;
  }

  /* Clone current group inputs, including rules, immediately below the source. */
  CloneGroup(groupBlock) {
    let groupList = groupBlock.parentElement;
    let groupIndex = Array.from(groupList.children).indexOf(groupBlock);
    let groupData = structuredClone(this.ReadDraft().Groups[groupIndex]);
    groupData.Identifier = this.CloneName(groupData.Identifier,
      Array.from(groupList.children, entryBlock => entryBlock.querySelector('[name="Identifier"]').value));
    let clonedGroup = this.AddGroup(groupList, groupData);
    groupBlock.after(clonedGroup);
    clonedGroup.querySelector('[name="Identifier"]').focus();
  }

  /* Clone current rule inputs below the source; preserve the sole group default. */
  CloneRule(ruleRow) {
    let ruleList = ruleRow.parentElement;
    let groupBlock = ruleList.closest(".qu-group");
    let groupIndex = Array.from(groupBlock.parentElement.children).indexOf(groupBlock);
    let ruleIndex = Array.from(ruleList.children).indexOf(ruleRow);
    let ruleData = structuredClone(this.ReadDraft().Groups[groupIndex].Rules[ruleIndex]);
    ruleData.Name = this.CloneName(ruleData.Name,
      Array.from(ruleList.children, entryRow => entryRow.querySelector('[name="Name"]').value));
    ruleData.Default = false;
    let clonedRule = this.AddRule(ruleList, ruleData);
    ruleRow.after(clonedRule);
    clonedRule.querySelector('[name="Name"]').focus();
  }

  /* Read the current form HTMLElement in visible order; return an unvalidated
   * settings object. No world writes occur until SaveDraft is called.
   */
  ReadDraft() {
    let draftSettings = { ...structuredClone(QFU_SETTINGS), ...structuredClone(this.Draft) };
    for (let settingName of Object.keys(QFU_SETTINGS)) {
      if (settingName === "Groups") continue;
      let settingInput = this.Form.elements.namedItem(settingName);
      if (settingInput === null) continue;
      if (typeof QFU_SETTINGS[settingName] === "boolean") draftSettings[settingName] = settingInput.checked;
      else draftSettings[settingName] = settingInput.value;
    }
    let groupList = this.Form.querySelector(".qu-groups");
    if (groupList !== null) draftSettings.Groups = Array.from(groupList.children, groupBlock => ({
      ...this.ReadColor(groupBlock),
      Identifier: groupBlock.querySelector('input[name="Identifier"]').value,
      Excluded: groupBlock.querySelector('input[name="Excluded"]').checked,
      Rules: Array.from(groupBlock.querySelector(".qu-rules").children, ruleRow => ({
        ...this.ReadAction(ruleRow),
        Name: ruleRow.querySelector('[name="Name"]').value,
        Regex: ruleRow.querySelector('[name="Regex"]').value,
        Path: ruleRow.querySelector('[name="Path"]').value,
        Limit: ruleRow.querySelector('[name="Limit"]').value,
        Default: ruleRow.querySelector('[name="Default"]').checked
      }))
    }));
    return draftSettings;
  }

  /* Preserve optional group colors without rewriting untouched older groups. */
  ReadColor(groupBlock) {
    if (groupBlock.dataset.colored !== "true") return {};
    return { Color: groupBlock.querySelector('[name="Groupcolor"]').value,
      Overview: groupBlock.querySelector('[name="Overview"]').checked };
  }

  /* Show resolved journal names beside the editable semicolon-separated UUID
   * list. A generation counter prevents stale asynchronous name lookups.
   */
  AddJournalList(actionFields) {
    let journalInput = actionFields.querySelector('[name="Journaluuids"]');
    let journalList = CreateElement("ul", "qu-journal-list");
    journalList.setAttribute("aria-live", "polite");
    let lookupNumber = 0;
    async function UpdateJournals() {
      let currentNumber = ++lookupNumber;
      let journalUuids = [...new Set(journalInput.value.split(/[;,]/).map(uuidText => uuidText.trim()).filter(uuidText => uuidText.length > 0))];
      let journalRows = await Promise.all(journalUuids.map(async journalUuid => {
        let journalName = game.i18n.localize("QFU.UnresolvedJournal");
        // let journalName = game.i18n.localize("Journal not found");
        try {
          let journalEntry = await fromUuid(journalUuid);
          if (journalEntry?.documentName === "JournalEntry") journalName = journalEntry.name;
        } catch {
          // Keep invalid UUIDs visible so the user can correct them.
        }
        return CreateElement("li", "", `${journalUuid} — ${journalName}`);
      }));
      if (currentNumber === lookupNumber) journalList.replaceChildren(...journalRows);
    }
    journalInput.addEventListener("input", UpdateJournals);
    journalInput.addEventListener("change", UpdateJournals);
    actionFields.append(journalList);
    let editLabel = game.i18n.localize("QFU.EditJournals");
    // let editLabel = game.i18n.localize("Edit journal UUID list");
    actionFields.append(CreateButton(editLabel, () => new JournalListApplication(journalInput).render({ force: true })));
    UpdateJournals();
  }

  /* Read optional rule actions without adding empty defaults to old rules. */
  ReadAction(ruleRow) {
    if (ruleRow.querySelector(".qu-action-fields").dataset.changed !== "true") return {};
    return { Action: { Macro: ruleRow.querySelector('[name="Macro"]').value,
      Before: ruleRow.querySelector('[name="Before"]').checked,
      Function: ruleRow.querySelector('[name="Function"]').value } };
  }

  /* Create a localized select for one of the finite action setting values. */
  CreateChoice(fieldName, fieldValue, choiceValues) {
    let fieldLabel = game.i18n.localize(`QFU.${fieldName}`);
    // Localized action setting label: Function, Display, or Audience.
    let fieldContainer = CreateElement("label", "qu-field", fieldLabel);
    let selectInput = document.createElement("select");
    selectInput.name = fieldName;
    for (let choiceValue of choiceValues) {
      let choiceLabel = game.i18n.localize(`QFU.Choice_${choiceValue}`);
      // Localized choice: None, Chat, Image, Journal image/text, Players, All, Observer, Selected.
      let optionElement = CreateElement("option", "", choiceLabel);
      optionElement.value = choiceValue;
      selectInput.append(optionElement);
    }
    selectInput.replaceChildren(...SortEntries(Array.from(selectInput.options), optionElement => optionElement.textContent));
    selectInput.value = fieldValue;
    fieldContainer.append(selectInput);
    return fieldContainer;
  }

  /* Stage JSON text in the editor without saving. Invalid imports preserve the
   * existing draft. Returns Promise<void> after the replacement is rendered.
   */
  async ImportSettings(jsonText) {
    let importedSettings = ParseSettings(jsonText);
    this.Draft = importedSettings;
    await this.render({ force: true });
    this.Form.querySelector(".qu-validation").textContent = game.i18n.localize("QFU.ImportStaged");
    // this.Form.querySelector(".qu-validation").textContent = game.i18n.localize("Import loaded into the editor. Review and Save to apply, or Cancel to discard.");
  }

  /* Download current validated editor contents as JSON using browser APIs. */
  ExportSettings() {
    let exportText = SerializeSettings(this.ReadDraft());
    let downloadUrl = URL.createObjectURL(new Blob([exportText], { type: "application/json" }));
    let downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = "quick-file-upload-settings.json";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    // Keep the object URL alive until the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  /* Persist a validated editor draft. Returns Promise<void>; failures are
   * surfaced by the form handler and keep the editor available for correction.
   */
  async SaveDraft() {
    if (game.user.isGM !== true) {
      throw new Error(game.i18n.localize("QFU.GmOnly"));
      // throw new Error(game.i18n.localize("Only a GM can change upload configuration."));
    }
    // Merge only this menu's fields to avoid overwriting another open editor.
    let savedSettings = ReadSettings();
    let draftSettings = this.ReadDraft();
    for (let fieldName of QFU_MENU_FIELDS[this.Menu]) savedSettings[fieldName] = draftSettings[fieldName];
    await game.settings.set(QFU_MODULE_ID, QFU_SETTINGS_KEY, ValidateSettings(savedSettings));
    await this.close();
    ui.notifications.info(game.i18n.localize("QFU.SettingsSaved"));
    // ui.notifications.info(game.i18n.localize("Settings saved. Reopen the upload window to apply its initial dimensions."));
  }

  async _renderHTML() {
    if (this.Draft === null) this.Draft = ReadSettings();
    let formElement = CreateElement("form", "qu-settings-form");
    this.Form = formElement;
    let toolbarElement = CreateElement("div", "qu-toolbar");
    let helpLabel = game.i18n.localize("QFU.HelpButton");
    // let helpLabel = game.i18n.localize("Settings help");
    let exportLabel = game.i18n.localize("QFU.ExportButton");
    // let exportLabel = game.i18n.localize("Export JSON");
    let importLabel = game.i18n.localize("QFU.ImportButton");
    // let importLabel = game.i18n.localize("Import JSON");
    let importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = ".json,application/json";
    importInput.hidden = true;
    toolbarElement.append(CreateButton(helpLabel, () => new HelpApplication().render({ force: true })),
      CreateButton(exportLabel, () => {
        try { this.ExportSettings(); } catch (exportError) { this.ShowError(exportError); }
      }), CreateButton(importLabel, () => importInput.click()), importInput);
    importInput.addEventListener("change", async () => {
      let importFile = importInput.files[0];
      if (importFile === undefined || this.Pending === true) return;
      this.SetPending(true);
      try {
        let importText = await importFile.text();
        // Closing the editor during file reading cancels the pending import.
        if (formElement.isConnected === true) await this.ImportSettings(importText);
      }
      catch (importError) { this.ShowError(importError); }
      finally { this.SetPending(false); importInput.value = ""; }
    });
    let scrollContent = CreateElement("div", "qu-settings-scroll");
    if (this.Menu === "Groups") {
    AddSection(scrollContent, game.i18n.localize("QFU.GroupsTitle"), game.i18n.localize("QFU.GroupsHint"));
    // AddSection(scrollContent, game.i18n.localize("Groups and rules"), game.i18n.localize("Order groups and rules with the arrows. Regex is checked before size. See Settings help for routing and fallback details."));
    let fallbackLabel = game.i18n.localize("QFU.FallbackLabel");
    // let fallbackLabel = game.i18n.localize("Module fallback folder");
    scrollContent.append(this.CreatePathField("Fallback", fallbackLabel, this.Draft.Fallback));
    let groupList = CreateElement("div", "qu-groups");
    this.Draft.Groups.forEach(groupData => this.AddGroup(groupList, groupData));
    let addLabel = game.i18n.localize("QFU.AddGroup");
    // let addLabel = game.i18n.localize("Add group");
    scrollContent.append(groupList, CreateButton(addLabel, () => this.AddGroup(groupList).querySelector("input").focus()));
    }
    if (this.Menu === "Controls") {
    AddSection(scrollContent, game.i18n.localize("QFU.ControlsTitle"));
    // AddSection(scrollContent, game.i18n.localize("Scene controls"));
    let controlsFields = CreateElement("div", "qu-fields");
    let placementField = CreateElement("label", "", game.i18n.localize("QFU.PlacementLabel"));
    // let placementField = CreateElement("label", "", game.i18n.localize("Button placement"));
    let placementInput = document.createElement("select");
    placementInput.name = "Placement";
    let mainOption = CreateElement("option", "", game.i18n.localize("QFU.MainControl"));
    // let mainOption = CreateElement("option", "", game.i18n.localize("Main control"));
    mainOption.value = "main";
    let subOption = CreateElement("option", "", game.i18n.localize("QFU.SubControl"));
    // let subOption = CreateElement("option", "", game.i18n.localize("Submenu tool"));
    subOption.value = "sub";
    let combinedOption = CreateElement("option", "", game.i18n.localize("QFU.MainSubControl"));
    // let combinedOption = CreateElement("option", "", game.i18n.localize("Main control with submenu"));
    combinedOption.value = "main-sub";
    placementInput.append(...SortEntries([mainOption, combinedOption, subOption], optionElement => optionElement.textContent));
    placementInput.value = this.Draft.Placement;
    placementField.append(placementInput);
    let parentField = CreateField("Parent", game.i18n.localize("QFU.ParentLabel"), this.Draft.Parent);
    // let parentField = CreateField("Parent", game.i18n.localize("Parent control ID (tokens, tiles, notes…)"), this.Draft.Parent);
    let orderField = CreateField("Order", game.i18n.localize("QFU.OrderLabel"), this.Draft.Order, "number");
    // let orderField = CreateField("Order", game.i18n.localize("Position (-1 = last, 0 = first)"), this.Draft.Order, "number");
    orderField.Input.min = "-1";
    orderField.Input.step = "1";
    orderField.Input.required = true;
    // A native suggestions dropdown accepts both core and custom control IDs.
    let parentChoices = CreateElement("datalist");
    parentChoices.id = "qu-parent-controls";
    for (let controlName of SortEntries(["tokens", "tiles", "drawings", "walls", "lighting", "sounds", "notes", "regions"], controlName => controlName)) {
      let optionElement = CreateElement("option", "", controlName);
      optionElement.value = controlName;
      parentChoices.append(optionElement);
    }
    parentField.Input.setAttribute("list", parentChoices.id);
    controlsFields.append(parentChoices);
    controlsFields.append(placementField, parentField.Container, orderField.Container);
    scrollContent.append(controlsFields);
    }
    if (this.Menu === "Layout") {
    AddSection(scrollContent, game.i18n.localize("QFU.LayoutTitle"), game.i18n.localize("QFU.LayoutHint"));
    // AddSection(scrollContent, game.i18n.localize("Window and appearance"), game.i18n.localize("Enter pixels (720) or percentages (75%). Window percentages use the viewport; pad and header percentages use the application. Blank pad name uses the translated default."));
    let layoutFields = CreateElement("div", "qu-fields");
    let fieldLabels = {
      Width: game.i18n.localize("QFU.WidthLabel"),
      // Width: game.i18n.localize("Window width"),
      Height: game.i18n.localize("QFU.HeightLabel"),
      // Height: game.i18n.localize("Window height"),
      Padwidth: game.i18n.localize("QFU.PadwidthLabel"),
      // Padwidth: game.i18n.localize("Drop pad / header width"),
      Padheight: game.i18n.localize("QFU.PadheightLabel"),
      // Padheight: game.i18n.localize("Drop pad height"),
      Headerheight: game.i18n.localize("QFU.HeaderheightLabel"),
      // Headerheight: game.i18n.localize("Header / toggle height"),
      Label: game.i18n.localize("QFU.PadnameLabel"),
      // Label: game.i18n.localize("Drop pad name"),
      Color: game.i18n.localize("QFU.ColorLabel"),
      // Color: game.i18n.localize("Drop pad color"),
      Rulelight: game.i18n.localize("QFU.Rulelight"),
      // Rulelight: game.i18n.localize("Alternating rule color — light theme"),
      Ruledark: game.i18n.localize("QFU.Ruledark")
      // Ruledark: game.i18n.localize("Alternating rule color — dark theme")
    };
    for (let [fieldName, fieldLabel] of Object.entries(fieldLabels)) {
      let inputType = "text";
      if (["Color", "Rulelight", "Ruledark"].includes(fieldName) === true) inputType = "color";
      layoutFields.append(CreateField(fieldName, fieldLabel, this.Draft[fieldName], inputType).Container);
    }
    scrollContent.append(layoutFields);
    }
    if (this.Menu === "Actions") {
    let actionTitle = game.i18n.localize("QFU.ActionDefaults");
    // let actionTitle = game.i18n.localize("Upload actions and clipboard defaults");
    AddSection(scrollContent, actionTitle);
    let actionFields = CreateElement("div", "qu-fields");
    for (let fieldName of ["Clipboard", "Journal", "Journalprompt", "Journaluuids", "Journalpattern", "Journalsort", "Users", "Audienceprompt"]) {
      let fieldLabel = game.i18n.localize(`QFU.${fieldName}`);
      // Localized defaults: Paste anywhere, Journal UUID, Ask for journal, User IDs, Ask for recipients.
      let inputType = "text";
      if (typeof QFU_SETTINGS[fieldName] === "boolean") inputType = "checkbox";
      actionFields.append(CreateField(fieldName, fieldLabel, this.Draft[fieldName] ?? QFU_SETTINGS[fieldName], inputType).Container);
    }
    actionFields.append(this.CreateChoice("Display", this.Draft.Display ?? "none", ["none", "chat", "players"]),
      this.CreateChoice("Audience", this.Draft.Audience ?? "all", ["all", "playersonly", "observer", "selected", "choose"]));
    scrollContent.append(actionFields);
    this.AddJournalList(actionFields);
    }
    let errorElement = CreateElement("p", "qu-validation");
    errorElement.setAttribute("role", "status");
    let footerElement = CreateElement("footer");
    let cancelLabel = game.i18n.localize("QFU.CancelButton");
    // let cancelLabel = game.i18n.localize("Cancel");
    let saveLabel = game.i18n.localize("QFU.SaveButton");
    // let saveLabel = game.i18n.localize("Save configuration");
    let saveButton = CreateElement("button", "", saveLabel);
    saveButton.type = "submit";
    footerElement.append(CreateButton(cancelLabel, () => this.close()), saveButton);
    formElement.append(toolbarElement, scrollContent, errorElement, footerElement);
    formElement.addEventListener("submit", async submitEvent => {
      submitEvent.preventDefault();
      if (this.Pending === true) return;
      this.SetPending(true);
      try { await this.SaveDraft(); }
      catch (saveError) { this.ShowError(saveError); }
      finally { this.SetPending(false); }
    });
    return formElement;
  }

  /* Display an Error in the editor without replacing any entered field values. */
  ShowError(editorError) { this.Form.querySelector(".qu-validation").textContent = editorError.message; }

  /* Disable editor controls while reading an import or saving (boolean flag). */
  SetPending(pendingFlag) {
    this.Pending = pendingFlag;
    this.Form.querySelectorAll("button, input, select").forEach(inputElement => { inputElement.disabled = pendingFlag; });
  }

  async close(closeOptions) {
    // A pending save calls close itself after persistence succeeds.
    await super.close(closeOptions);
    this.Draft = null;
    return this;
  }
}

export class ControlsApplication extends ConfigurationApplication {
  Menu = "Controls";
  constructor(applicationOptions = {}) {
    super({ ...applicationOptions, id: "quick-file-upload-controls", window: { title: "QFU.ControlsTitle" } });
    // super({ ...applicationOptions, id: "quick-file-upload-controls", window: { title: "Scene controls" } });
  }
}

export class LayoutApplication extends ConfigurationApplication {
  Menu = "Layout";
  constructor(applicationOptions = {}) {
    super({ ...applicationOptions, id: "quick-file-upload-layout", window: { title: "QFU.LayoutTitle" } });
    // super({ ...applicationOptions, id: "quick-file-upload-layout", window: { title: "Window and appearance" } });
  }
}

export class ActionsApplication extends ConfigurationApplication {
  Menu = "Actions";
  constructor(applicationOptions = {}) {
    super({ ...applicationOptions, id: "quick-file-upload-actions", window: { title: "QFU.ActionDefaults" } });
    // super({ ...applicationOptions, id: "quick-file-upload-actions", window: { title: "Upload actions and clipboard defaults" } });
  }
}

/* Edit UUID rows in a separate draft window; Apply only updates the parent
 * settings draft. Cancel and closing the parent never write world settings.
 */
export class JournalListApplication extends ContentApplication {
  static DEFAULT_OPTIONS = {
    id: "quick-file-upload-journals", classes: ["quick-upload", "qu-settings"],
    window: { title: "QFU.EditJournals", resizable: true },
    // window: { title: "Edit journal UUID list", resizable: true },
    position: { width: 680, height: 520 }
  };
  Target = null;

  constructor(targetInput) { super(); this.Target = targetInput; }

  /* Append one UUID input with asynchronous name resolution and delete button. */
  AddJournalRow(journalList, journalUuid = "") {
    let journalRow = CreateElement("div", "qu-journal-row");
    let uuidLabel = game.i18n.localize("QFU.JournalUuid");
    // let uuidLabel = game.i18n.localize("Journal UUID");
    let uuidField = CreateField("Uuid", uuidLabel, journalUuid);
    let nameElement = CreateElement("span");
    let lookupNumber = 0;
    async function UpdateName() {
      let currentNumber = ++lookupNumber;
      let journalName = game.i18n.localize("QFU.UnresolvedJournal");
      // let journalName = game.i18n.localize("Journal not found");
      try {
        let journalEntry = await fromUuid(uuidField.Input.value.trim());
        if (journalEntry?.documentName === "JournalEntry") journalName = journalEntry.name;
      } catch {
        // Keep the row editable when a UUID is incomplete or invalid.
      }
      if (currentNumber === lookupNumber) nameElement.textContent = journalName;
    }
    uuidField.Input.addEventListener("input", UpdateName);
    let deleteLabel = game.i18n.localize("QFU.DeleteEntry");
    // let deleteLabel = game.i18n.localize("Delete");
    journalRow.append(uuidField.Container, nameElement, CreateButton(deleteLabel, () => journalRow.remove()));
    journalList.append(journalRow);
    if (journalUuid.length > 0) UpdateName();
    return uuidField.Input;
  }

  async _renderHTML() {
    let rootElement = CreateElement("div", "qu-settings-form");
    let journalList = CreateElement("div", "qu-settings-scroll");
    for (let journalUuid of this.Target.value.split(/[;,]/).map(uuidText => uuidText.trim()).filter(uuidText => uuidText.length > 0)) this.AddJournalRow(journalList, journalUuid);
    let addLabel = game.i18n.localize("QFU.AddJournal");
    // let addLabel = game.i18n.localize("Add journal UUID");
    let applyLabel = game.i18n.localize("QFU.ApplyDraft");
    // let applyLabel = game.i18n.localize("Apply to settings draft");
    let cancelLabel = game.i18n.localize("QFU.CancelButton");
    // let cancelLabel = game.i18n.localize("Cancel");
    rootElement.append(journalList, CreateButton(addLabel, () => this.AddJournalRow(journalList).focus()),
      CreateButton(applyLabel, () => {
        if (this.Target.isConnected === true) {
          this.Target.value = [...new Set(Array.from(journalList.querySelectorAll("input"), inputElement => inputElement.value.trim()).filter(uuidText => uuidText.length > 0))].join(";");
          this.Target.dispatchEvent(new Event("change", { bubbles: true }));
        }
        this.close();
      }), CreateButton(cancelLabel, () => this.close()));
    return rootElement;
  }
}
