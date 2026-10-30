const marker = /\[S(?::|\d)[^\]\n]*\]/g;
const openMarker = /\[S(?:[:\d][^\]\n]*)?$/;

// A streamed draft has unchecked citation markers, so show the prose without them. The saved answer adds the sources.
export function draftDisplayText(text: string): string {
  return text.replace(marker, "").replace(openMarker, "").replace(/[ \t]+([.,;:])/g, "$1").replace(/[ \t]{2,}/g, " ");
}
