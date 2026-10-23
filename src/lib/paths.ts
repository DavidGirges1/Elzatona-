// Next.js prefixes Link/router/redirect automatically. Native anchors, GET forms,
// metadata and NextResponse URLs need the same build-time prefix explicitly.
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function appPath(path = "/"): string {
  return `${basePath}${path === "/" ? "" : path}` || "/";
}
