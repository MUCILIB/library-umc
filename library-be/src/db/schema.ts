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
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==========================================
// 1. ENUMS
// ==========================================
// statusUserEnum removed - using Better Auth 'banned' field instead
export const collectionTypeEnum = pgEnum("collection_type", [
  "physical_book",
  "ebook",
  "journal",
  "thesis",
]);
export const contentTypeEnum = pgEnum("content_type", ["text", "pdf", "url"]);
export const itemStatusEnum = pgEnum("item_status", [
  "available",
  "loaned",
  "damaged",
  "lost",
]);
export const loansStatusEnum = pgEnum("loans_status", [
  "pending",
  "approved",
  "returned",
  "extended",
]);
export const reservationsStatusEnum = pgEnum("reservations_status", [
  "waiting",
  "fulfilled",
  "canceled",
]);
export const finesStatusEnum = pgEnum("fines_status", ["paid", "unpaid"]);
export const logsStatusEnum = pgEnum("logs_status", [
  "create",
  "update",
  "delete",
  "approve",
  "blacklist",
]);
export const logsEntityEnum = pgEnum("logs_entity", [
  "loan",
  "item",
  "fine",
  "Users",
]);

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending",
  "approved",
  "rejected",
]);

export const memberType = pgEnum("member_type", [
  "student",
  "lecturer",
  "staff",
  "super_admin",
]);

// ==========================================
// 2. MASTER DATA (Keep Integer for Static Data)
// ==========================================

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
});

export const locations = pgTable("locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  room: varchar("room", { length: 200 }).notNull(),
  rack: varchar("rack", { length: 200 }).notNull(),
  shelf: varchar("shelf", { length: 200 }).notNull(),
});

export const vendors = pgTable("vendors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }),
  contact: varchar("contact", { length: 255 }),
});

// ==========================================
// 3. AUTHENTICATION (BETTER AUTH + CUSTOM)
// ==========================================

export const Users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // Better Auth uses String ID
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),

    // Custom Fields from your ERD
    passwordHash: varchar("password_hash", { length: 255 }), // Keep if you use credential auth alongside oauth
    deletedAt: timestamp("deleted_at"),

    // Required by Better Auth Admin Plugin
    role: text("role").default("student"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),
  },
  (table) => {
    return {
      deletedAtIdx: index("user_deleted_at_idx").on(table.deletedAt),
    };
  },
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => Users.id),

  // Required by Better Auth Admin Plugin for Impersonation
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => Users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ==========================================
// 4. MEMBERS & PROFILE
// ==========================================

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => Users.id),
    memberType: memberType("member_type").notNull(), // 'Student', 'Lecture'
    nimNidn: varchar("nim_nidn", { length: 255 }),
    faculty: varchar("faculty", { length: 255 }),
    phone: varchar("phone", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      nimIdx: index("member_nim_idx").on(table.nimNidn),
      deletedAtIdx: index("member_deleted_at_idx").on(table.deletedAt),
    };
  },
);

// ==========================================
// 5. COLLECTIONS (BOOKS, ETC)
// ==========================================

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  isbn: varchar("isbn", { length: 255 }),
  title: varchar("title", { length: 255 }),
  author: varchar("author", { length: 255 }),
  publisher: varchar("publisher", { length: 150 }),
  publicationYear: varchar("publication_year", { length: 100 }),
  type: collectionTypeEnum("type"),
  categoryId: integer("category_id").references(() => categories.id), // Category stays Integer
  description: text("description"),
  image: text("image"), // Stores Cloudinary URL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const collectionContents = pgTable("collection_contents", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  collectionId: uuid("collection_id").references(() => collections.id), // Reference UUID
  contentType: contentTypeEnum("content_type"),
  content: text("content"), // Caution: Large text
  contentUrl: varchar("content_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const collectionViews = pgTable(
  "collection_views",
  {
    id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id), // Reference UUID
    userId: text("user_id").references(() => Users.id),
    ipAddress: varchar("ip_address", { length: 45 }),
    viewedAt: timestamp("viewed_at").defaultNow(),
  },
  (table) => {
    return {
      collIdx: index("cv_collection_idx").on(table.collectionId),
      viewedAtIdx: index("cv_viewed_at_idx").on(table.viewedAt),
    };
  },
);

// ==========================================
// 6. INVENTORY & TRANSACTIONS
// ==========================================

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id), // Reference UUID
    barcode: varchar("barcode", { length: 50 }).unique(),
    uniqueCode: varchar("unique_code", { length: 30 }).unique(),
    status: itemStatusEnum("status").notNull().default("available"),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id), // References Integer
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      collIdx: index("item_collection_idx").on(table.collectionId),
      statusIdx: index("item_status_idx").on(table.status),
      deletedAtIdx: index("item_deleted_at_idx").on(table.deletedAt),
      locationIdx: index("item_location_idx").on(table.locationId),
    };
  },
);

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id), // Reference UUID
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id), // Reference UUID
    loanDate: date("loan_date").notNull(),
    dueDate: date("due_date").notNull(),
    returnDate: date("return_date"),
    status: loansStatusEnum("status").notNull(),
    approvedBy: text("approved_by").references(() => Users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => {
    return {
      statusIdx: index("loan_status_idx").on(table.status),
      deletedAtIdx: index("loan_deleted_at_idx").on(table.deletedAt),
      memberIdx: index("loan_member_idx").on(table.memberId),
      itemIdx: index("loan_item_idx").on(table.itemId),
      activeLoanIdx: index("loan_active_idx").on(table.itemId, table.status),
    };
  },
);

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id), // Reference UUID
  collectionId: uuid("collection_id") // References Collection
    .notNull()
    .references(() => collections.id), // Reference UUID
  status: reservationsStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const fines = pgTable("fines", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loans.id), // Reference UUID
  amount: numeric("amount", { precision: 12, scale: 2 }),
  status: finesStatusEnum("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  fineId: uuid("fine_id")
    .notNull()
    .references(() => fines.id), // Reference UUID
  paymentMethod: varchar("payment_method", { length: 100 }),
  confirmedBy: text("confirmed_by")
    .notNull()
    .references(() => Users.id),
  paidAt: date("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const acquisitions = pgTable("acquisitions", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id), // References Integer
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id), // Reference UUID
  quantity: integer("quantity"),
  acquiredAt: date("acquired_at"),
  createdAt: date("created_at").defaultNow(),
});

// Tabel rekomendasi dosen ke pustakaawan
export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  dosenId: text("dosen_id")
    .notNull()
    .references(() => Users.id),
  title: varchar("title", { length: 255 }),
  author: varchar("author", { length: 255 }),
  publisher: varchar("publisher", { length: 255 }),
  reason: text("reason"),
  status: recommendationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// ==========================================
// 7. LOGS & ANALYTICS
// ==========================================

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  userId: text("user_id")
    .notNull()
    .references(() => Users.id),
  action: logsStatusEnum("action").notNull(),
  entity: logsEntityEnum("entity").notNull(),
  entityId: varchar("entity_id", { length: 255 }), // Changed to varchar to support both UUID and Text IDs
  ipAddress: varchar("ip_address", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webTraffic = pgTable("web_traffic", {
  id: text("id").primaryKey(), // Already Text/UUID
  ipAddress: varchar("ip_address", { length: 45 }),
  userId: text("user_id").references(() => Users.id),
  pageVisited: varchar("page_visited", { length: 255 }),
  visitTimestamp: timestamp("visit_timestamp").defaultNow(),
  userAgent: text("user_agent"),
});

// ==========================================
// 8. ADDITION: GUEST LOGS (PENGUNJUNG)
// ==========================================

export const guestLogs = pgTable("guest_logs", {
  id: uuid("id").primaryKey().defaultRandom(), // Converted to UUID
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  identifier: varchar("identifier", { length: 100 }).notNull(), // NIM/NIDN/KTP
  faculty: varchar("faculty", { length: 255 }), // If Student/Lecturer
  major: varchar("major", { length: 255 }), // If Student (Prodi)
  visitDate: timestamp("visit_date").defaultNow(),
});

// ==========================================
// 9. RELATIONS (DRIZZLE ORM)
// ==========================================

// Relasi Users -> Roles / Members
export const userRelations = relations(Users, ({ one }) => ({
  member: one(members, {
    fields: [Users.id],
    references: [members.userId],
  }),
}));

// Relasi Collections -> Category / Items
export const collectionRelations = relations(collections, ({ one, many }) => ({
  category: one(categories, {
    fields: [collections.categoryId],
    references: [categories.id],
  }),
  items: many(items),
  contents: many(collectionContents),
}));

export const itemRelations = relations(items, ({ one, many }) => ({
  collection: one(collections, {
    fields: [items.collectionId],
    references: [collections.id],
  }),
  location: one(locations, {
    fields: [items.locationId],
    references: [locations.id],
  }),
  activeLoan: many(loans), // Bisa filter 'pending'/'approved' nanti
}));

export const loanRelations = relations(loans, ({ one }) => ({
  member: one(members, {
    fields: [loans.memberId],
    references: [members.id],
  }),
  item: one(items, {
    fields: [loans.itemId],
    references: [items.id],
  }),
  authApproved: one(Users, {
    fields: [loans.approvedBy],
    references: [Users.id],
  }),
}));

export const recommendationRelations = relations(
  recommendations,
  ({ one }) => ({
    dosen: one(Users, {
      fields: [recommendations.dosenId],
      references: [Users.id],
    }),
  }),
);
