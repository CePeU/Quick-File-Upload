import { QFU_MODULE_ID, QFU_SETTINGS_KEY, QFU_SETTINGS } from "./settings.js";
import { ResolveDimension, InsertControl } from "./core.js";
import { ReadSettings } from "./storage.js";
import { ApplyRuleColors } from "./ui.js";
import { UploadApplication, CanUpload } from "./upload.js";
import { ConfigurationApplication, HelpApplication, ControlsApplication, LayoutApplication, ActionsApplication } from "./configuration.js";

let uploadWindow = null;

/* Open or focus the singleton upload window. Returns a Promise resolving to
 * the app, or undefined when permission is absent. Reopening resolves sizes.
 */
export async function OpenUpload() {
  if (CanUpload() === false) {
    ui.notifications.warn(game.i18n.localize("QFU.NoPermission"));
    // ui.notifications.warn(game.i18n.localize("You do not have permission to upload files."));
    return;
  }
  if (uploadWindow === null) uploadWindow = new UploadApplication();
  if (uploadWindow.rendered !== true && uploadWindow.Busy === false) {
    let moduleSettings = ReadSettings();
    uploadWindow.Baseline = {
      Width: Math.min(window.innerWidth, ResolveDimension(moduleSettings.Width, window.innerWidth)),
      Height: Math.min(window.innerHeight, ResolveDimension(moduleSettings.Height, window.innerHeight))
    };
    await uploadWindow.render({ force: true, position: { width: uploadWindow.Baseline.Width, height: uploadWindow.Baseline.Height } });
  } else uploadWindow.bringToFront();
  return uploadWindow;
}

/* Open the settings editor for a GM; return its rendering promise or undefined. */
export function OpenSettings() {
  if (game.user.isGM === true) return new ConfigurationApplication().render({ force: true });
}

Hooks.once("init", () => {
  game.settings.register(QFU_MODULE_ID, QFU_SETTINGS_KEY, {
    scope: "world", config: false, type: Object, default: structuredClone(QFU_SETTINGS),
    onChange: () => {
      ApplyRuleColors(ReadSettings());
      ui.controls?.render({ force: true, reset: true });
      if (uploadWindow?.rendered === true && uploadWindow.Busy === false) uploadWindow.render({ force: true });
    }
  });
  ApplyRuleColors(ReadSettings());
  game.settings.registerMenu(QFU_MODULE_ID, "configure", {
    name: "QFU.Title", label: "QFU.ConfigurationTitle", hint: "QFU.SettingsHint",
    // name: "Quick File Upload", label: "Quick File Upload Configuration", hint: "Manage ordered groups, routing rules, appearance, and JSON import/export.",
    icon: "fa-solid fa-cloud-arrow-up", type: ConfigurationApplication, restricted: true
  });
  game.settings.registerMenu(QFU_MODULE_ID, "help", {
    name: "QFU.HelpTitle", label: "QFU.HelpButton", hint: "QFU.HelpIntro",
    // name: "Quick File Upload — Help", label: "Settings help", hint: "Configure ordered groups of upload rules. Expand a topic below for details.",
    icon: "fa-solid fa-circle-question", type: HelpApplication, restricted: false
  });
  game.settings.registerMenu(QFU_MODULE_ID, "controls", {
    name: "QFU.ControlsTitle", label: "QFU.ControlsTitle", icon: "fa-solid fa-bars", type: ControlsApplication, restricted: true
    // name: "Scene controls", label: "Scene controls", icon: "fa-solid fa-bars", type: ControlsApplication, restricted: true
  });
  game.settings.registerMenu(QFU_MODULE_ID, "layout", {
    name: "QFU.LayoutTitle", label: "QFU.LayoutTitle", icon: "fa-solid fa-palette", type: LayoutApplication, restricted: true
    // name: "Window and appearance", label: "Window and appearance", icon: "fa-solid fa-palette", type: LayoutApplication, restricted: true
  });
  game.settings.registerMenu(QFU_MODULE_ID, "actions", {
    name: "QFU.ActionDefaults", label: "QFU.ActionDefaults", icon: "fa-solid fa-bolt", type: ActionsApplication, restricted: true
    // name: "Upload actions and clipboard defaults", label: "Upload actions and clipboard defaults", icon: "fa-solid fa-bolt", type: ActionsApplication, restricted: true
  });
  game.modules.get(QFU_MODULE_ID).api = { Upload: OpenUpload, Settings: OpenSettings };
});

Hooks.on("getSceneControlButtons", controlRecord => {
  if (CanUpload() === false) return;
  let moduleSettings = ReadSettings();
  let uploadTool = {
    name: QFU_MODULE_ID, title: "QFU.Title", icon: "fa-solid fa-cloud-arrow-up",
    // name: QFU_MODULE_ID, title: "Quick File Upload", icon: "fa-solid fa-cloud-arrow-up",
    button: true, visible: true, onChange: OpenUpload
  };
  if (moduleSettings.Placement === "sub" && controlRecord[moduleSettings.Parent] !== undefined) {
    controlRecord[moduleSettings.Parent].tools ??= {};
    InsertControl(controlRecord[moduleSettings.Parent].tools, QFU_MODULE_ID, uploadTool, moduleSettings.Order);
  } else {
    let mainControl = {
      name: QFU_MODULE_ID, title: "QFU.Title", icon: uploadTool.icon, visible: true,
      // name: QFU_MODULE_ID, title: "Quick File Upload", icon: uploadTool.icon, visible: true,
      tools: {}
    };
    if (moduleSettings.Placement === "main-sub") {
      // Leave the button tool inactive so every submenu click invokes it.
      mainControl.tools[QFU_MODULE_ID] = { ...uploadTool, order: 0 };
    } else {
      mainControl.onChange = (controlEvent, activeFlag) => { if (activeFlag === true) return OpenUpload(); };
    }
    InsertControl(controlRecord, QFU_MODULE_ID, mainControl, moduleSettings.Order);
  }
});

// Main controls are selected only once by Foundry. Intercept this action button
// before delegated selection so every click opens it without an empty tool menu.
Hooks.on("renderSceneControls", controlApplication => {
  if (ReadSettings().Placement === "main-sub") return;
  let controlButton = controlApplication.element.querySelector(`[data-control="${QFU_MODULE_ID}"]`);
  if (controlButton === null) return;
  controlButton.onclick = controlEvent => {
    controlEvent.preventDefault();
    controlEvent.stopImmediatePropagation();
    OpenUpload();
  };
});
