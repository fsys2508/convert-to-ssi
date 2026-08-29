import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, isUploadTooLarge } from "./upload-limits";

describe("isUploadTooLarge", () => {
  it("allows files at or below the limit", () => {
    expect(isUploadTooLarge(0)).toBe(false);
    expect(isUploadTooLarge(MAX_UPLOAD_BYTES)).toBe(false);
    expect(isUploadTooLarge(MAX_UPLOAD_BYTES - 1)).toBe(false);
  });

  it("rejects files above the limit", () => {
    expect(isUploadTooLarge(MAX_UPLOAD_BYTES + 1)).toBe(true);
  });

  it("respects a custom max", () => {
    expect(isUploadTooLarge(100, 50)).toBe(true);
    expect(isUploadTooLarge(50, 50)).toBe(false);
  });
});
