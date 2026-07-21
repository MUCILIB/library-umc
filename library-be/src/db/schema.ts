import {
  integer,
  pgTable,
  varchar,
  pgEnum,
  text,
  timestamp,
  boolean,
  date,
  numeric,
  index,
  uuid,
  jsonb,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// 1. ENUMS
// ==========================================

export const collectionTypeEnum = pgEnum("collection_type", [
  "physical_book", "ebook", "journal", "thesis"
]);
export const contentTypeEnum = pgEnum("content_type", ["text", "pdf", "url"]);
export const itemStatusEnum = pgEnum("item_status", [
  "available", "loaned", "damaged", "lost"
]);
export const loansStatusEnum = pgEnum("loans_status", [
  "pending", "approved", "returned", "extended", "rejected"
]);
export const reservationsStatusEnum = pgEnum("reservations_status", [
  "waiting", "fulfilled", "canceled"
]);
export const finesStatusEnum = pgEnum("fines_status", ["paid", "unpaid"]);
export const logsStatusEnum = pgEnum("logs_status", [
  "create", "update", "delete", "approve", "blacklist", "failed_login", "rate_limited"
]);
export const logsEntityEnum = pgEnum("logs_entity", [
  "loan", "item", "fine", "Users", "category", "bibliography", "reservation", "auth", "faculty", "study_program"
]);
export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending", "approved", "rejected"
]);
export const memberType = pgEnum("member_type", [
  "student", "lecturer", "staff", "super_admin", "external"
]);
export const memberCardStatusEnum = pgEnum("member_card_status", [
  "not_requested", "pending", "active", "rejected", "expired"
]);
export const returnRequestStatusEnum = pgEnum("return_request_status", [
  "pending", "approved"
]);
export const importBatchStatusEnum = pgEnum("import_batch_status", [
  "uploading", "parsing", "validating", "preview", "approving", "committed", "failed", "cancelled"
]);
export const importBatchTypeEnum = pgEnum("import_batch_type", [
  "bibliography", "item"
]);
export const importRowStatusEnum = pgEnum("import_row_status", [
  "pending", "valid", "invalid", "committed", "skipped", "duplicate"
]);

// ==========================================
// 2. MASTER DATA
// ==========================================

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  deletedAt: timestamp("deleted_at")
});

export const locations = pgTable("locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  room: varchar("room", { length: 200 }).notNull(),
  rack: varchar("rack", { length: 200 }).notNull(),
  shelf: varchar("shelf", { length: 200 }).notNull(),
  deletedAt: timestamp("deleted_at")
});

export const vendors = pgTable("vendors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }),
  contact: varchar("contact", { length: 255 }),
  deletedAt: timestamp("deleted_at")
});

export const publishers = pgTable("publishers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  normalizedNameIdx: index("publisher_normalized_name_idx").on(table.normalizedName)
}));

export const languages = pgTable("languages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 10 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at")
});

export const publicationPlaces = pgTable("publication_places", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  normalizedNameIdx: index("place_normalized_name_idx").on(table.normalizedName)
}));

export const gmds = pgTable("gmds", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at")
});

export const collectionTypes = pgTable("collection_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }),
  deletedAt: timestamp("deleted_at")
});

export const authors = pgTable("authors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  normalizedNameIdx: index("author_normalized_name_idx").on(table.normalizedName)
}));

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  normalizedNameIdx: index("subject_normalized_name_idx").on(table.normalizedName)
}));

// ==========================================
// 2b. FACULTIES & STUDY PROGRAMS
// ==========================================

export const faculties = pgTable("faculties", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
});

export const studyPrograms = pgTable("study_programs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  facultyId: integer("faculty_id").notNull().references(() => faculties.id),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  facultyIdx: index("sp_faculty_idx").on(table.facultyId)
}));

export const bibliographyFaculties = pgTable("bibliography_faculties", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  facultyId: integer("faculty_id").notNull().references(() => faculties.id),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  unique: unique("bf_unique").on(table.bibliographyId, table.facultyId),
  bibIdx: index("bf_bibliography_idx").on(table.bibliographyId),
  facultyIdx: index("bf_faculty_idx").on(table.facultyId)
}));

export const bibliographyStudyPrograms = pgTable("bibliography_study_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  studyProgramId: integer("study_program_id").notNull().references(() => studyPrograms.id),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  unique: unique("bsp_unique").on(table.bibliographyId, table.studyProgramId),
  bibIdx: index("bsp_bibliography_idx").on(table.bibliographyId),
  spIdx: index("bsp_study_program_idx").on(table.studyProgramId)
}));

// ==========================================
// 3. AUTHENTICATION (BETTER AUTH)
// ==========================================

export const Users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  deletedAt: timestamp("deleted_at"),
  role: text("role").default("student"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires")
}, (table) => ({
  deletedAtIdx: index("user_deleted_at_idx").on(table.deletedAt)
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => Users.id),
  impersonatedBy: text("impersonated_by")
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => Users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at")
});

// ==========================================
// 4. MEMBERS
// ==========================================

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique().references(() => Users.id),
  memberType: memberType("member_type").notNull(),
  nimNidn: varchar("nim_nidn", { length: 255 }),
  faculty: varchar("faculty", { length: 255 }),
  originRegion: varchar("origin_region", { length: 255 }),
  institution: varchar("institution", { length: 255 }),
  phone: varchar("phone", { length: 100 }),
  cardStatus: memberCardStatusEnum("card_status").notNull().default("not_requested"),
  cardNumber: varchar("card_number", { length: 100 }).unique(),
  cardRequestedAt: timestamp("card_requested_at"),
  cardApprovedAt: timestamp("card_approved_at"),
  cardRejectedAt: timestamp("card_rejected_at"),
  cardRejectedReason: text("card_rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  nimIdx: index("member_nim_idx").on(table.nimNidn),
  deletedAtIdx: index("member_deleted_at_idx").on(table.deletedAt)
}));

// ==========================================
// 5. BIBLIOGRAPHIES (renamed from collections)
// ==========================================

export const bibliographies = pgTable("bibliographies", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  isbnIssn: varchar("isbn_issn", { length: 255 }),
  edition: varchar("edition", { length: 100 }),
  publisherId: integer("publisher_id").references(() => publishers.id),
  publishYear: integer("publish_year"),
  collation: varchar("collation", { length: 255 }),
  seriesTitle: varchar("series_title", { length: 255 }),
  callNumber: varchar("call_number", { length: 100 }),
  languageId: integer("language_id").references(() => languages.id),
  publicationPlaceId: integer("publication_place_id").references(() => publicationPlaces.id),
  classification: varchar("classification", { length: 100 }),
  notes: text("notes"),
  image: text("image"),
  sor: text("sor"),
  unlistedAuthorsLabel: varchar("unlisted_authors_label", { length: 100 }),
  gmdId: integer("gmd_id").references(() => gmds.id),
  collectionTypeId: integer("collection_type_id").references(() => collectionTypes.id),
  categoryId: integer("category_id").references(() => categories.id),
  description: text("description"),
  type: collectionTypeEnum("type"),
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  isPopular: boolean("is_popular").default(false).notNull()
}, (table) => ({
  titleIdx: index("bibliography_title_idx").on(table.title),
  isbnIdx: index("bibliography_isbn_idx").on(table.isbnIssn),
  callNumberIdx: index("bibliography_call_number_idx").on(table.callNumber),
  publishYearIdx: index("bibliography_publish_year_idx").on(table.publishYear),
  deletedAtIdx: index("bibliography_deleted_at_idx").on(table.deletedAt)
}));

// P1: Bibliography <-> Authors junction
export const bibliographyAuthors = pgTable("bibliography_authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  authorId: integer("author_id").notNull().references(() => authors.id),
  position: integer("position").notNull().default(1),
  role: varchar("role", { length: 50 }).notNull().default("author"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  bibAuthorRoleUnique: unique("bibliography_author_role_unique").on(table.bibliographyId, table.authorId, table.role),
  bibPositionUnique: unique("bibliography_position_unique").on(table.bibliographyId, table.position),
  bibliographyIdx: index("ba_bibliography_idx").on(table.bibliographyId),
  authorIdx: index("ba_author_idx").on(table.authorId)
}));

// P1: Bibliography <-> Subjects junction
export const bibliographySubjects = pgTable("bibliography_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  unique: unique("bibliography_subject_unique").on(table.bibliographyId, table.subjectId),
  bibliographyIdx: index("bs_bibliography_idx").on(table.bibliographyId),
  subjectIdx: index("bs_subject_idx").on(table.subjectId)
}));

export const bibliographyContents = pgTable("bibliography_contents", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").references(() => bibliographies.id),
  contentType: contentTypeEnum("content_type"),
  content: text("content"),
  contentUrl: varchar("content_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
});

export const bibliographyViews = pgTable("bibliography_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  userId: text("user_id").references(() => Users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  viewedAt: timestamp("viewed_at").defaultNow()
}, (table) => ({
  bibIdx: index("bv_bibliography_idx").on(table.bibliographyId),
  viewedAtIdx: index("bv_viewed_at_idx").on(table.viewedAt)
}));

// ==========================================
// 6. ITEMS
// ==========================================

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  itemCode: varchar("item_code", { length: 50 }).notNull(),
  inventoryCode: varchar("inventory_code", { length: 50 }),
  callNumber: varchar("call_number", { length: 100 }),
  collectionTypeId: integer("collection_type_id").references(() => collectionTypes.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  receivedDate: date("received_date"),
  orderNo: varchar("order_no", { length: 100 }),
  orderDate: date("order_date"),
  status: itemStatusEnum("status").notNull().default("available"),
  site: varchar("site", { length: 255 }),
  source: varchar("source", { length: 255 }),
  invoice: varchar("invoice", { length: 255 }),
  price: numeric("price", { precision: 14, scale: 2 }),
  priceCurrency: varchar("price_currency", { length: 10 }).default("IDR"),
  invoiceDate: date("invoice_date"),
  qrToken: varchar("qr_token", { length: 100 }).notNull(),
  qrVersion: integer("qr_version").notNull().default(1),
  qrGeneratedAt: timestamp("qr_generated_at"),
  qrRevokedAt: timestamp("qr_revoked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  bibIdx: index("item_bibliography_idx").on(table.bibliographyId),
  statusIdx: index("item_status_idx").on(table.status),
  deletedAtIdx: index("item_deleted_at_idx").on(table.deletedAt),
  locationIdx: index("item_location_idx").on(table.locationId),
  itemCodeIdx: index("item_code_idx").on(table.itemCode),
  qrTokenIdx: index("item_qr_token_idx").on(table.qrToken),
  qrTokenUnique: unique("item_qr_token_unique").on(table.qrToken),
  itemCodeUnique: unique("item_item_code_unique").on(table.itemCode),
  inventoryCodeUnique: unique("item_inventory_code_unique").on(table.inventoryCode)
}));

// ==========================================
// 7. LOANS, RESERVATIONS, FINES
// ==========================================

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id),
  itemId: uuid("item_id").notNull().references(() => items.id),
  loanDate: date("loan_date").notNull(),
  dueDate: date("due_date").notNull(),
  returnDate: date("return_date"),
  status: loansStatusEnum("status").notNull(),
  extendCount: integer("extend_count").default(0).notNull(),
  extensionStatus: varchar("extension_status", { length: 50 }).default("none"),
  approvedBy: text("approved_by").references(() => Users.id),
  verificationToken: varchar("verification_token", { length: 100 }),
  verificationExpiresAt: timestamp("verification_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
}, (table) => ({
  statusIdx: index("loan_status_idx").on(table.status),
  deletedAtIdx: index("loan_deleted_at_idx").on(table.deletedAt),
  memberIdx: index("loan_member_idx").on(table.memberId),
  itemIdx: index("loan_item_idx").on(table.itemId),
  activeLoanIdx: index("loan_active_idx").on(table.itemId, table.status),
  tokenIdx: index("loan_verification_token_idx").on(table.verificationToken)
}));

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  status: reservationsStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
});

export const returnRequests = pgTable("return_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id").notNull().references(() => loans.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  status: returnRequestStatusEnum("status").default("pending").notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: text("processed_by").references(() => Users.id)
});

export const fines = pgTable("fines", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id").notNull().references(() => loans.id),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  status: finesStatusEnum("status").notNull(),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fineId: uuid("fine_id").notNull().references(() => fines.id),
  paymentMethod: varchar("payment_method", { length: 100 }),
  confirmedBy: text("confirmed_by").notNull().references(() => Users.id),
  paidAt: date("paid_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const acquisitions = pgTable("acquisitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  bibliographyId: uuid("bibliography_id").notNull().references(() => bibliographies.id),
  quantity: integer("quantity"),
  acquiredAt: date("acquired_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  dosenId: text("dosen_id").notNull().references(() => Users.id),
  isbn: varchar("isbn", { length: 255 }),
  title: varchar("title", { length: 255 }),
  author: varchar("author", { length: 255 }),
  publisher: varchar("publisher", { length: 255 }),
  reason: text("reason"),
  status: recommendationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at")
});

// ==========================================
// 8. LOGS & ANALYTICS
// ==========================================

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => Users.id),
  action: logsStatusEnum("action").notNull(),
  entity: logsEntityEnum("entity").notNull(),
  entityId: varchar("entity_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 255 }),
  userAgent: text("user_agent"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow()
});

export const webTraffic = pgTable("web_traffic", {
  id: text("id").primaryKey(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userId: text("user_id").references(() => Users.id),
  pageVisited: varchar("page_visited", { length: 255 }),
  visitTimestamp: timestamp("visit_timestamp").defaultNow(),
  userAgent: text("user_agent")
});

export const guestLogs = pgTable("guest_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  identifier: varchar("identifier", { length: 100 }).notNull(),
  faculty: varchar("faculty", { length: 255 }),
  major: varchar("major", { length: 255 }),
  visitDate: timestamp("visit_date").defaultNow(),
  deletedAt: timestamp("deleted_at")
});

// ==========================================
// 9. IMPORT STAGING
// ==========================================

export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: importBatchTypeEnum("type").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  status: importBatchStatusEnum("status").notNull().default("uploading"),
  referenceBatchId: uuid("reference_batch_id"),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  validRows: integer("valid_rows").default(0),
  invalidRows: integer("invalid_rows").default(0),
  committedRows: integer("committed_rows").default(0),
  duplicateRows: integer("duplicate_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  filePath: text("file_path"),
  errorReportPath: text("error_report_path"),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => Users.id),
  approvedBy: text("approved_by").references(() => Users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  committedAt: timestamp("committed_at"),
  lastProcessedAt: timestamp("last_processed_at")
});

export const importBibliographyRows = pgTable("import_bibliography_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id),
  rowNumber: integer("row_number").notNull(),
  rawData: jsonb("raw_data").notNull(),
  status: importRowStatusEnum("status").notNull().default("pending"),
  resolvedData: jsonb("resolved_data"),
  resolvedId: uuid("resolved_id"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  batchIdx: index("import_bib_row_batch_idx").on(table.batchId),
  statusIdx: index("import_bib_row_status_idx").on(table.status),
  batchRowUnique: unique("import_bib_row_batch_number_unique").on(table.batchId, table.rowNumber)
}));

export const importItemRows = pgTable("import_item_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id),
  rowNumber: integer("row_number").notNull(),
  rawData: jsonb("raw_data").notNull(),
  status: importRowStatusEnum("status").notNull().default("pending"),
  resolvedData: jsonb("resolved_data"),
  resolvedId: uuid("resolved_id"),
  resolutionMethod: varchar("resolution_method", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  batchIdx: index("import_item_row_batch_idx").on(table.batchId),
  statusIdx: index("import_item_row_status_idx").on(table.status),
  batchRowUnique: unique("import_item_row_batch_number_unique").on(table.batchId, table.rowNumber)
}));

export const importErrors = pgTable("import_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id),
  rowNumber: integer("row_number").notNull(),
  rawData: jsonb("raw_data").notNull(),
  errors: jsonb("errors").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  batchIdx: index("import_error_batch_idx").on(table.batchId)
}));

export const importBibliographyItemCodes = pgTable("import_bibliography_item_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id").notNull().references(() => importBatches.id),
  bibliographyRowId: uuid("bibliography_row_id").references(() => importBibliographyRows.id),
  itemCode: varchar("item_code", { length: 50 }).notNull(),
  sourcePosition: integer("source_position").notNull().default(1),
  committedBibliographyId: uuid("committed_bibliography_id").references(() => bibliographies.id),
  validationStatus: varchar("validation_status", { length: 20 }).default("pending"),
  warningCodes: jsonb("warning_codes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  batchItemCodeIdx: index("ibic_batch_item_code_idx").on(table.batchId, table.itemCode),
  committedBibIdx: index("ibic_committed_bib_idx").on(table.committedBibliographyId)
}));

// ==========================================
// 10. RELATIONS
// ==========================================

export const userRelations = relations(Users, ({ one }) => ({
  member: one(members)
}));

export const memberRelations = relations(members, ({ one, many }) => ({
  user: one(Users, { fields: [members.userId], references: [Users.id] }),
  loans: many(loans)
}));

export const bibliographyRelations = relations(bibliographies, ({ one, many }) => ({
  category: one(categories, { fields: [bibliographies.categoryId], references: [categories.id] }),
  publisher: one(publishers, { fields: [bibliographies.publisherId], references: [publishers.id] }),
  language: one(languages, { fields: [bibliographies.languageId], references: [languages.id] }),
  publicationPlace: one(publicationPlaces, { fields: [bibliographies.publicationPlaceId], references: [publicationPlaces.id] }),
  gmd: one(gmds, { fields: [bibliographies.gmdId], references: [gmds.id] }),
  collectionType: one(collectionTypes, { fields: [bibliographies.collectionTypeId], references: [collectionTypes.id] }),
  items: many(items),
  contents: many(bibliographyContents),
  bibliographyAuthors: many(bibliographyAuthors),
  bibliographySubjects: many(bibliographySubjects),
  bibliographyFaculties: many(bibliographyFaculties),
  bibliographyStudyPrograms: many(bibliographyStudyPrograms)
}));

export const bibliographyAuthorsRelations = relations(bibliographyAuthors, ({ one }) => ({
  bibliography: one(bibliographies, { fields: [bibliographyAuthors.bibliographyId], references: [bibliographies.id] }),
  author: one(authors, { fields: [bibliographyAuthors.authorId], references: [authors.id] })
}));

export const bibliographySubjectsRelations = relations(bibliographySubjects, ({ one }) => ({
  bibliography: one(bibliographies, { fields: [bibliographySubjects.bibliographyId], references: [bibliographies.id] }),
  subject: one(subjects, { fields: [bibliographySubjects.subjectId], references: [subjects.id] })
}));

export const itemRelations = relations(items, ({ one, many }) => ({
  bibliography: one(bibliographies, { fields: [items.bibliographyId], references: [bibliographies.id] }),
  location: one(locations, { fields: [items.locationId], references: [locations.id] }),
  vendor: one(vendors, { fields: [items.vendorId], references: [vendors.id] }),
  collectionType: one(collectionTypes, { fields: [items.collectionTypeId], references: [collectionTypes.id] }),
  loans: many(loans)
}));

export const loanRelations = relations(loans, ({ one, many }) => ({
  member: one(members, { fields: [loans.memberId], references: [members.id] }),
  item: one(items, { fields: [loans.itemId], references: [items.id] }),
  authApproved: one(Users, { fields: [loans.approvedBy], references: [Users.id] }),
  returnRequests: many(returnRequests)
}));

export const reservationRelations = relations(reservations, ({ one }) => ({
  member: one(members, { fields: [reservations.memberId], references: [members.id] }),
  bibliography: one(bibliographies, { fields: [reservations.bibliographyId], references: [bibliographies.id] })
}));

export const returnRequestRelations = relations(returnRequests, ({ one }) => ({
  loan: one(loans, { fields: [returnRequests.loanId], references: [loans.id] }),
  processedByUser: one(Users, { fields: [returnRequests.processedBy], references: [Users.id] })
}));

export const importBatchRelations = relations(importBatches, ({ one, many }) => ({
  creator: one(Users, { fields: [importBatches.createdBy], references: [Users.id] }),
  bibliographyRows: many(importBibliographyRows),
  itemRows: many(importItemRows),
  errors: many(importErrors)
}));

export const importBibliographyRowRelations = relations(importBibliographyRows, ({ one }) => ({
  batch: one(importBatches, { fields: [importBibliographyRows.batchId], references: [importBatches.id] })
}));

export const importItemRowRelations = relations(importItemRows, ({ one }) => ({
  batch: one(importBatches, { fields: [importItemRows.batchId], references: [importBatches.id] })
}));

export const importErrorRelations = relations(importErrors, ({ one }) => ({
  batch: one(importBatches, { fields: [importErrors.batchId], references: [importBatches.id] })
}));

export const facultyRelations = relations(faculties, ({ many }) => ({
  studyPrograms: many(studyPrograms),
  bibliographyFaculties: many(bibliographyFaculties)
}));

export const studyProgramRelations = relations(studyPrograms, ({ one, many }) => ({
  faculty: one(faculties, { fields: [studyPrograms.facultyId], references: [faculties.id] }),
  bibliographyStudyPrograms: many(bibliographyStudyPrograms)
}));

export const bibliographyFacultyRelations = relations(bibliographyFaculties, ({ one }) => ({
  bibliography: one(bibliographies, { fields: [bibliographyFaculties.bibliographyId], references: [bibliographies.id] }),
  faculty: one(faculties, { fields: [bibliographyFaculties.facultyId], references: [faculties.id] })
}));

export const bibliographyStudyProgramRelations = relations(bibliographyStudyPrograms, ({ one }) => ({
  bibliography: one(bibliographies, { fields: [bibliographyStudyPrograms.bibliographyId], references: [bibliographies.id] }),
  studyProgram: one(studyPrograms, { fields: [bibliographyStudyPrograms.studyProgramId], references: [studyPrograms.id] })
}));
