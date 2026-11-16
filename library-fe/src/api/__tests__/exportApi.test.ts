import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportApi } from "@/api/client";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true, blob: async () => new Blob(["csv"]) });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe.each([
  ["bibliographies", exportApi.downloadBibliographies],
  ["items", exportApi.downloadItems],
] as const)("CSV export query: %s", (resource, download) => {
  it.each(["library", "slims"] as const)("sends %s format alongside filters and delimiter", async (format) => {
    await download({ format, facultyId: 1, studyProgramId: 10, delimiter: "," });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe(`/api/export/${resource}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      format,
      facultyId: "1",
      studyProgramId: "10",
      delimiter: ",",
    });
  });

  it("keeps the existing URL when no format is supplied", async () => {
    await download();

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe(`/api/export/${resource}`);
    expect(url.search).toBe("");
  });
});
