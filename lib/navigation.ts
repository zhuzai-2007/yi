/** Every page exists as an exported directory/index.html; no SPA rewrite required. */
export function sitePath(
  path: string,
  base = process.env.NEXT_PUBLIC_BASE_PATH || "",
) {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Only site-relative navigation is supported");
  return `${base}${path}`;
}
export function navigate(path: string, replace = false) {
  if (replace) window.location.replace(sitePath(path));
  else window.location.assign(sitePath(path));
}
