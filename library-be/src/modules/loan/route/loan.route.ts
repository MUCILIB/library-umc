import { Router } from "express";
import { LoanController } from "../controller/loan.controller";
import {
  isAuthenticated,
  requireRole,
} from "../../../middlewares/auth.middleware";
import { publicApiLimiter } from "../../../middlewares/rateLimiter";

const router = Router();
const loanController = new LoanController();

/**
 * @swagger
 * /loans/request:
 *   post:
 *     summary: Request a book loan
 *     description: Member requests to borrow a book. System generates a defined token.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bibliographyId
 *             properties:
 *               bibliographyId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the bibliography (book) to borrow
 *     responses:
 *       200:
 *         description: Loan requested successfully
 *       400:
 *         description: Item not available or validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/loans/request",
  publicApiLimiter,
  isAuthenticated,
  loanController.createRequest,
);

/**
 * @swagger
 * /loans/verify/{token}:
 *   get:
 *     summary: Verify loan token
 *     description: Admin scans qr code/token to verify loan request validity.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token
 *     responses:
 *       200:
 *         description: Token verified, returns loan data
 *       400:
 *         description: Invalid or expired token
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/loans/verify/:token",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.verifyToken,
);

/**
 * @swagger
 * /loans/{requestId}/approve:
 *   post:
 *     summary: Approve loan
 *     description: Admin approves the loan request after verification. item status becomes 'loaned'.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan Request ID
 *     responses:
 *       200:
 *         description: Loan approved
 *       404:
 *         description: Loan request not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.post(
  "/loans/:requestId/approve",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.approveLoan,
);

/**
 * @swagger
 * /loans/{requestId}/reject:
 *   post:
 *     summary: Reject loan
 *     description: Admin rejects the loan request. item status becomes 'available' again.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan Request ID
 *     responses:
 *       200:
 *         description: Loan rejected
 *       404:
 *         description: Loan request not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.post(
  "/loans/:requestId/reject",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.rejectLoan,
);

/**
 * @swagger
 * /loans/{id}/cancel:
 *   post:
 *     summary: Cancel pending loan booking
 *     description: Member cancels their own pending loan booking.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Loan canceled successfully
 *       400:
 *         description: Cannot cancel loan
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/loans/:id/cancel",
  publicApiLimiter,
  isAuthenticated,
  loanController.cancelLoan,
);

/**
 * @swagger
 * /loans/{loanId}/return:
 *   post:
 *     summary: Return a book
 *     description: Admin/Staff marks a loan as returned. Item status becomes 'available' again.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Book returned successfully
 *       404:
 *         description: Loan not found or not in 'approved' status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Staff only
 */
router.post(
  "/loans/:loanId/return",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.returnLoan,
);

router.post(
  "/loans/:loanId/return-request",
  publicApiLimiter,
  isAuthenticated,
  // Any authenticated user can create a return request
  loanController.createReturnRequest
);

router.post(
  "/loans/return-requests/:requestId/approve",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin"]),
  loanController.approveReturnRequest
);

router.get(
  "/loans/return-requests/pending",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin"]),
  loanController.getPendingReturnRequests
);

/**
 * @swagger
 * /loans:
 *   get:
 *     summary: Get all loans
 *     description: Admin gets all loans. Staff gets all loans.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, returned, extended, rejected]
 *         description: Filter by loan status
 *       - in: query
 *         name: memberId
 *         schema:
 *           type: string
 *         description: Filter by member ID
 *     responses:
 *       200:
 *         description: List of loans
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/loans",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.getAllLoans,
);

/**
 * @swagger
 * /loans/history:
 *   get:
 *     summary: Get my loan history
 *     description: Member view their own loan history.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My loan history
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/loans/history",
  publicApiLimiter,
  isAuthenticated,
  loanController.getMyLoans,
);

/**
 * @swagger
 * /loans/{loanId}/extend:
 *   post:
 *     summary: Extend a book loan
 *     description: Member extends their current loan by 7 days. Limit 1x, only if not overdue and no reservations.
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Loan extended
 *       400:
 *         description: Cannot extend (overdue, reserved, or already extended)
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/loans/:loanId/extend",
  publicApiLimiter,
  isAuthenticated,
  loanController.extendLoan,
);

router.post(
  "/loans/:loanId/approve-extension",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.approveExtension,
);

router.post(
  "/loans/:loanId/reject-extension",
  publicApiLimiter,
  isAuthenticated,
  requireRole(["super_admin", "staff"]),
  loanController.rejectExtension,
);

export const loanRoutes = router;
