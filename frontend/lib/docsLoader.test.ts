import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchDoc } from "./docsLoader";

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

  it("fetches the requested doc from /docs/<name>.md", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("# Hello") });
    vi.stubGlobal("fetch", fetchMock);

    const text = await fetchDoc("USER_GUIDE");

    expect(text).toBe("# Hello");
    expect(fetchMock).toHaveBeenCalledWith("/docs/USER_GUIDE.md");
  });

  it("throws a clean error when the fetch response isn't ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchDoc("FAQ")).rejects.toThrow(/404/);
  });
});
