/** Resolve a file under Vite `public/` for the current deploy base. */
export function publicAsset(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '');
  if (trimmed.length === 0) {
    throw new Error('publicAsset requires a non-empty path');
  }
  return `${import.meta.env.BASE_URL}${trimmed}`;
}
