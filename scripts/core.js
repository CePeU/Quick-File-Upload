import { QFU_SETTINGS, QFU_MODULE_ID, QFU_SCHEMA_VERSION } from "./settings.js";
import { ExecuteActions, ValidateActions } from "./actions.js";

/* Resolve a pixel/percentage string against referenceSize (number).
 * Returns a positive finite pixel count, or throws on invalid input.
 */
export function ResolveDimension(sizeValue, referenceSize) {
  let sizeText = String(sizeValue).trim();
  let pixelSize = parseFloat(sizeText);
  if (/^\d+(?:\.\d+)?%?$/.test(sizeText) === false || Number.isFinite(pixelSize) === false || pixelSize <= 0) {
    throw new Error(game.i18n.localize("QFU.InvalidSize"));
    // throw new Error(game.i18n.localize("Sizes must be positive numbers (pixels) or percentages, such as 720 or 75%."));
  }
  if (sizeText.endsWith("%") === true) pixelSize *= referenceSize / 100;
  return pixelSize;
}

/* Normalize a plain or URI-encoded relative directory string. Decode once
 * before validation so spaces work and encoded traversal cannot bypass checks.
 * Returns a decoded path safe to normalize again during settings validation.
 */
export function NormalizePath(pathValue) {
  if (typeof pathValue !== "string") {
    throw new Error(game.i18n.localize("QFU.InvalidPath"));
    // throw new Error(game.i18n.localize("Use a relative user-data folder, such as uploads/images; absolute paths and traversal are not allowed."));
  }
  let pathText;
  try { pathText = decodeURIComponent(pathValue.trim()).replaceAll("\\", "/"); }
  catch {
    throw new Error(game.i18n.localize("QFU.InvalidPath"));
    // throw new Error(game.i18n.localize("Use a relative user-data folder, such as uploads/images; absolute paths and traversal are not allowed."));
  }
  if (pathText.length === 0 || pathText.startsWith("/") === true || /[:?#%\u0000-\u001f]/.test(pathText) === true
    || pathText.split("/").some(pathPart => pathPart === ".." || pathPart === ".") === true) {
    throw new Error(game.i18n.localize("QFU.InvalidPath"));
    // throw new Error(game.i18n.localize("Use a relative user-data folder, such as uploads/images; absolute paths and traversal are not allowed."));
  }
  return pathText.replace(/\/+$/, "").replace(/\/+/g, "/");
}

/* Compile a plain regex or /pattern/flags string; blank patterns return null. */
export function CompilePattern(patternText) {
  if (patternText.trim().length === 0) return null;
  let literalMatch = patternText.match(/^\/(.*)\/([a-z]*)$/s);
  if (literalMatch !== null) return new RegExp(literalMatch[1], literalMatch[2]);
  return new RegExp(patternText);
}

/* Copy a current grouped configuration and fill omitted scalar defaults.
 * Takes a settings object with Groups; returns a detached settings object.
 */
export function CopySettings(sourceSettings) {
  if (sourceSettings === null || typeof sourceSettings !== "object" || Array.isArray(sourceSettings) === true
    || Object.hasOwn(sourceSettings, "Groups") === false) {
    throw new Error(game.i18n.localize("QFU.InvalidSettings"));
    // throw new Error(game.i18n.localize("Settings must be a configuration object containing a Groups array."));
  }
  let copiedSettings = structuredClone(QFU_SETTINGS);
  for (let settingName of Object.keys(QFU_SETTINGS)) {
    if (Object.hasOwn(sourceSettings, settingName) === true) copiedSettings[settingName] = structuredClone(sourceSettings[settingName]);
  }
  return copiedSettings;
}

/* Validate and normalize edited/imported settings. Placement is "main", "main-sub" or
 * "sub"; Order is -1 (last) or a zero-based index; Limit is KB, 0 unlimited.
 * Returns a fresh settings object, throwing before any settings are written.
 */
export function ValidateSettings(sourceSettings) {
  let cleanSettings = CopySettings(sourceSettings);
  ValidateActions(cleanSettings);
  cleanSettings.Fallback = NormalizePath(cleanSettings.Fallback);
  for (let settingName of ["Width", "Height", "Padwidth", "Padheight", "Headerheight"]) ResolveDimension(cleanSettings[settingName], 100);
  for (let settingName of ["Rulelight", "Ruledark"]) {
    if (typeof cleanSettings[settingName] !== "string" || /^#[\da-f]{6}$/i.test(cleanSettings[settingName]) === false) {
      throw new Error(game.i18n.localize("QFU.InvalidRuleColor"));
      // throw new Error(game.i18n.localize("Choose valid hex colors for alternating rule rows in both themes."));
    }
  }
  if (typeof cleanSettings.Color !== "string" || /^#[\da-f]{6}$/i.test(cleanSettings.Color) === false
    || typeof cleanSettings.Label !== "string" || ["main", "main-sub", "sub"].includes(cleanSettings.Placement) === false
    || typeof cleanSettings.Parent !== "string" || cleanSettings.Parent.trim().length === 0) {
    throw new Error(game.i18n.localize("QFU.InvalidAppearance"));
    // throw new Error(game.i18n.localize("Check the pad name, hex color, button placement, and parent control ID."));
  }
  if (["string", "number"].includes(typeof cleanSettings.Order) === false || String(cleanSettings.Order).trim().length === 0) {
    throw new Error(game.i18n.localize("QFU.InvalidOrder"));
    // throw new Error(game.i18n.localize("Button position must be -1 (last) or a non-negative integer."));
  }
  cleanSettings.Order = Number(cleanSettings.Order);
  if (Number.isInteger(cleanSettings.Order) === false || cleanSettings.Order < -1) {
    throw new Error(game.i18n.localize("QFU.InvalidOrder"));
    // throw new Error(game.i18n.localize("Button position must be -1 (last) or a non-negative integer."));
  }
  if (Array.isArray(cleanSettings.Groups) === false) {
    throw new Error(game.i18n.localize("QFU.InvalidGroups"));
    // throw new Error(game.i18n.localize("Groups and their Rules must be arrays."));
  }
  let groupIdentifiers = new Set();
  cleanSettings.Groups = cleanSettings.Groups.map(groupEntry => {
    if (groupEntry === null || typeof groupEntry !== "object" || typeof groupEntry.Identifier !== "string"
      || groupEntry.Identifier.trim().length === 0 || groupIdentifiers.has(groupEntry.Identifier.trim()) === true) {
      throw new Error(game.i18n.localize("QFU.InvalidIdentifier"));
      // throw new Error(game.i18n.localize("Group identifiers must be non-empty and unique."));
    }
    let groupIdentifier = groupEntry.Identifier.trim();
    groupIdentifiers.add(groupIdentifier);
    let excludedFlag = groupEntry.Excluded;
    if (excludedFlag === undefined) excludedFlag = false;
    if (typeof excludedFlag !== "boolean") {
      throw new Error(game.i18n.localize("QFU.InvalidExclusion"));
      // throw new Error(game.i18n.localize("A group's exclusion flag must be true or false."));
    }
    if (Array.isArray(groupEntry.Rules) === false) {
      throw new Error(game.i18n.localize("QFU.InvalidGroups"));
      // throw new Error(game.i18n.localize("Groups and their Rules must be arrays."));
    }
    let defaultCount = 0;
    let groupRules = groupEntry.Rules.map((ruleEntry, ruleIndex) => {
      try {
        if (ruleEntry === null || typeof ruleEntry !== "object" || typeof ruleEntry.Name !== "string"
          || ruleEntry.Name.trim().length === 0 || typeof ruleEntry.Regex !== "string") {
          throw new Error(game.i18n.localize("QFU.InvalidRule"));
          // throw new Error(game.i18n.localize("Each rule needs a name and a regex string (which may be blank)."));
        }
        CompilePattern(ruleEntry.Regex);
        let limitValue = ruleEntry.Limit;
        if (limitValue === undefined) limitValue = 0;
        if (["string", "number"].includes(typeof limitValue) === false || String(limitValue).trim().length === 0) {
          throw new Error(game.i18n.localize("QFU.InvalidLimit"));
          // throw new Error(game.i18n.localize("Maximum file size must be a non-negative number; 0 means unlimited."));
        }
        let sizeLimit = Number(limitValue);
        if (Number.isFinite(sizeLimit) === false || sizeLimit < 0) {
          throw new Error(game.i18n.localize("QFU.InvalidLimit"));
          // throw new Error(game.i18n.localize("Maximum file size must be a non-negative number; 0 means unlimited."));
        }
        let defaultFlag = ruleEntry.Default ?? false;
        if (typeof defaultFlag !== "boolean") {
          throw new Error(game.i18n.localize("QFU.InvalidDefault"));
          // throw new Error(game.i18n.localize("A rule's Default flag must be true or false."));
        }
        if (defaultFlag === true) defaultCount++;
        let cleanRule = { Name: ruleEntry.Name.trim(), Regex: ruleEntry.Regex, Path: NormalizePath(ruleEntry.Path), Limit: sizeLimit, Default: defaultFlag };
        if (ruleEntry.Action !== undefined) {
          ValidateActions(cleanSettings, ruleEntry.Action);
          cleanRule.Action = structuredClone(ruleEntry.Action);
        }
        return cleanRule;
      } catch (validationError) {
        let errorText = game.i18n.localize("QFU.RuleError");
        // let errorText = game.i18n.localize("{group}, rule {number}: {error}");
        throw new Error(errorText.replace("{group}", () => groupIdentifier)
          .replace("{number}", () => String(ruleIndex + 1)).replace("{error}", () => validationError.message));
      }
    });
    if (defaultCount > 1) {
      let errorText = game.i18n.localize("QFU.MultipleDefaults");
      // let errorText = game.i18n.localize("{group}: choose at most one default rule.");
      throw new Error(errorText.replace("{group}", () => groupIdentifier));
    }
    let cleanGroup = { Identifier: groupIdentifier, Excluded: excludedFlag, Rules: groupRules };
    if (groupEntry.Color !== undefined || groupEntry.Overview !== undefined) {
      if (typeof groupEntry.Color !== "string" || /^#[\da-f]{6}$/i.test(groupEntry.Color) === false
        || typeof groupEntry.Overview !== "boolean") {
        throw new Error(game.i18n.localize("QFU.InvalidGroupColor"));
        // throw new Error(game.i18n.localize("Choose a valid group color and overview flag."));
      }
      cleanGroup.Color = groupEntry.Color;
      cleanGroup.Overview = groupEntry.Overview;
    }
    return cleanGroup;
  });
  return cleanSettings;
}

/* Parse JSON text into validated current grouped settings. Reject other schemas
 * and unknown export versions rather than silently dropping data.
 */
export function ParseSettings(jsonText) {
  let parsedData;
  try { parsedData = JSON.parse(jsonText); }
  catch {
    throw new Error(game.i18n.localize("QFU.InvalidJson"));
    // throw new Error(game.i18n.localize("The selected file does not contain valid JSON."));
  }
  if (parsedData !== null && typeof parsedData === "object" && Object.hasOwn(parsedData, "Version") === true) {
    if (parsedData.Version !== QFU_SCHEMA_VERSION || parsedData.Module !== QFU_MODULE_ID) {
      throw new Error(game.i18n.localize("QFU.InvalidExport"));
      // throw new Error(game.i18n.localize("This export belongs to another module or an unsupported settings version."));
    }
    parsedData = parsedData.Settings;
  }
  if (parsedData === null || typeof parsedData !== "object" || Array.isArray(parsedData) === true
    || Object.hasOwn(parsedData, "Groups") === false) {
    throw new Error(game.i18n.localize("QFU.InvalidSettings"));
    // throw new Error(game.i18n.localize("Settings must be a configuration object containing a Groups array."));
  }
  return ValidateSettings(parsedData);
}

/* Serialize a settings object to versioned JSON text after validation. */
export function SerializeSettings(sourceSettings) {
  return JSON.stringify({ Module: QFU_MODULE_ID, Version: QFU_SCHEMA_VERSION, Settings: ValidateSettings(sourceSettings) }, null, 2);
}

/* Return ordered groups: allGroups true skips excluded groups; false includes
 * the selectedIdentifier (string) regardless of exclusion. Returns an array.
 */
export function GetActiveGroups(moduleSettings, allGroups, selectedIdentifier) {
  if (allGroups === true) return moduleSettings.Groups.filter(groupEntry => groupEntry.Excluded !== true);
  return moduleSettings.Groups.filter(groupEntry => groupEntry.Identifier === selectedIdentifier);
}

/* Return a fallback path. All-group mode always uses the module fallback.
 * Selected-group mode uses that group's default rule when one is defined.
 */
export function ResolveFallback(activeGroups, moduleFallback, allGroups) {
  if (allGroups === false) {
    let defaultRule = activeGroups[0]?.Rules.find(ruleEntry => ruleEntry.Default === true);
    if (defaultRule !== undefined) return defaultRule.Path;
  }
  return moduleFallback;
}

/* Route a File-like {name:string,size:number} through ordered groups. allGroups
 * is true (all groups) or false (only selectedIdentifier). Returns a path string.
 * Regex is tested first, size second; defaults are used only after all rules.
 */
export function ResolveDestination(uploadFile, moduleSettings, allGroups, selectedIdentifier) {
  return ResolveRouting(uploadFile, moduleSettings, allGroups, selectedIdentifier).Path;
}

/* Return the destination and the matching rule, including selected defaults. */
export function ResolveRouting(uploadFile, moduleSettings, allGroups, selectedIdentifier) {
  let activeGroups = GetActiveGroups(moduleSettings, allGroups, selectedIdentifier);
  if (allGroups === false && activeGroups.length === 0) {
    throw new Error(game.i18n.localize("QFU.SelectGroup"));
    // throw new Error(game.i18n.localize("Select a group before uploading."));
  }
  for (let groupEntry of activeGroups) {
    for (let ruleEntry of groupEntry.Rules) {
      let compiledPattern = CompilePattern(ruleEntry.Regex);
      if (compiledPattern === null || compiledPattern.test(uploadFile.name) === false) continue;
      if (ruleEntry.Limit > 0 && uploadFile.size > ruleEntry.Limit * 1024) continue;
      return { Path: ruleEntry.Path, Rule: ruleEntry };
    }
  }
  let defaultRule = null;
  if (allGroups === false) defaultRule = activeGroups[0]?.Rules.find(ruleEntry => ruleEntry.Default === true) ?? null;
  return { Path: ResolveFallback(activeGroups, moduleSettings.Fallback, allGroups), Rule: defaultRule };
}

/* Insert a Foundry control at positionIndex: -1 last, 0 first, larger integers
 * indexed or appended. Mutates controlRecord and its Foundry order properties.
 */
export function InsertControl(controlRecord, controlName, controlValue, positionIndex) {
  let orderedEntries = Object.entries(controlRecord).filter(([entryName]) => entryName !== controlName)
    .sort((firstEntry, secondEntry) => (firstEntry[1].order ?? 0) - (secondEntry[1].order ?? 0));
  let insertIndex = Math.min(positionIndex, orderedEntries.length);
  if (positionIndex === -1) insertIndex = orderedEntries.length;
  orderedEntries.splice(insertIndex, 0, [controlName, controlValue]);
  orderedEntries.forEach(([entryName, controlEntry], entryIndex) => { controlEntry.order = entryIndex; controlRecord[entryName] = controlEntry; });
}

/* Ensure a relative directory exists using a Foundry FilePicker class and a
 * Set of known paths. Returns Promise<void>; creation errors propagate.
 */
export async function EnsureDirectory(filePicker, targetPath, knownPaths = new Set()) {
  if (knownPaths.has(targetPath) === true) return;
  try {
    let browseResult = await filePicker.browse("data", targetPath);
    if (Boolean(browseResult?.error) === true) throw new Error(browseResult.error);
    knownPaths.add(targetPath);
    return;
  } catch {
    // Create missing parents one segment at a time.
  }
  let currentPath = "";
  for (let pathSegment of targetPath.split("/")) {
    if (currentPath.length > 0) currentPath += "/";
    currentPath += pathSegment;
    if (knownPaths.has(currentPath) === true) continue;
    try {
      let browseResult = await filePicker.browse("data", currentPath);
      if (Boolean(browseResult?.error) === true) throw new Error(browseResult.error);
    } catch {
      try {
        let createResult = await filePicker.createDirectory("data", currentPath, { notify: false });
        if (Boolean(createResult?.error) === true) throw new Error(createResult.error);
      } catch (createError) {
        // A concurrent client may have created the folder after the browse.
        let browseResult = await filePicker.browse("data", currentPath).catch(() => { throw createError; });
        if (Boolean(browseResult?.error) === true) throw createError;
      }
    }
    knownPaths.add(currentPath);
  }
}

/* Upload File[] using an immutable settings snapshot and boolean routing mode.
 * ReportResult receives {Name,Path,Status,Error}; Status is "Uploading",
 * "Uploaded", or "Failed". Returns Promise<void>, continuing after each failure.
 */
export async function UploadBatch(uploadFiles, moduleSettings, allGroups, selectedIdentifier, filePicker, ReportResult) {
  let knownPaths = new Set();
  for (let uploadFile of uploadFiles) {
    let targetPath = "";
    try {
      let routeResult = ResolveRouting(uploadFile, moduleSettings, allGroups, selectedIdentifier);
      targetPath = routeResult.Path;
      ReportResult({ Name: uploadFile.name, Path: targetPath, Status: "Uploading" });
      await EnsureDirectory(filePicker, targetPath, knownPaths);
      let uploadResult = await filePicker.upload("data", targetPath, uploadFile, {}, { notify: false });
      if (Boolean(uploadResult?.error) === true || typeof uploadResult?.path !== "string" || uploadResult.path.length === 0) {
        let errorMessage = uploadResult?.error ?? game.i18n.localize("QFU.UnconfirmedUpload");
        // let errorMessage = uploadResult?.error ?? game.i18n.localize("The server did not confirm the upload.");
        throw new Error(errorMessage);
      }
      targetPath = uploadResult.path;
      try { await ExecuteActions(uploadFile, uploadResult.path, routeResult.Rule?.Action, moduleSettings); }
      catch (actionError) {
        ReportResult({ Name: uploadFile.name, Path: targetPath, Status: "Uploaded", Error: actionError.message });
        continue;
      }
      ReportResult({ Name: uploadFile.name, Path: uploadResult.path, Status: "Uploaded" });
    } catch (uploadError) {
      ReportResult({ Name: uploadFile.name, Path: targetPath, Status: "Failed", Error: uploadError.message ?? String(uploadError) });
    }
  }
}
