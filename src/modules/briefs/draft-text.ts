const marker = /\[S(?::|\d)[^\]\n]*\]/g;
const openMarker = /\[S(?:[:\d][^\]\n]*)?$/;

// A heading in another language ends with a section tag that validation removes from the saved answer; a draft never shows it.
const sectionTag = /[ \t]*\{#(?:process|cases)\}/g;
const openSectionTag = /[ \t]*\{#?[a-z]*$/;

// A streamed draft has unchecked citation markers, so show the prose without them. The saved answer adds the sources.
export function draftDisplayText(text: string): string {
  return text.replace(marker, "").replace(openMarker, "").replace(sectionTag, "").replace(openSectionTag, "").replace(/[ \t]+([.,;:])/g, "$1").replace(/[ \t]{2,}/g, " ");
}
