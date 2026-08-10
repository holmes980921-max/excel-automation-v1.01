import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchDoc, type DocName } from "./docsLoader";

const DOC_NAMES: DocName[] = ["USER_GUIDE", "FAQ", "TROUBLESHOOTING"];

describe("fetchDoc", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("prefixes the GitHub Pages basePath when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/excel-automation-v1.01");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("content") });
    vi.stubGlobal("fetch", fetchMock);

    await fetchDoc("TROUBLESHOOTING");

    expect(fetchMock).toHaveBeenCalledWith("/excel-automation-v1.01/docs/TROUBLESHOOTING.md");
  });

  // Regression guard for the V1.11 follow-up bug (USER_GUIDE 404 in
  // production): the basePath prefix must apply identically to every doc,
  // not just whichever one happened to get manually spot-checked - a
  // per-doc special case here would silently reintroduce the same class of
  // bug for the other two.
  it.each(DOC_NAMES)("resolves the correct path for %s in both local and GitHub Pages builds", async (name) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("content") });
    vi.stubGlobal("fetch", fetchMock);

    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    await fetchDoc(name);
    expect(fetchMock).toHaveBeenLastCalledWith(`/docs/${name}.md`);

    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/excel-automation-v1.01");
    await fetchDoc(name);
    expect(fetchMock).toHaveBeenLastCalledWith(`/excel-automation-v1.01/docs/${name}.md`);
  });

  it("fetches the requested doc from /docs/<name>.md", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("# Hello") });
    vi.stubGlobal("fetch", fetchMock);

    const text = await fetchDoc("USER_GUIDE");

    expect(text).toBe("# Hello");
    expect(fetchMock).toHaveBeenCalledWith("/docs/USER_GUIDE.md");
  });

  it.each(DOC_NAMES)("throws a clean error naming the doc when %s's fetch response isn't ok", async (name) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchDoc(name)).rejects.toThrow(new RegExp(`${name}.*404`));
  });
});
