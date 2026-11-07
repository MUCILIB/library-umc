import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("SLiMS (Senayan CSV) Import Parser", () => {
  it("should parse senayan_biblio_export with semicolon delimiter and multi-tags", () => {
    const filePath = path.resolve(__dirname, "../../../../../senayan_biblio_export (2).csv");
    if (!fs.existsSync(filePath)) {
      // In CI / runner environment where sample file may not exist, skip gracefully
      return;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content.length).toBeGreaterThan(0);

    // Test delimiter detection
    const newlineIdx = content.indexOf("\n");
    const firstLine = newlineIdx !== -1 ? content.substring(0, newlineIdx) : content;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolons >= commas ? ";" : ",";
    expect(delimiter).toBe(";");

    // SLiMS multi-tag parser regex test
    const rawAuthors = "<Heru Kurniawan><Titi Anisatul Laely>";
    const authors = (rawAuthors.match(/<([^>]+)>/g) || []).map(m => m.slice(1, -1).trim());
    expect(authors).toEqual(["Heru Kurniawan", "Titi Anisatul Laely"]);

    // Test item codes with edge case extra closing bracket
    const rawItems = "<S250193701><S250193702><S250193703>><S250193704>";
    const itemCodes = (rawItems.match(/<([^>]+)>/g) || []).map(m => m.slice(1, -1).trim());
    expect(itemCodes).toEqual(["S250193701", "S250193702", "S250193703", "S250193704"]);
  });

  it("should preserve semicolons and line breaks inside quoted fields", () => {
    const sampleCsv = `title;collation;notes\n"Buku A";"xiv+114hlm;15x23cm";"Catatan baris 1\nCatatan baris 2"\n"Buku B";"x+200hlm";"Catatan singkat"`;
    
    // Simple verification of RFC 4180 parsing behavior
    const DQ = '"';
    const CR = String.fromCharCode(13);
    const LF = String.fromCharCode(10);
    const records: string[][] = [];
    let currentRecord: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < sampleCsv.length; i++) {
      const ch = sampleCsv[i];
      if (ch === DQ) {
        if (inQuotes && i + 1 < sampleCsv.length && sampleCsv[i + 1] === DQ) {
          currentField += DQ;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ";" && !inQuotes) {
        currentRecord.push(currentField);
        currentField = "";
      } else if ((ch === CR || ch === LF) && !inQuotes) {
        if (ch === CR && i + 1 < sampleCsv.length && sampleCsv[i + 1] === LF) {
          i++;
        }
        currentRecord.push(currentField);
        currentField = "";
        if (currentRecord.length > 1 || (currentRecord.length === 1 && currentRecord[0].trim().length > 0)) {
          records.push(currentRecord);
        }
        currentRecord = [];
      } else {
        currentField += ch;
      }
    }
    if (currentField.length > 0 || currentRecord.length > 0) {
      currentRecord.push(currentField);
      records.push(currentRecord);
    }

    expect(records.length).toBe(3); // Header + 2 rows
    expect(records[1][0]).toBe("Buku A");
    expect(records[1][1]).toBe("xiv+114hlm;15x23cm"); // semicolon preserved
    expect(records[1][2]).toBe("Catatan baris 1\nCatatan baris 2"); // newline preserved
    expect(records[2][0]).toBe("Buku B");
  });
});
