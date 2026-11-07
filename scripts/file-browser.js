import { ExecuteActions, ExecuteBuiltin } from "./actions.js";
import { ResolveRouting } from "./core.js";
import { ReadSettings } from "./storage.js";

// Keep render bindings and pending actions local to each browser window.
const QFU_BROWSER_STATES = new WeakMap();

/* Describe an existing path without changing its URL. Text is fetched only
 * when a journal text action needs it; no server storage API is called.
 */
export function DescribeFile(savedPath) {
  let fileName = savedPath.split(/[?#]/)[0].split("/").at(-1);
  try { fileName = decodeURIComponent(fileName); }
  catch {
    // Retain malformed literal names without altering the saved URL.
  }
  let fileExtension = fileName.split(".").at(-1).toLowerCase();
  return {
    name: fileName, type: globalThis.CONST?.IMAGE_FILE_EXTENSIONS?.[fileExtension] ?? "",
    text: async () => (await ReadExistingFile(savedPath)).text()
  };
}

/* Read existing server bytes for size-based routing, macro File scope or text
 * import. Returns a Blob and rejects unsuccessful HTTP responses.
 */
async function ReadExistingFile(savedPath) {
  let fileResponse = await fetch(savedPath);
  if (fileResponse.ok !== true) {
    throw new Error(game.i18n.localize("QFU.BrowserReadFailed"));
    // throw new Error(game.i18n.localize("The selected file could not be read."));
  }
  return fileResponse.blob();
}

/* Execute one browser action on an existing path. actionName is players (all
 * players), chat (public image), choose (action dialog), or group (active rules).
 * selectionState contains All:boolean and Selected:string|null. Group actions
 * skip upload-time naming/conversion, retaining macros and the actual path.
 */
export async function ExecuteBrowserAction(savedPath, actionName, selectionState) {
  let moduleSettings = ReadSettings();
  let uploadFile = DescribeFile(savedPath);
  if (actionName === "players") {
    await ExecuteBuiltin(uploadFile, savedPath, "image", {
      ...moduleSettings, Audience: "playersonly", Audienceprompt: false, Journal: ""
    });
  } else if (actionName === "chat") {
    await ExecuteBuiltin(uploadFile, savedPath, "chat", moduleSettings);
  } else if (actionName === "choose") {
    await ExecuteBuiltin(uploadFile, savedPath, "choose", moduleSettings);
  } else if (actionName === "group") {
    // A real File preserves byte-size matching and the existing macro contract.
    let contentBlob = await ReadExistingFile(savedPath);
    let contentType = uploadFile.type;
    if (contentType.length === 0) contentType = contentBlob.type;
    uploadFile = new File([contentBlob], uploadFile.name, { type: contentType });
    let routeResult = ResolveRouting(uploadFile, moduleSettings, selectionState.All, selectionState.Selected);
    await ExecuteActions(uploadFile, savedPath, routeResult.Rule?.Action, moduleSettings);
  }
}

/* Add four non-submit buttons below Select File in a v14 FilePicker. Resolve
 * group selection at click time via GetSelection():{All,Selected}. Repeated and
 * partial renders reuse root listeners and never duplicate the action panel.
 */
export function DecorateFileBrowser(filePicker, GetSelection) {
  let rootElement = filePicker.element;
  let footerElement = rootElement?.querySelector(".form-footer");
  if (filePicker.type === "folder" || footerElement?.querySelector('[type="submit"]') === null
    || footerElement === null || footerElement === undefined) return;
  let browserState = QFU_BROWSER_STATES.get(rootElement);
  if (browserState === undefined) {
    browserState = { Busy: false, Selection: GetSelection };
    QFU_BROWSER_STATES.set(rootElement, browserState);
    // Foundry sets the selected input programmatically during its click action.
    rootElement.addEventListener("click", () => queueMicrotask(() => UpdateBrowserButtons(rootElement, browserState)));
    rootElement.addEventListener("input", () => UpdateBrowserButtons(rootElement, browserState));
    rootElement.addEventListener("change", () => UpdateBrowserButtons(rootElement, browserState));
  }
  browserState.Selection = GetSelection;
  rootElement.querySelector(".qu-browser-actions")?.remove();
  let actionPanel = document.createElement("div");
  actionPanel.className = "qu-browser-actions";
  let actionLabels = [
    ["players", game.i18n.localize("QFU.BrowserPlayers")],
    // ["players", game.i18n.localize("Show to players")],
    ["chat", game.i18n.localize("QFU.BrowserChat")],
    // ["chat", game.i18n.localize("Post to chat")],
    ["choose", game.i18n.localize("QFU.BrowserDrop")],
    // ["choose", game.i18n.localize("Drop action")],
    ["group", game.i18n.localize("QFU.BrowserGroup")]
    // ["group", game.i18n.localize("Group Action")]
  ];
  for (let [actionName, actionLabel] of actionLabels) {
    let actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.dataset.quAction = actionName;
    actionButton.textContent = actionLabel;
    actionButton.addEventListener("click", async clickEvent => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      if (browserState.Busy === true || actionButton.disabled === true) return;
      let savedPath = rootElement.querySelector('[name="file"]')?.value.trim() ?? "";
      if (savedPath.length === 0) return;
      browserState.Busy = true;
      UpdateBrowserButtons(rootElement, browserState);
      try {
        await ExecuteBrowserAction(savedPath, actionName, browserState.Selection());
      } catch (actionError) {
        ui.notifications.error(actionError.message);
      } finally {
        browserState.Busy = false;
        UpdateBrowserButtons(rootElement, browserState);
      }
    });
    actionPanel.append(actionButton);
  }
  footerElement.after(actionPanel);
  UpdateBrowserButtons(rootElement, browserState);
}

/* Refresh availability after selection or render. Direct sharing/chat require
 * an image extension from Foundry's registry; the other actions accept text too.
 */
function UpdateBrowserButtons(rootElement, browserState) {
  let savedPath = rootElement.querySelector('[name="file"]')?.value.trim() ?? "";
  let imageFlag = DescribeFile(savedPath).type.startsWith("image/");
  for (let actionButton of rootElement.querySelectorAll("[data-qu-action]")) {
    actionButton.disabled = browserState.Busy === true || savedPath.length === 0;
    if (["players", "chat"].includes(actionButton.dataset.quAction) === true && imageFlag === false) actionButton.disabled = true;
  }
}
