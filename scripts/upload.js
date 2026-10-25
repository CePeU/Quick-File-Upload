import { ResolveDimension, ValidateSettings, GetActiveGroups, ResolveFallback, UploadBatch } from "./core.js";
import { ReadSettings } from "./storage.js";
import { ContentApplication, CreateElement, CreateButton } from "./ui.js";
import { ConfigurationApplication, ActionsApplication } from "./configuration.js";

/* Return whether the current Foundry user is allowed to upload files. */
export function CanUpload() { return game.user?.can("FILES_UPLOAD") === true; }

export class UploadApplication extends ContentApplication {
  static DEFAULT_OPTIONS = {
    id: "quick-file-upload-window", classes: ["quick-upload"],
    window: { title: "QFU.Title", icon: "fa-solid fa-cloud-arrow-up", resizable: true },
    // window: { title: "Quick File Upload", icon: "fa-solid fa-cloud-arrow-up", resizable: true },
    position: { width: 720, height: 520 }
  };

  All = true;
  Selected = null;
  Busy = false;
  History = [];
  Snapshot = null;
  Observer = null;
  Baseline = { Width: 720, Height: 520 };

  constructor(applicationOptions = {}) {
    let moduleSettings = ReadSettings();
    let initialPosition = {
      width: Math.min(window.innerWidth, ResolveDimension(moduleSettings.Width, window.innerWidth)),
      height: Math.min(window.innerHeight, ResolveDimension(moduleSettings.Height, window.innerHeight))
    };
    super({ ...applicationOptions, position: initialPosition });
    this.Baseline = { Width: initialPosition.width, Height: initialPosition.height };
    this.Selected = moduleSettings.Groups[0]?.Identifier ?? null;
  }

  /* During uploads keep the displayed settings consistent with batch routing. */
  GetSettings() {
    if (this.Snapshot !== null) return this.Snapshot;
    return ReadSettings();
  }

  async _renderHTML() {
    let moduleSettings = this.GetSettings();
    if (moduleSettings.Groups.some(groupEntry => groupEntry.Identifier === this.Selected) === false) {
      this.Selected = moduleSettings.Groups[0]?.Identifier ?? null;
    }
    let rootElement = CreateElement("div", "qu-layout");
    rootElement.style.setProperty("--qu-color", moduleSettings.Color);
    let folderPanel = CreateElement("section", "qu-folder");
    folderPanel.setAttribute("aria-live", "polite");
    let togglePanel = CreateElement("div", "qu-toggle");
    let toggleLabel = CreateElement("label", "", game.i18n.localize("QFU.AllGroups"));
    // let toggleLabel = CreateElement("label", "", game.i18n.localize("All groups"));
    let toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    toggleInput.checked = this.All;
    toggleInput.addEventListener("change", () => { this.All = toggleInput.checked; this.UpdateSelection(); });
    toggleLabel.prepend(toggleInput);
    togglePanel.append(toggleLabel);
    let dropPanel = CreateElement("section", "qu-pad");
    dropPanel.setAttribute("aria-label", game.i18n.localize("QFU.UploadArea"));
    // dropPanel.setAttribute("aria-label", game.i18n.localize("File upload area"));
    dropPanel.tabIndex = 0;
    rootElement.addEventListener("paste", pasteEvent => {
      // Keep paste in editable controls native even when application-wide paste is enabled.
      if (pasteEvent.target.closest('input, textarea, select, [contenteditable="true"]') !== null) return;
      if (moduleSettings.Clipboard !== true && dropPanel.contains(pasteEvent.target) === false) return;
      if (pasteEvent.clipboardData === null) return;
      pasteEvent.preventDefault();
      pasteEvent.stopPropagation();
      this.PasteClipboard(pasteEvent.clipboardData);
    });
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.hidden = true;
    let dropButton = CreateButton("", () => fileInput.click(), "qu-drop");
    let iconElement = CreateElement("i", "fa-solid fa-cloud-arrow-up");
    iconElement.setAttribute("aria-hidden", "true");
    let padLabel = moduleSettings.Label;
    if (padLabel.trim().length === 0) {
      padLabel = game.i18n.localize("QFU.DropLabel");
      // padLabel = game.i18n.localize("Drop files here");
    }
    let dropHint = game.i18n.localize("QFU.DropHint");
    // let dropHint = game.i18n.localize("Drop files, click to browse, or focus this pad and press Ctrl+V");
    dropButton.append(iconElement, CreateElement("strong", "", padLabel), CreateElement("span", "", dropHint));
    let statusElement = CreateElement("p", "qu-status");
    statusElement.setAttribute("role", "status");
    let resultsList = CreateElement("ol", "qu-results");
    resultsList.setAttribute("aria-label", game.i18n.localize("QFU.ResultsLabel"));
    // resultsList.setAttribute("aria-label", game.i18n.localize("Upload results"));
    dropPanel.append(dropButton, fileInput, statusElement, resultsList);
    fileInput.addEventListener("change", () => { this.UploadFiles(Array.from(fileInput.files)); fileInput.value = ""; });
    for (let eventType of ["dragenter", "dragover", "dragleave", "drop"]) {
      dropPanel.addEventListener(eventType, dropEvent => {
        dropEvent.preventDefault();
        dropEvent.stopPropagation();
        if (eventType === "dragenter" || eventType === "dragover") {
          dropPanel.classList.add("qu-dragover");
          if (dropEvent.dataTransfer !== null) {
            dropEvent.dataTransfer.dropEffect = "copy";
            if (this.Busy === true) dropEvent.dataTransfer.dropEffect = "none";
          }
        } else if (eventType === "drop") {
          dropPanel.classList.remove("qu-dragover");
          this.UploadFiles(Array.from(dropEvent.dataTransfer?.files ?? []));
        } else if (dropPanel.contains(dropEvent.relatedTarget) === false) dropPanel.classList.remove("qu-dragover");
      });
    }
    let sidebarPanel = CreateElement("aside", "qu-sidebar");
    let groupList = CreateElement("div", "qu-identifiers");
    groupList.setAttribute("aria-label", game.i18n.localize("QFU.GroupList"));
    // groupList.setAttribute("aria-label", game.i18n.localize("Routing groups"));
    for (let groupEntry of moduleSettings.Groups) {
      let groupButton = CreateButton(groupEntry.Identifier, () => { this.Selected = groupEntry.Identifier; this.UpdateSelection(); });
      groupButton.setAttribute("data-identifier", groupEntry.Identifier);
      if (groupEntry.Overview === true) groupButton.style.setProperty("--qu-group-color", groupEntry.Color);
      groupButton.title = groupEntry.Rules.map(ruleEntry => `${ruleEntry.Name} → ${ruleEntry.Path}`).join("\n");
      groupList.append(groupButton);
    }
    if (moduleSettings.Groups.length === 0) {
      groupList.append(CreateElement("p", "", game.i18n.localize("QFU.NoGroups")));
      // groupList.append(CreateElement("p", "", game.i18n.localize("No groups configured.")));
    }
    sidebarPanel.append(groupList);
    if (game.user.isGM === true) {
      let configureLabel = game.i18n.localize("QFU.ConfigureButton");
      // let configureLabel = game.i18n.localize("Configure");
      let actionsLabel = game.i18n.localize("QFU.ActionDefaults");
      // let actionsLabel = game.i18n.localize("Upload actions and clipboard defaults");
      togglePanel.prepend(CreateButton(configureLabel, () => new ConfigurationApplication().render({ force: true }), "qu-config"),
        CreateButton(actionsLabel, () => new ActionsApplication().render({ force: true }), "qu-actions"));
    }
    rootElement.append(folderPanel, togglePanel, dropPanel, sidebarPanel);
    return rootElement;
  }

  _onRender(renderContext, renderOptions) {
    super._onRender(renderContext, renderOptions);
    this.Observer?.disconnect();
    this.Observer = new ResizeObserver(() => this.ResizeLayout());
    this.Observer.observe(this.element);
    this.ResizeLayout();
    this.UpdateSelection();
    this.UpdateResults();
  }

  /* Fit the four panels to the current window; retain minimum group width and
   * header height while shrinking configured pixel sizes proportionally.
   */
  ResizeLayout() {
    let rootElement = this.element?.querySelector(".qu-layout");
    if (rootElement === null || rootElement === undefined) return;
    let moduleSettings = this.GetSettings();
    let windowWidth = this.element.clientWidth;
    let windowHeight = this.element.clientHeight;
    function ScaleDimension(sizeValue, actualSize, baselineSize) {
      let pixelSize = ResolveDimension(sizeValue, actualSize);
      if (String(sizeValue).endsWith("%") === false) pixelSize *= Math.min(1, actualSize / baselineSize);
      return pixelSize;
    }
    let leftWidth = Math.min(rootElement.clientWidth * .8, ScaleDimension(moduleSettings.Padwidth, windowWidth, this.Baseline.Width));
    let headerHeight = Math.max(parseFloat(getComputedStyle(rootElement).fontSize) * 2, ScaleDimension(moduleSettings.Headerheight, windowHeight, this.Baseline.Height));
    let padHeight = ScaleDimension(moduleSettings.Padheight, windowHeight, this.Baseline.Height);
    rootElement.style.gridTemplateColumns = `${leftWidth}px minmax(0, 1fr)`;
    let topHeight = Math.max(headerHeight, Math.min(padHeight, rootElement.clientHeight * .8));
    rootElement.style.gridTemplateRows = `${Math.min(topHeight, rootElement.clientHeight)}px minmax(0, 1fr)`;
    rootElement.querySelector(".qu-pad").style.height = "auto";
  }

  /* Convert clipboard files or HTML/plain text to Files for normal routing.
   * Markdown deliberately remains plain text, matching text-file imports.
   */
  PasteClipboard(clipboardData) {
    let uploadFiles = Array.from(clipboardData.files ?? []);
    if (uploadFiles.length === 0) {
      let fileContent = clipboardData.getData("text/html");
      let fileType = "text/html";
      let fileExtension = "html";
      if (fileContent.length === 0) {
        fileContent = clipboardData.getData("text/plain");
        fileType = "text/plain";
        fileExtension = "txt";
      }
      if (fileContent.length === 0) return;
      uploadFiles.push(new File([fileContent], `clipboard-${Date.now()}.${fileExtension}`, { type: fileType }));
    }
    this.UploadFiles(uploadFiles);
  }

  /* Display every active rule name/path in routing order and the actual fallback. */
  UpdateSelection() {
    if (this.rendered !== true) return;
    let moduleSettings = this.GetSettings();
    let activeGroups = GetActiveGroups(moduleSettings, this.All, this.Selected);
    let headerPanel = this.element.querySelector(".qu-folder");
    headerPanel.replaceChildren();
    for (let groupEntry of activeGroups) {
      let groupHeading = CreateElement("strong", "qu-overview-group", groupEntry.Identifier);
      if (groupEntry.Overview === true) groupHeading.style.setProperty("--qu-group-color", groupEntry.Color);
      headerPanel.append(groupHeading);
      let ruleList = CreateElement("ol", "qu-folder-rules");
      if (groupEntry.Overview === true) ruleList.style.setProperty("--qu-group-color", groupEntry.Color);
      for (let ruleEntry of groupEntry.Rules) {
        let ruleText = `${ruleEntry.Name} → ${ruleEntry.Path}`;
        if (ruleEntry.Default === true) {
          ruleText += ` (${game.i18n.localize("QFU.DefaultLabel")})`;
          // ruleText += ` (${game.i18n.localize("Group default")})`;
        }
        ruleList.append(CreateElement("li", "", ruleText));
      }
      headerPanel.append(ruleList);
    }
    let fallbackPath = ResolveFallback(activeGroups, moduleSettings.Fallback, this.All);
    let fallbackText = game.i18n.localize("QFU.ActiveFallback");
    // let fallbackText = game.i18n.localize("Fallback: {path}");
    headerPanel.append(CreateElement("span", "", fallbackText.replace("{path}", () => fallbackPath)));
    if (this.All === false && activeGroups.length === 0) {
      headerPanel.prepend(CreateElement("strong", "", game.i18n.localize("QFU.SelectGroup")));
      // headerPanel.prepend(CreateElement("strong", "", game.i18n.localize("Select a group before uploading.")));
    }
    this.element.querySelectorAll("[data-identifier]").forEach(buttonElement => {
      buttonElement.setAttribute("aria-pressed", String(buttonElement.getAttribute("data-identifier") === this.Selected));
      buttonElement.disabled = this.Busy;
    });
    this.element.querySelector(".qu-toggle input").disabled = this.Busy;
    this.element.querySelector(".qu-drop").disabled = this.Busy === true || CanUpload() === false || (this.All === false && activeGroups.length === 0);
    this.element.querySelector(".qu-pad").setAttribute("aria-busy", String(this.Busy));
  }

  /* Render per-file progress as plain text; untrusted filenames never become HTML. */
  UpdateResults() {
    if (this.rendered !== true) return;
    let resultsList = this.element.querySelector(".qu-results");
    resultsList.replaceChildren(...this.History.map(resultEntry => {
      let statusText = game.i18n.localize("QFU.Uploading");
      // let statusText = game.i18n.localize("Uploading");
      if (resultEntry.Status === "Uploaded") {
        statusText = game.i18n.localize("QFU.Uploaded");
        // statusText = game.i18n.localize("Uploaded");
      } else if (resultEntry.Status === "Failed") {
        statusText = game.i18n.localize("QFU.Failed");
        // statusText = game.i18n.localize("Failed");
      }
      let resultText = `${statusText}: ${resultEntry.Name}`;
      if (resultEntry.Path.length > 0) resultText += ` → ${resultEntry.Path}`;
      if (resultEntry.Error !== undefined) resultText += ` — ${resultEntry.Error}`;
      let resultElement = CreateElement("li", "", resultText);
      if (resultEntry.Status === "Failed") resultElement.classList.add("qu-error");
      return resultElement;
    }));
    let statusText = game.i18n.localize("QFU.ReadyStatus");
    // let statusText = game.i18n.localize("Ready to upload");
    if (this.Busy === true) {
      statusText = game.i18n.localize("QFU.UploadingStatus");
      // statusText = game.i18n.localize("Uploading files…");
    } else if (this.History.length > 0) {
      statusText = game.i18n.localize("QFU.FinishedStatus");
      // statusText = game.i18n.localize("Batch finished. See results below.");
    }
    this.element.querySelector(".qu-status").textContent = statusText;
  }

  /* Upload a File array with a validated snapshot; return Promise<void>. */
  async UploadFiles(uploadFiles) {
    if (this.Busy === true) {
      ui.notifications.warn(game.i18n.localize("QFU.WaitBatch"));
      // ui.notifications.warn(game.i18n.localize("Wait for the current batch to finish."));
      return;
    }
    if (CanUpload() === false) {
      ui.notifications.warn(game.i18n.localize("QFU.NoPermission"));
      // ui.notifications.warn(game.i18n.localize("You do not have permission to upload files."));
      return;
    }
    if (uploadFiles.length === 0) {
      ui.notifications.warn(game.i18n.localize("QFU.LocalFilesOnly"));
      // ui.notifications.warn(game.i18n.localize("Drop local files; folders and links are not supported."));
      return;
    }
    try {
      let moduleSettings = ValidateSettings(ReadSettings());
      if (this.All === false && GetActiveGroups(moduleSettings, false, this.Selected).length === 0) {
        throw new Error(game.i18n.localize("QFU.SelectGroup"));
        // throw new Error(game.i18n.localize("Select a group before uploading."));
      }
      this.Snapshot = moduleSettings;
    } catch (settingsError) { ui.notifications.error(settingsError.message); return; }
    this.Busy = true;
    this.History = [];
    this.UpdateSelection();
    this.UpdateResults();
    try {
      await UploadBatch(uploadFiles, this.Snapshot, this.All, this.Selected,
        foundry.applications.apps.FilePicker.implementation, resultEntry => {
          if (this.History.at(-1)?.Status === "Uploading") this.History[this.History.length - 1] = resultEntry;
          else this.History.push(resultEntry);
          this.UpdateResults();
        });
    } finally {
      this.Busy = false;
      this.Snapshot = null;
      if (this.rendered === true) await this.render({ force: true });
    }
  }

  async close(closeOptions) {
    if (this.Busy === true) {
      ui.notifications.warn(game.i18n.localize("QFU.WaitBatch"));
      // ui.notifications.warn(game.i18n.localize("Wait for the current batch to finish."));
      return this;
    }
    await super.close(closeOptions);
    this.Observer?.disconnect();
    return this;
  }
}
