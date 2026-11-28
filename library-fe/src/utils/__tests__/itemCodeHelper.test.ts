import { describe, expect, it } from "vitest";
import {
  analyzeItemCodeStructure,
  formatItemCodeYear,
  sanitizeItemCodePrefixInput,
  validateItemCodePrefix,
} from "../itemCodeHelper";

describe("itemCodeHelper", () => {
  it("formatItemCodeYear returns the last 2 digits of the year", () => {
    expect(formatItemCodeYear(2023)).toBe("23");
    expect(formatItemCodeYear(2024)).toBe("24");
    expect(formatItemCodeYear(2026)).toBe("26");
    expect(formatItemCodeYear("2025")).toBe("25");
    expect(formatItemCodeYear("24")).toBe("24");
    expect(formatItemCodeYear(2005)).toBe("05");
  });

  it("sanitizeItemCodePrefixInput limits the sequence segment to max 4 digits", () => {
    expect(sanitizeItemCodePrefixInput("S-26-23232323")).toBe("S-26-2323");
    expect(sanitizeItemCodePrefixInput("s-26-12a34b5")).toBe("S-26-1234");
    expect(sanitizeItemCodePrefixInput("R-26-1000-c1")).toBe("R-26-1000");
    expect(sanitizeItemCodePrefixInput("S-26-")).toBe("S-26-");
    expect(sanitizeItemCodePrefixInput("PND-01")).toBe("PND-01");
  });

  it("validateItemCodePrefix rejects empty or over-4-digit sequence segments", () => {
    expect(validateItemCodePrefix("S-26-1001")).toBeNull();
    expect(validateItemCodePrefix("S-26-23232")).not.toBeNull();
    expect(validateItemCodePrefix("S-26-")).not.toBeNull();
  });

  it("analyzeItemCodeStructure builds 2-digit year + 4-digit default prefix when no items exist", () => {
    const analysis = analyzeItemCodeStructure([], "S", 2024);
    expect(analysis.basePrefix).toBe("S-24-1001");
    expect(analysis.nextSeq).toBe(1);
    expect(analysis.isLocked).toBe(false);
    expect(analysis.hasInconsistentCodes).toBe(false);
  });

  it("analyzeItemCodeStructure recognizes and locks 2-digit year codes like S-23-5434-c3", () => {
    const analysis = analyzeItemCodeStructure(
      [
        { itemCode: "S-23-5434-c1" },
        { itemCode: "S-23-5434-c2" },
        { itemCode: "S-23-5434-c3" },
      ],
      "S",
      2026,
      "1001"
    );

    expect(analysis.basePrefix).toBe("S-23-5434");
    expect(analysis.nextSeq).toBe(4);
    expect(analysis.isLocked).toBe(true);
    expect(analysis.hasInconsistentCodes).toBe(false);
  });

  it("analyzeItemCodeStructure remains compatible with legacy 4-digit year codes", () => {
    const analysis = analyzeItemCodeStructure(
      [{ itemCode: "S-2024-2342-c1" }, { itemCode: "S-2024-2342-c2" }],
      "S",
      2024,
      "1001"
    );

    expect(analysis.basePrefix).toBe("S-2024-2342");
    expect(analysis.nextSeq).toBe(3);
    expect(analysis.isLocked).toBe(true);
    expect(analysis.hasInconsistentCodes).toBe(false);
  });
});
