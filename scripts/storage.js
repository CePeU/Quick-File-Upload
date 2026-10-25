import { QFU_MODULE_ID, QFU_SETTINGS_KEY, QFU_SETTINGS } from "./settings.js";

/* Read the registered grouped settings through Foundry's public settings API.
 * Returns a detached settings object. No legacy storage is read or migrated.
 */
export function ReadSettings() {
  return { ...structuredClone(QFU_SETTINGS), ...structuredClone(game.settings.get(QFU_MODULE_ID, QFU_SETTINGS_KEY)) };
}
