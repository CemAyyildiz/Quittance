import { describe, it, expect } from "vitest";
import { formatStroops } from "./formatStroops";

describe("formatStroops", () => {
  it("formats valid inputs to 7 decimals", () => {
    expect(formatStroops(10000000)).toBe("1.0000000");
    expect(formatStroops("5000000")).toBe("0.5000000");
    expect(formatStroops(0)).toBe("0.0000000");
  });

  it("throws an error for invalid input", () => {
    expect(() => formatStroops("invalid")).toThrow("Invalid input");
    expect(() => formatStroops("")).toThrow("Invalid input");
  });
});
