import { describe, it, expect } from "vitest";
import { loanRoutes } from "../route/loan.route";

describe("Loan Route Ordering (TDD)", () => {
  it("should register /loans/history BEFORE /loans/:loanId to prevent route shadowing", () => {
    const getRoutes = loanRoutes.stack
      .filter((layer: any) => layer.route && layer.route.methods.get)
      .map((layer: any) => layer.route.path);

    const historyIndex = getRoutes.indexOf("/loans/history");
    const loanIdIndex = getRoutes.indexOf("/loans/:loanId");

    expect(historyIndex).toBeGreaterThan(-1);
    expect(loanIdIndex).toBeGreaterThan(-1);
    // /loans/history MUST come before /loans/:loanId so Express does not capture 'history' as :loanId
    expect(historyIndex).toBeLessThan(loanIdIndex);
  });
});
