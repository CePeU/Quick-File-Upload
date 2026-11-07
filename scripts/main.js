import { LoadHelpContent, DecorateHelpMenu } from "./help.js";
import { RegisterActionControl, BindActionControl } from "./scene-controls.js";
import { QFU_MODULE_ID, QFU_SETTINGS_KEY, QFU_SETTINGS } from "./settings.js";
import { ResolveDimension } from "./core.js";
import { ReadSettings } from "./storage.js";
import { ApplyRuleColors } from "./ui.js";
import { UploadApplication, CanUpload } from "./upload.js";
import { DecorateFileBrowser } from "./file-browser.js";
import { ConfigurationApplication, HelpApplication, ControlsApplication, LayoutApplication, ActionsApplication, ClipboardApplication } from "./configuration.js";

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
  game.settings.registerMenu(QFU_MODULE_ID, "clipboard", {
    name: "QFU.ClipboardSettings", label: "QFU.ClipboardSettings", icon: "fa-solid fa-clipboard", type: ClipboardApplication, restricted: true
    // name: "Clipboard Import", label: "Clipboard Import", icon: "fa-solid fa-clipboard", type: ClipboardApplication, restricted: true
  });
  game.modules.get(QFU_MODULE_ID).api = { Upload: OpenUpload, Settings: OpenSettings };
});

// Read the client language after Foundry initializes localization. Loading at
// init would use the server's default language before client settings apply.
Hooks.once("i18nInit", async () => {
  if (await LoadHelpContent() !== null) {
    game.settings.registerMenu(QFU_MODULE_ID, "help", {
      name: "QFU.HelpTitle", label: "QFU.HelpButton", hint: "QFU.HelpHint",
      // name: "Quick File Upload — Help", label: "Settings help", hint: "Description and help for Quick File Upload. See also",
      icon: "fa-solid fa-circle-question", type: HelpApplication, restricted: false
    });
  }
});

Hooks.on("getSceneControlButtons", controlRecord => {
  if (CanUpload() === false) return;
  let moduleSettings = ReadSettings();
  RegisterActionControl(controlRecord, {
    Identifier: QFU_MODULE_ID, Title: "QFU.Title", Icon: "fa-solid fa-cloud-arrow-up",
    // Identifier: QFU_MODULE_ID, Title: "Quick File Upload", Icon: "fa-solid fa-cloud-arrow-up",
    Placement: moduleSettings.Placement, Parent: moduleSettings.Parent, Order: moduleSettings.Order
  }, OpenUpload, Number(game.release?.generation ?? 14));
});

Hooks.on("renderSceneControls", controlApplication => {
  if (ReadSettings().Placement === "main-sub") return;
  BindActionControl(controlApplication.element, QFU_MODULE_ID, OpenUpload);
});

Hooks.on("renderSettingsConfig", settingsApplication => DecorateHelpMenu(settingsApplication.element));

Hooks.on("renderFilePicker", filePicker => DecorateFileBrowser(filePicker, () => {
  if (uploadWindow !== null) return { All: uploadWindow.All, Selected: uploadWindow.Selected };
  let moduleSettings = ReadSettings();
  return { All: moduleSettings.Allgroups, Selected: moduleSettings.Groups[0]?.Identifier ?? null };
}));
