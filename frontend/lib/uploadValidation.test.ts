import { describe, it, expect } from "vitest";
import { describeRejection } from "./uploadValidation";
import type { FileRejection } from "react-dropzone";

function rejection(code: string, filename = "bad-file.txt"): FileRejection {
  return {
    file: new File(["x"], filename),
    errors: [{ code, message: "default message" }],
  } as unknown as FileRejection;
}

describe("describeRejection", () => {
  it("explains an invalid file type in plain language", () => {
    const msg = describeRejection(rejection("file-invalid-type", "report.pdf"));
    expect(msg).toContain("report.pdf");
    expect(msg).toMatch(/\.xls, \.xlsx, or \.xlsm/);
  });

  it("explains a multi-file drop", () => {
    expect(describeRejection(rejection("too-many-files"))).toMatch(/single file/);
  });

  it("falls back to the underlying message for unknown codes", () => {
    expect(describeRejection(rejection("something-else"))).toBe("default message");
  });
});
