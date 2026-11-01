import { QFU_MODULE_ID } from "./settings.js";

export const QFU_HELP_STATE = { Content: null };
export const QFU_DOCUMENTATION_URL = "https://cepeu.github.io/Quick-File-Upload/";

/* Load the current language's help without an English fallback. Missing,
 * malformed or unavailable files disable help until the next successful load.
 * Locale variants such as de-DE use their base language's JSON file.
 */
export async function LoadHelpContent() {
  QFU_HELP_STATE.Content = null;
  let languageName = String(game.i18n.lang ?? "en").toLowerCase().split("-")[0];
  if (/^[a-z]{2,3}$/.test(languageName) === false) return null;
  try {
    let helpResponse = await fetch(`modules/${QFU_MODULE_ID}/help/${languageName}_help.json`, { cache: "no-store" });
    if (helpResponse.ok !== true) return null;
    let helpContent = await helpResponse.json();
    if (typeof helpContent?.Intro !== "string" || Array.isArray(helpContent.Topics) === false || helpContent.Topics.length === 0) return null;
    for (let topicEntry of helpContent.Topics) {
      if (typeof topicEntry?.Title !== "string" || Array.isArray(topicEntry.Paragraphs) === false
        || topicEntry.Paragraphs.some(paragraphText => typeof paragraphText !== "string")) return null;
    }
    QFU_HELP_STATE.Content = helpContent;
  } catch {
    // Optional documentation must never interrupt module initialization.
  }
  return QFU_HELP_STATE.Content;
}

/* Add a real link to Foundry's escaped menu hint. Only the known help menu's
 * hint is replaced; JSON prose is rendered separately using textContent.
 */
export function DecorateHelpMenu(rootElement) {
  let helpButton = rootElement.querySelector(`[data-key="${QFU_MODULE_ID}.help"]`);
  let hintElement = helpButton?.closest(".form-group")?.querySelector(".hint");
  if (hintElement === null || hintElement === undefined) return;
  let hintText = game.i18n.localize("QFU.HelpHint");
  // let hintText = game.i18n.localize("Description and help for Quick File Upload. See also");
  let documentationLink = document.createElement("a");
  documentationLink.href = QFU_DOCUMENTATION_URL;
  documentationLink.target = "_blank";
  documentationLink.rel = "noopener noreferrer";
  documentationLink.textContent = game.i18n.localize("QFU.HelpDocumentation");
  // documentationLink.textContent = game.i18n.localize("Github documentation");
  hintElement.replaceChildren(document.createTextNode(`${hintText} `), documentationLink);
}
