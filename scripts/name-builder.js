// This library deliberately has no Foundry or DOM dependency. Storage is supplied
// by the caller, so the same naming configuration can be reused in other apps.
export const QFU_NAME_TYPES = Object.freeze(["date", "separator", "timestamp", "random", "hash", "group"]);
export const QFU_SHA_ROUNDS = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/* Compute SHA-256 for Uint8Array bytes, including on HTTP Foundry worlds where
 * SubtleCrypto is unavailable. Returns a 64-character lowercase hexadecimal hash.
 */
export function HashNameBytes(contentBytes) {
  let paddedLength = Math.ceil((contentBytes.length + 9) / 64) * 64;
  let paddedBytes = new Uint8Array(paddedLength);
  paddedBytes.set(contentBytes);
  paddedBytes[contentBytes.length] = 0x80;
  let paddedView = new DataView(paddedBytes.buffer);
  let bitLength = BigInt(contentBytes.length) * 8n;
  paddedView.setBigUint64(paddedLength - 8, bitLength);
  let hashWords = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  let messageWords = new Uint32Array(64);
  function RotateWord(wordValue, bitCount) { return (wordValue >>> bitCount) | (wordValue << (32 - bitCount)); }
  for (let blockOffset = 0; blockOffset < paddedLength; blockOffset += 64) {
    for (let wordIndex = 0; wordIndex < 16; wordIndex++) messageWords[wordIndex] = paddedView.getUint32(blockOffset + wordIndex * 4);
    for (let wordIndex = 16; wordIndex < 64; wordIndex++) {
      let earlierWord = messageWords[wordIndex - 15];
      let recentWord = messageWords[wordIndex - 2];
      let firstSigma = RotateWord(earlierWord, 7) ^ RotateWord(earlierWord, 18) ^ (earlierWord >>> 3);
      let secondSigma = RotateWord(recentWord, 17) ^ RotateWord(recentWord, 19) ^ (recentWord >>> 10);
      messageWords[wordIndex] = messageWords[wordIndex - 16] + firstSigma + messageWords[wordIndex - 7] + secondSigma;
    }
    let workingWords = Array.from(hashWords);
    for (let roundIndex = 0; roundIndex < 64; roundIndex++) {
      let firstSigma = RotateWord(workingWords[0], 2) ^ RotateWord(workingWords[0], 13) ^ RotateWord(workingWords[0], 22);
      let secondSigma = RotateWord(workingWords[4], 6) ^ RotateWord(workingWords[4], 11) ^ RotateWord(workingWords[4], 25);
      let choiceWord = (workingWords[4] & workingWords[5]) ^ (~workingWords[4] & workingWords[6]);
      let majorityWord = (workingWords[0] & workingWords[1]) ^ (workingWords[0] & workingWords[2]) ^ (workingWords[1] & workingWords[2]);
      let firstSum = (workingWords[7] + secondSigma + choiceWord + QFU_SHA_ROUNDS[roundIndex] + messageWords[roundIndex]) >>> 0;
      let secondSum = (firstSigma + majorityWord) >>> 0;
      workingWords = [(firstSum + secondSum) >>> 0, workingWords[0], workingWords[1], workingWords[2],
        (workingWords[3] + firstSum) >>> 0, workingWords[4], workingWords[5], workingWords[6]];
    }
    for (let wordIndex = 0; wordIndex < 8; wordIndex++) hashWords[wordIndex] += workingWords[wordIndex];
  }
  return Array.from(hashWords, wordValue => wordValue.toString(16).padStart(8, "0")).join("");
}

/* Validate a {Base, Parts, Presets} configuration and return a detached copy.
 * Parts and Presets contain {Type, Value}; Value defines a date pattern,
 * separator, or decimal digit count. Other token types use an empty Value.
 */
export function ValidateNameSettings(nameSettings) {
  if (nameSettings === null || typeof nameSettings !== "object" || typeof nameSettings.Base !== "string"
    || nameSettings.Base.length > 120 || Array.isArray(nameSettings.Parts) === false
    || Array.isArray(nameSettings.Presets) === false) throw new Error("Invalid name settings");
  for (let tokenList of [nameSettings.Parts, nameSettings.Presets]) {
    if (tokenList.length > 64) throw new Error("Too many name tokens");
    for (let tokenEntry of tokenList) {
      if (tokenEntry === null || typeof tokenEntry !== "object" || QFU_NAME_TYPES.includes(tokenEntry.Type) === false
        || typeof tokenEntry.Value !== "string" || tokenEntry.Value.length > 120) throw new Error("Invalid name token");
      if (tokenEntry.Type === "random" && /^(?:[1-9]|[12][0-9]|3[0-2])$/.test(tokenEntry.Value) === false) {
        throw new Error("Random digits must be between 1 and 32");
      }
    }
  }
  return structuredClone(nameSettings);
}

/* Remove directory separators, reserved filename characters and control bytes.
 * Input is a string; returns a portable filename component without an extension.
 */
export function CleanNamePart(nameText) {
  return nameText.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "").replace(/^\.+|[. ]+$/g, "").trim();
}

/* Expand YYYY, YY, MMM, MM, DD, HH, mm, ss in a pattern using local time.
 * MMM uses the caller's locale (default en); other characters remain literal.
 */
export function FormatNameDate(dateValue, datePattern, localeName = "en") {
  let dateParts = {
    YYYY: String(dateValue.getFullYear()), YY: String(dateValue.getFullYear()).slice(-2),
    MMM: new Intl.DateTimeFormat(localeName, { month: "short" }).format(dateValue),
    MM: String(dateValue.getMonth() + 1).padStart(2, "0"), DD: String(dateValue.getDate()).padStart(2, "0"),
    HH: String(dateValue.getHours()).padStart(2, "0"), mm: String(dateValue.getMinutes()).padStart(2, "0"),
    ss: String(dateValue.getSeconds()).padStart(2, "0")
  };
  return datePattern.replace(/YYYY|MMM|YY|MM|DD|HH|mm|ss/g, tokenName => dateParts[tokenName]);
}

/* Generate a filename stem from a configuration and optional context:
 * {Date: Date, Group: string, Content: Blob, Locale: string}. Hash tokens use
 * SHA-256 of Content, or the empty byte sequence if Content is omitted.
 * Returns Promise<string>; a blank result becomes clipboard_<epoch seconds>.
 */
export async function GenerateFileName(nameSettings, nameContext = {}) {
  let cleanSettings = ValidateNameSettings(nameSettings);
  let dateValue = nameContext.Date ?? new Date();
  let nameText = cleanSettings.Base;
  let contentHash = null;
  for (let tokenEntry of cleanSettings.Parts) {
    if (tokenEntry.Type === "separator") nameText += tokenEntry.Value;
    if (tokenEntry.Type === "date") nameText += FormatNameDate(dateValue, tokenEntry.Value, nameContext.Locale);
    if (tokenEntry.Type === "timestamp") nameText += Math.floor(dateValue.getTime() / 1000);
    if (tokenEntry.Type === "group") nameText += nameContext.Group ?? "";
    if (tokenEntry.Type === "random") {
      // Rejection sampling avoids the bias of taking arbitrary bytes modulo 10.
      let randomText = "";
      while (randomText.length < Number(tokenEntry.Value)) {
        let randomBytes = crypto.getRandomValues(new Uint8Array(32));
        for (let byteValue of randomBytes) {
          if (byteValue < 250 && randomText.length < Number(tokenEntry.Value)) randomText += byteValue % 10;
        }
      }
      nameText += randomText;
    }
    if (tokenEntry.Type === "hash") {
      if (contentHash === null) {
        let contentBytes = new ArrayBuffer(0);
        if (nameContext.Content !== undefined) contentBytes = await nameContext.Content.arrayBuffer();
        if (globalThis.crypto?.subtle !== undefined) {
          let hashBytes = await crypto.subtle.digest("SHA-256", contentBytes);
          contentHash = Array.from(new Uint8Array(hashBytes), byteValue => byteValue.toString(16).padStart(2, "0")).join("");
        } else contentHash = HashNameBytes(new Uint8Array(contentBytes));
      }
      nameText += contentHash;
    }
  }
  return SanitizeFileName(nameText, dateValue);
}

/* Return a portable filename stem, at most 220 characters. Empty names use the
 * clipboard timestamp fallback; Windows device names receive an underscore.
 */
export function SanitizeFileName(nameText, dateValue = new Date()) {
  let cleanName = CleanNamePart(nameText).slice(0, 220).replace(/[. ]+$/g, "");
  if (cleanName.length === 0) cleanName = `clipboard_${Math.floor(dateValue.getTime() / 1000)}`;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleanName) === true) cleanName = `_${cleanName}`;
  return cleanName;
}

/* Bind asynchronous or synchronous storage callbacks to a caller-owned location.
 * Read(location) returns a naming configuration; Write(location, settings) saves
 * it. GenerateName(context) reads fresh settings and returns Promise<string>.
 */
export function CreateNameService({ Read, Write, Location }) {
  return {
    ReadSettings: async () => ValidateNameSettings(await Read(Location)),
    SaveSettings: async nameSettings => Write(Location, ValidateNameSettings(nameSettings)),
    GenerateName: async nameContext => GenerateFileName(await Read(Location), nameContext)
  };
}
