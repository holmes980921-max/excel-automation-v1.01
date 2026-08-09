/**
 * Fetches Help & Support markdown content from public/docs/ (V1.11).
 *
 * Content lives as plain .md files under frontend/public/docs/ - separate
 * from application code, directly editable on GitHub, and included
 * automatically in the static export (no build step, no CMS/database).
 * `next build`'s basePath (GitHub Pages only) isn't applied to a raw
 * fetch() automatically, so it's prefixed manually via
 * NEXT_PUBLIC_BASE_PATH (see next.config.mjs).
 */

export type DocName = "USER_GUIDE" | "FAQ" | "TROUBLESHOOTING";

export async function fetchDoc(name: DocName): Promise<string> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${basePath}/docs/${name}.md`);
  if (!res.ok) {
    throw new Error(`Could not load ${name} documentation (${res.status})`);
  }
  return res.text();
}
