/** Only explicit "public" is public; null/undefined/empty/anything else → private. */
export function normalizeApiKeyVisibility(value) {
  return value === "public" ? "public" : "private";
}

export function isApiKeyPublic(keyOrVisibility) {
  if (keyOrVisibility && typeof keyOrVisibility === "object") {
    return normalizeApiKeyVisibility(keyOrVisibility.visibility) === "public";
  }
  return normalizeApiKeyVisibility(keyOrVisibility) === "public";
}
