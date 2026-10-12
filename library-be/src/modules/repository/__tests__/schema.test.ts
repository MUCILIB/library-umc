import { describe, it, expect } from "vitest";
import {
  repositoryProposals,
  repositoryDocumentPageRules,
  proposalReviewLogs
} from "../../../db/schema";

describe("Repository Schema Definitions", () => {
  it("defines repositoryProposals with expected columns", () => {
    expect(repositoryProposals).toBeDefined();
    expect(repositoryProposals.id).toBeDefined();
    expect(repositoryProposals.proposalNumber).toBeDefined();
    expect(repositoryProposals.title).toBeDefined();
    expect(repositoryProposals.abstract).toBeDefined();
    expect(repositoryProposals.authorUserId).toBeDefined();
    expect(repositoryProposals.authorNim).toBeDefined();
    expect(repositoryProposals.authorName).toBeDefined();
    expect(repositoryProposals.status).toBeDefined();
    expect(repositoryProposals.storagePath).toBeDefined();
    expect(repositoryProposals.pageCount).toBeDefined();
    expect(repositoryProposals.fileHashSha256).toBeDefined();
  });

  it("defines repositoryDocumentPageRules with expected columns", () => {
    expect(repositoryDocumentPageRules).toBeDefined();
    expect(repositoryDocumentPageRules.id).toBeDefined();
    expect(repositoryDocumentPageRules.proposalId).toBeDefined();
    expect(repositoryDocumentPageRules.roleScope).toBeDefined();
    expect(repositoryDocumentPageRules.allowedStartPage).toBeDefined();
    expect(repositoryDocumentPageRules.allowedEndPage).toBeDefined();
    expect(repositoryDocumentPageRules.allowDownloadFull).toBeDefined();
  });

  it("defines proposalReviewLogs with expected columns", () => {
    expect(proposalReviewLogs).toBeDefined();
    expect(proposalReviewLogs.id).toBeDefined();
    expect(proposalReviewLogs.proposalId).toBeDefined();
    expect(proposalReviewLogs.reviewerUserId).toBeDefined();
    expect(proposalReviewLogs.action).toBeDefined();
    expect(proposalReviewLogs.notes).toBeDefined();
  });
});
