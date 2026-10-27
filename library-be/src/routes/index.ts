import { Router } from "express";
import { authRoutes } from "../modules/auth/route/auth.route";
import { memberRoutes } from "../modules/member/route/member.route";
import { categoryRoutes } from "../modules/category/route/category.route";
import { guestRoutes } from "../modules/guest/route/guest.route";
import { loanRoutes } from "../modules/loan/route/loan.route";
import { itemRoutes } from "../modules/item/route/item.route";
import { notificationRoutes } from "../modules/notification/route/notification.route";
import { reservationRoutes } from "../modules/reservation/route/reservation.route";
import finesRoutes from "../modules/fines/route/fines.route";
import { recommendationRoutes } from "../modules/recommendation/route/recommendations.route";
import { auditRoutes } from "../modules/audit/route/audit.route";
import { reportRoutes } from "../modules/report/route/report.route";
import { locationRoutes } from "../modules/location/route/location.route";
import { facultyRoutes } from "../modules/faculty/route/faculty.route";
import { studyProgramRoutes } from "../modules/study-program/route/study-program.route";
import bibliographyRoutes from "../modules/bibliography/route/bibliography.route";
import { collectionRoutes } from "../modules/collection/route/collection.route";
import importRoutes from "../modules/import/route/import.route";
import exportRoutes from "../modules/export/route/export.route";
import { repositoryRoutes } from "../modules/repository/route/proposal.route";
import { ebookRoutes } from "../modules/ebook/route/ebook.route";

const router = Router();

// Auth & Users
router.use(authRoutes);

// Member
router.use(memberRoutes);

// Bibliographies (canonical)
router.use(bibliographyRoutes);

// /api/collections compatibility alias → same bibliography logic
router.use(collectionRoutes);

// Categories
router.use(categoryRoutes);

// Items
router.use(itemRoutes);

// Import
router.use(importRoutes);

// Export
router.use(exportRoutes);

// Digital Repository & Page-Level PDF ACL
router.use(repositoryRoutes);

// E-Book Management & Secure Reader
router.use(ebookRoutes);

// Guests
router.use(guestRoutes);

// Loans
router.use(loanRoutes);

// Notification
router.use(notificationRoutes);

// Reservations
router.use(reservationRoutes);

// Fines
router.use(finesRoutes);

// Recommendations
router.use(recommendationRoutes);

// Audit
router.use(auditRoutes);

// Reports
router.use(reportRoutes);

// Locations
router.use(locationRoutes);

// Faculties
router.use(facultyRoutes);

// Study Programs
router.use(studyProgramRoutes);

export const routes = router;
