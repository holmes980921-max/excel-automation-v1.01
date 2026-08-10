import { describe, it, expect, afterEach, vi } from "vitest";

type NextConfigShape = {
  output?: string;
  basePath?: string;
  assetPrefix?: string;
  images?: { unoptimized?: boolean };
  env?: { NEXT_PUBLIC_BASE_PATH?: string };
};

async function loadConfig(): Promise<NextConfigShape> {
  // @ts-expect-error - next.config.mjs has no type declarations; shape asserted via NextConfigShape above.
  const mod = await import("./next.config.mjs");
  return mod.default as NextConfigShape;
}

/**
 * Regression test for the V1.11 follow-up bug: `next.config.mjs`'s
 * `env.NEXT_PUBLIC_BASE_PATH` (which `lib/docsLoader.ts` depends on to
 * fetch Help & Support docs from the correct GitHub Pages basePath) was
 * edited locally but never committed - `docsLoader.test.ts` alone couldn't
 * catch this, since it stubs `NEXT_PUBLIC_BASE_PATH` directly and never
 * exercises the config file that's actually supposed to set it. This test
 * imports the real config file (not a mock) so a future edit that changes
 * behavior without updating this file's expectations, or a repeat of
 * "the edit exists on disk but isn't committed," fails CI directly - a
 * config file with no test can silently drift from what's deployed.
 */
describe("next.config.mjs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("sets basePath/assetPrefix/NEXT_PUBLIC_BASE_PATH to the repo path for a GitHub Pages build", async () => {
    vi.stubEnv("GITHUB_PAGES", "true");
    vi.resetModules();
    const config = await loadConfig();

    expect(config.basePath).toBe("/excel-automation-v1.01");
    expect(config.assetPrefix).toBe("/excel-automation-v1.01");
    expect(config.env?.NEXT_PUBLIC_BASE_PATH).toBe("/excel-automation-v1.01");
  });

  it("leaves basePath/assetPrefix/NEXT_PUBLIC_BASE_PATH empty for a plain local build", async () => {
    vi.stubEnv("GITHUB_PAGES", "");
    vi.resetModules();
    const config = await loadConfig();

    expect(config.basePath).toBe("");
    expect(config.assetPrefix).toBe("");
    expect(config.env?.NEXT_PUBLIC_BASE_PATH).toBe("");
  });

  it("keeps NEXT_PUBLIC_BASE_PATH consistent with basePath - the exact class of bug this guards against", async () => {
    vi.stubEnv("GITHUB_PAGES", "true");
    vi.resetModules();
    const config = await loadConfig();

    // If a future edit changes basePath's condition but not env's (or vice
    // versa, or one gets edited locally and never committed), this fails -
    // docsLoader.ts's runtime fetch() must agree with where GitHub Pages
    // actually serves the app, or every Help & Support doc 404s in
    // production while every local/test check still passes.
    expect(config.env?.NEXT_PUBLIC_BASE_PATH).toBe(config.basePath);
  });

  it("always enables output: export and unoptimized images, regardless of build target", async () => {
    vi.stubEnv("GITHUB_PAGES", "");
    vi.resetModules();
    const config = await loadConfig();

    expect(config.output).toBe("export");
    expect(config.images?.unoptimized).toBe(true);
  });
});
