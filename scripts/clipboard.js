import { GenerateFileName, ValidateNameSettings } from "./name-builder.js";

export const QFU_IMAGE_FORMATS = Object.freeze({ png: "image/png", webp: "image/webp", jpg: "image/jpeg" });

/* Validate clipboard defaults; errors remain localized at the Foundry boundary. */
export function ValidateClipboard(moduleSettings) {
  try {
    if (Object.hasOwn(QFU_IMAGE_FORMATS, moduleSettings.Clipformat) === false
      || typeof moduleSettings.Clipoverride !== "boolean") throw new Error("Invalid clipboard defaults");
    ValidateNameSettings(moduleSettings.Clipname);
  } catch {
    throw new Error(game.i18n.localize("QFU.InvalidClipboard"));
    // throw new Error(game.i18n.localize("Check the clipboard image format, naming tokens and default routing option."));
  }
}

/* Detect PNG, JPEG and WebP by their bytes, independent of a misleading suffix
 * or MIME label. Other image formats are decoded and converted by the browser.
 * Returns Promise<string>: MIME type, or an empty string for non-images.
 */
export async function DetectImageType(uploadFile) {
  let headerBytes = new Uint8Array(await uploadFile.slice(0, 16).arrayBuffer());
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byteValue, byteIndex) => headerBytes[byteIndex] === byteValue) === true) return "image/png";
  if (headerBytes[0] === 255 && headerBytes[1] === 216 && headerBytes[2] === 255) return "image/jpeg";
  let headerText = String.fromCharCode(...headerBytes);
  if (headerText.startsWith("RIFF") === true && headerText.slice(8, 12) === "WEBP") return "image/webp";
  if (uploadFile.type.startsWith("image/") === true) return uploadFile.type;
  if (/\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(uploadFile.name) === true) return "image/unknown";
  return "";
}

/* Decode an image Blob and encode real PNG/WebP/JPEG bytes using canvas.
 * JPEG transparency is composited onto white. Unsupported encoders fail rather
 * than silently saving PNG data with a .webp/.jpg suffix. Always release images.
 */
export async function ConvertImageBlob(imageBlob, targetType) {
  let imageElement;
  let objectUrl = null;
  try {
    if (typeof globalThis.createImageBitmap === "function") imageElement = await createImageBitmap(imageBlob);
    else {
      objectUrl = URL.createObjectURL(imageBlob);
      imageElement = new Image();
      imageElement.src = objectUrl;
      await imageElement.decode();
    }
    let canvasElement = document.createElement("canvas");
    canvasElement.width = imageElement.width;
    canvasElement.height = imageElement.height;
    let canvasContext = canvasElement.getContext("2d");
    if (canvasContext === null) throw new Error("Canvas unavailable");
    if (targetType === "image/jpeg") {
      canvasContext.fillStyle = "#ffffff";
      canvasContext.fillRect(0, 0, canvasElement.width, canvasElement.height);
    }
    canvasContext.drawImage(imageElement, 0, 0);
    let convertedBlob = await new Promise(resolveBlob => canvasElement.toBlob(resolveBlob, targetType, 0.92));
    if (convertedBlob === null || convertedBlob.type !== targetType) throw new Error("Image encoder unavailable");
    return convertedBlob;
  } catch {
    throw new Error(game.i18n.localize("QFU.ClipboardConversionFailed"));
    // throw new Error(game.i18n.localize("The clipboard image could not be decoded or converted to the requested format."));
  } finally {
    imageElement?.close?.();
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
  }
}

/* Apply clipboard naming to any File and format conversion to image Files.
 * formatName is png, webp or jpg; groupName is the selected/routed group name.
 * Returns Promise<File>; the source File is never mutated.
 */
export async function PrepareClipboardFile(uploadFile, moduleSettings, formatName, groupName) {
  let imageType = await DetectImageType(uploadFile);
  let contentBlob = uploadFile;
  let fileExtension = uploadFile.name.match(/\.([a-z0-9]{1,12})$/i)?.[1] ?? "txt";
  if (imageType.length > 0) {
    fileExtension = formatName;
    let targetType = QFU_IMAGE_FORMATS[formatName];
    if (targetType === undefined) throw new Error("Invalid image format");
    if (imageType !== targetType) contentBlob = await ConvertImageBlob(uploadFile, targetType);
    else contentBlob = new Blob([uploadFile], { type: targetType });
  }
  let generatedName = await GenerateFileName(moduleSettings.Clipname, {
    Group: groupName ?? "", Content: contentBlob, Locale: game.i18n.lang ?? "en"
  });
  return new File([contentBlob], `${generatedName}.${fileExtension}`, { type: contentBlob.type, lastModified: uploadFile.lastModified });
}
