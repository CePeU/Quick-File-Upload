/* Return a sorted copy of named entries using the active translation language.
 * ReadName maps each entry to its visible label, preserving stored identifiers.
 */
export function SortEntries(entryList, ReadName) {
  return [...entryList].sort((firstEntry, secondEntry) => String(ReadName(firstEntry))
    .localeCompare(String(ReadName(secondEntry)), game.i18n.lang, { sensitivity: "base" }));
}
