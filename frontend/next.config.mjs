/**
 * V1.10 Browser Edition: static export for GitHub Pages (no Node/backend
 * server at deploy time). `output: "export"` only changes `next build`'s
 * behavior - `next dev` is unaffected, so local development is unchanged.
 *
 * basePath/assetPrefix are only applied for the actual GitHub Pages build
 * (set via the GITHUB_PAGES env var in .github/workflows/deploy-pages.yml)
 * - a plain local `next build` still produces root-relative paths.
 */
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const REPO_BASE_PATH = "/excel-automation-v1.01";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath: isGithubPagesBuild ? REPO_BASE_PATH : "",
  assetPrefix: isGithubPagesBuild ? REPO_BASE_PATH : "",
  // V1.11: exposed to the client so runtime `fetch()` calls (e.g. Help &
  // Support's markdown docs under public/docs/) can prefix the basePath
  // themselves - unlike next/image or next/link, a raw fetch() doesn't get
  // basePath applied automatically.
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPagesBuild ? REPO_BASE_PATH : "",
  },
};

export default nextConfig;
