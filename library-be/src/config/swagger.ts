import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "MUCILIB - UMC API",
    version: "1.0.0",
    description: "API Documentation for Library Management System Backend",
    contact: {
      name: "Developer Team",
      email: "rizqinoorf@gmail.com",
    },
  },
  servers: [
    {
      url: "https://api-library.abyte.my.id/api",
      description: "Production Server",
    },
    {
      url: "http://localhost:4000/api",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT", // Atau Session Token
        description:
          "Masukkan token session penuh Anda di sini (tanpa prefix 'Bearer ', sistem akan menambahkannya otomatis). Token ini didapat dari field 'token' pada object session.",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string" },
          image: { type: "string", nullable: true },
          emailVerified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Member: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string" },
          memberType: {
            type: "string",
            enum: ["student", "lecturer", "staff", "super_admin"],
          },
          nimNidn: { type: "string", nullable: true },
          faculty: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
        },
      },
      Bibliography: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          isbn: { type: "string", nullable: true, example: "978-602-1234-56-7" },
          issn: { type: "string", nullable: true, example: "2085-4552" },
          isbnIssn: { type: "string", nullable: true },
          title: { type: "string" },
          sor: { type: "string", nullable: true },
          edition: { type: "string", nullable: true },
          publisher: { type: "object", nullable: true },
          publishYear: { type: "integer", nullable: true },
          collation: { type: "string", nullable: true },
          seriesTitle: { type: "string", nullable: true },
          callNumber: { type: "string", nullable: true },
          classification: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          type: {
            type: "string",
            enum: ["physical_book", "ebook", "journal", "thesis"],
          },
          categoryId: { type: "integer" },
          description: { type: "string", nullable: true },
          image: { type: "string", nullable: true },
          stock: { type: "integer" },
          authors: { type: "array", items: { type: "object" } },
          subjects: { type: "array", items: { type: "object" } },
          totalItems: { type: "integer" },
          availableItems: { type: "integer" },
          faculties: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, code: { type: "string" } } } },
          studyPrograms: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, code: { type: "string" }, faculty: { type: "object" } } } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          category: { $ref: "#/components/schemas/Category" },
        },
      },
      Faculty: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          code: { type: "string", nullable: true },
        },
      },
      StudyProgram: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          code: { type: "string", nullable: true },
          facultyId: { type: "integer" },
          faculty: { $ref: "#/components/schemas/Faculty" },
        },
      },
      GuestLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", nullable: true },
          name: { type: "string" },
          identifier: { type: "string", description: "NIM/NIDN/KTP" },
          faculty: { type: "string", nullable: true },
          major: { type: "string", nullable: true },
          visitDate: { type: "string", format: "date-time" },
        },
      },
      Location: {
        type: "object",
        properties: {
          id: { type: "integer" },
          room: { type: "string" },
          rack: { type: "string" },
          shelf: { type: "string" },
        },
      },
      Item: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          bibliographyId: { type: "string", format: "uuid" },
          barcode: { type: "string", nullable: true },
          uniqueCode: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["available", "loaned", "damaged", "lost"],
          },
          locationId: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          bibliography: { $ref: "#/components/schemas/Bibliography" },
          location: { $ref: "#/components/schemas/Location" },
        },
      },
      Loan: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          memberId: { type: "string", format: "uuid" },
          itemId: { type: "string", format: "uuid" },
          loanDate: { type: "string", format: "date" },
          dueDate: { type: "string", format: "date" },
          returnDate: { type: "string", format: "date", nullable: true },
          status: {
            type: "string",
            enum: ["pending", "approved", "returned", "extended"],
          },
          approvedBy: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          member: { $ref: "#/components/schemas/Member" },
          item: { $ref: "#/components/schemas/Item" },
        },
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          memberId: { type: "string", format: "uuid" },
          bibliographyId: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["waiting", "fulfilled", "canceled"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          member: { $ref: "#/components/schemas/Member" },
          bibliography: { $ref: "#/components/schemas/Bibliography" },
        },
      },
      Fine: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          loanId: { type: "string", format: "uuid" },
          amount: { type: "number", format: "decimal" },
          status: {
            type: "string",
            enum: ["paid", "unpaid"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          loan: { $ref: "#/components/schemas/Loan" },
        },
      },
      Recommendation: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          dosenId: { type: "string" },
          title: { type: "string" },
          author: { type: "string" },
          publisher: { type: "string" },
          reason: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          dosen: { $ref: "#/components/schemas/User" },
        },
      },
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: { type: "object", nullable: true },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          data: {
            type: "array",
            items: { type: "object" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Members", description: "Member profile management" },
    { name: "Categories", description: "Book category management" },
    { name: "Guests", description: "Guest/Visitor log management (Admin only)" },
    { name: "Bibliographies", description: "Book & Bibliography management" },
    { name: "Items", description: "Physical copy management" },
    { name: "Loans", description: "Loan management" },
    { name: "Reservations", description: "Reservation management" },
    { name: "Fines", description: "Fine management" },
    { name: "Locations", description: "Location/room/rack management" },
    { name: "Recommendations", description: "Book recommendation from lecturers" },
    { name: "Import", description: "CSV import (bibliographies & items)" },
    { name: "Export", description: "CSV export (bibliographies & items)" },
    { name: "Faculties", description: "Faculty management (Super Admin)" },
    { name: "Study Programs", description: "Study program management (Super Admin)" },
  ],
  paths: {
    "/auth/sign-in/email": {
      post: {
        summary: "Sign In dengan Email & Password (Better-Auth)",
        description: "Autentikasi menggunakan email dan password via Better-Auth. Mengembalikan cookie session dan session token.",
        tags: ["Auth"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@umc.ac.id" },
                  password: { type: "string", example: "admin123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login berhasil, session dibuat",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    session: {
                      type: "object",
                      properties: {
                        token: { type: "string" },
                        userId: { type: "string" },
                        expiresAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Email atau password salah" },
        },
      },
    },
    "/auth/sign-up/email": {
      post: {
        summary: "Sign Up dengan Email & Password (Better-Auth)",
        description: "Registrasi user baru via Better-Auth.",
        tags: ["Auth"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Fauzan Noor" },
                  email: { type: "string", format: "email", example: "user@umc.ac.id" },
                  password: { type: "string", example: "SecurePass123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Registrasi berhasil" },
          400: { description: "Email sudah terdaftar atau input tidak valid" },
        },
      },
    },
    "/auth/sign-out": {
      post: {
        summary: "Sign Out / Logout (Better-Auth)",
        description: "Menghapus session aktif dan membersihkan cookie.",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Logout berhasil" },
        },
      },
    },
    "/auth/get-session": {
      get: {
        summary: "Get Current Session (Better-Auth)",
        description: "Mengambil data session dan user yang sedang login.",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Session aktif ditemukan" },
          401: { description: "Tidak ada session aktif" },
        },
      },
    },
    "/users/all": {
      get: {
        summary: "Get All Users (Super Admin Only)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of all users",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
        },
      },
    },
    "/users/{id}/role": {
      patch: {
        summary: "Update User Role (Super Admin)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["user", "staff", "super_admin"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Role updated" },
        },
      },
    },
    "/users/{id}/ban": {
      patch: {
        summary: "Ban / Unban User (Super Admin)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["banned"],
                properties: {
                  banned: { type: "boolean" },
                  banReason: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Ban status updated" },
        },
      },
    },
    "/users/{id}/sync-member": {
      post: {
        summary: "Sync User ke Member (Super Admin)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Member synced" },
        },
      },
    },
    "/auth/users": {
      get: {
        summary: "Get All Users (Super Admin Only)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of all users",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Super Admin only" },
        },
      },
    },
    "/members/me": {
      get: {
        summary: "Get Current Member Profile",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Member profile data",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiResponse" },
                    {
                      properties: {
                        data: { $ref: "#/components/schemas/Member" },
                      },
                    },
                  ],
                },
              },
            },
          },
          404: { description: "Member profile not found" },
        },
      },
      patch: {
        summary: "Update Current Member Profile",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nimNidn: { type: "string" },
                  faculty: { type: "string" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Member" },
              },
            },
          },
        },
      },
    },
    "/members": {
      get: {
        summary: "Get All Members",
        description: "Melihat daftar semua member (Staff / Super Admin only).",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 10 } },
          { in: "query", name: "search", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Daftar member berhasil diambil" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/members/me/card": {
      get: {
        summary: "Get My Member Card",
        description: "Mengambil data kartu anggota milik user yang sedang login.",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Data kartu anggota" },
          404: { description: "Belum memiliki kartu anggota" },
        },
      },
    },
    "/members/me/card/request": {
      post: {
        summary: "Request Member Card",
        description: "Mengajukan pembuatan kartu anggota fisik / digital.",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "Pengajuan kartu anggota berhasil diajukan" },
          400: { description: "Pengajuan sudah ada atau profil belum lengkap" },
        },
      },
    },
    "/members/cards/pending": {
      get: {
        summary: "Get Pending Member Card Requests",
        description: "Melihat antrean pengajuan kartu anggota (Staff / Super Admin).",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Daftar antrean pengajuan kartu" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/members/{id}/card/approve": {
      patch: {
        summary: "Approve Member Card Request",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Pengajuan disetujui" },
          404: { description: "Permintaan tidak ditemukan" },
        },
      },
    },
    "/members/{id}/card/issue": {
      post: {
        summary: "Issue / Terbitkan Member Card",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Kartu anggota berhasil diterbitkan" },
        },
      },
    },
    "/members/{id}/card/reject": {
      patch: {
        summary: "Reject Member Card Request",
        tags: ["Members"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Pengajuan ditolak" },
        },
      },
    },
    "/bibliographies": {
      get: {
        summary: "Get All Bibliographies",
        description: "Retrieve a list of all bibliographies (books, etc).",
        tags: ["Bibliographies"],
        security: [],
        responses: {
          200: {
            description: "List of bibliographies",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create New Bibliography",
        description: "Add a new collection (book) with cover image upload.",
        tags: ["Bibliographies"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Title of the collection",
                  },
                  author: { type: "string", description: "Author name" },
                  publisher: { type: "string", description: "Publisher name" },
                  publicationYear: {
                    type: "string",
                    format: "year",
                    description: "Year of publication (YYYY)",
                  },
                  isbn: { type: "string", description: "ISBN number" },
                  type: {
                    type: "string",
                    enum: ["physical_book", "ebook", "journal", "thesis"],
                    description: "Type of collection",
                  },
                  categoryId: { type: "integer", description: "Category ID" },
                  description: {
                    type: "string",
                    description: "Description or synopsis",
                  },
                  quantity: {
                    type: "integer",
                    default: 1,
                    description: "Number of copies (for physical books)",
                  },
                  cover: {
                    type: "string",
                    format: "binary",
                    description: "Cover image file",
                  },
                },
                required: [
                  "title",
                  "author",
                  "publisher",
                  "publicationYear",
                  "type",
                  "categoryId",
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Bibliography created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
          400: { description: "Validation Error" },
          500: { description: "Server Error" },
        },
      },
    },
    "/categories": {
      get: {
        summary: "Get All Categories",
        description: "Retrieve a list of all book categories.",
        tags: ["Categories"],
        security: [],
        responses: {
          200: {
            description: "List of categories",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create New Category",
        description: "Add a new books category.",
        tags: ["Categories"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the category",
                  },
                  description: {
                    type: "string",
                    description: "Description of the category",
                  },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Category created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
          400: { description: "Validation Error" },
          500: { description: "Server Error" },
        },
      },
    },
    "/guests": {
      get: {
        summary: "Get Guest Logs",
        description: "Retrieve list of guest visits (Admin Only).",
        tags: ["Guests (Pengunjung)"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 50 },
            description: "Items per page",
          },
        ],
        responses: {
          200: {
            description: "List of guest logs",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Guest Log",
        description: "Record a new visitor/guest (Admin Only).",
        tags: ["Guests (Pengunjung)"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  identifier: { type: "string", description: "NIM or KTP" },
                  institution: { type: "string", default: "UMC" },
                  faculty: { type: "string" },
                  major: { type: "string" },
                  purpose: { type: "string" },
                },
                required: ["name", "identifier"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Guest log created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
              },
            },
          },
        },
      },
    },
    "/guests/stats": {
      get: {
        summary: "Get Guest Statistics",
        description: "Get analytics about visitors by Faculty and Major.",
        tags: ["Guests (Pengunjung)"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Guest statistics",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResponse",
                },
              },
            },
          },
        },
      },
    },
    "/bibliographies/{id}": {
      get: {
        summary: "Get Bibliography By ID",
        description: "Retrieve a specific bibliography by its ID.",
        tags: ["Bibliographies"],
        security: [],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Bibliography details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          404: { description: "Not found" },
        },
      },
      patch: {
        summary: "Update Bibliography",
        description: "Update bibliography data (Admin/Staff only).",
        tags: ["Bibliographies"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  publisher: { type: "string" },
                  publicationYear: { type: "string" },
                  isbn: { type: "string" },
                  type: { type: "string", enum: ["physical_book", "ebook", "journal", "thesis"] },
                  categoryId: { type: "integer" },
                  description: { type: "string" },
                  cover: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Bibliography updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          400: { description: "Validation Error" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "Soft Delete Bibliography",
        description: "Soft delete a bibliography (Super Admin only).",
        tags: ["Bibliographies"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Bibliography deleted" },
          403: { description: "Forbidden" },
          404: { description: "Not found" },
        },
      },
    },
    "/bibliographies/{id}/items": {
      get: {
        summary: "Get Items Under Bibliography",
        description: "Retrieve all items (copies) for a specific bibliography.",
        tags: ["Bibliographies"],
        security: [],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "List of items", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          404: { description: "Bibliography not found" },
        },
      },
    },
    "/bibliographies/{bibliographyId}/items/bulk": {
      post: {
        summary: "Bulk Create Items",
        description: "Create up to 1000 items (copies) at once under a bibliography. Use `defaults` to set shared values for all items.",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "bibliographyId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    minItems: 1,
                    maxItems: 1000,
                    items: {
                      type: "object",
                      required: ["itemCode"],
                      properties: {
                        itemCode: { type: "string", maxLength: 50, description: "Unique item code" },
                        barcode: { type: "string", maxLength: 50 },
                        locationId: { type: "integer" },
                        callNumber: { type: "string", maxLength: 100 },
                        inventoryCode: { type: "string", maxLength: 50 },
                      },
                    },
                  },
                  defaults: {
                    type: "object",
                    description: "Default values applied when item-level field is empty",
                    properties: {
                      locationId: { type: "integer" },
                      source: { type: "string" },
                      priceCurrency: { type: "string" },
                      collectionTypeId: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Items created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          400: { description: "Validation Error" },
        },
      },
    },
    "/items": {
      get: {
        summary: "Get All Items",
        description: "Retrieve a list of all items. Filter by ?bibliographyId=uuid.",
        tags: ["Items"],
        security: [],
        parameters: [
          { in: "query", name: "bibliographyId", schema: { type: "string", format: "uuid" }, description: "Filter by bibliography" },
        ],
        responses: {
          200: {
            description: "List of items",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponse" },
              },
            },
          },
        },
      },
      post: {
        summary: "Create New Item",
        description: "Create a single item (physical copy) under a bibliography (Admin/Staff only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bibliographyId", "locationId", "itemCode"],
                properties: {
                  bibliographyId: { type: "string", format: "uuid" },
                  locationId: { type: "integer" },
                  itemCode: { type: "string", maxLength: 50 },
                  barcode: { type: "string", maxLength: 50 },
                  uniqueCode: { type: "string", maxLength: 30 },
                  inventoryCode: { type: "string", maxLength: 50 },
                  callNumber: { type: "string", maxLength: 100 },
                  collectionTypeId: { type: "integer" },
                  vendorId: { type: "integer" },
                  receivedDate: { type: "string", format: "date" },
                  orderNo: { type: "string" },
                  orderDate: { type: "string", format: "date" },
                  source: { type: "string" },
                  invoice: { type: "string" },
                  price: { type: "number" },
                  priceCurrency: { type: "string", default: "IDR" },
                  invoiceDate: { type: "string", format: "date" },
                  site: { type: "string" },
                  status: { type: "string", enum: ["available", "loaned", "damaged", "lost"], default: "available" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Item created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          400: { description: "Validation Error" },
        },
      },
    },
    "/items/{id}": {
      get: {
        summary: "Get Item By ID",
        description: "Retrieve a specific item by its ID.",
        tags: ["Items"],
        security: [],
        parameters: [
          { name: "id", in: "path", required: true, description: "Item ID", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Item details", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          404: { description: "Not found" },
        },
      },
      patch: {
        summary: "Update Item",
        description: "Update item fields (Admin/Staff only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  locationId: { type: "integer" },
                  barcode: { type: "string" },
                  uniqueCode: { type: "string" },
                  inventoryCode: { type: "string" },
                  callNumber: { type: "string" },
                  collectionTypeId: { type: "integer" },
                  vendorId: { type: "integer" },
                  receivedDate: { type: "string" },
                  orderNo: { type: "string" },
                  orderDate: { type: "string" },
                  source: { type: "string" },
                  invoice: { type: "string" },
                  price: { type: "number" },
                  priceCurrency: { type: "string" },
                  invoiceDate: { type: "string" },
                  site: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Item updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          400: { description: "Validation Error" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "Soft Delete Item",
        description: "Soft delete an item (Admin/Staff only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Item deleted" },
          400: { description: "Cannot delete" },
        },
      },
    },
    "/items/{id}/status": {
      patch: {
        summary: "Update Item Status",
        description: "Change item status: available, loaned, damaged, lost (Admin/Staff only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["available", "loaned", "damaged", "lost"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Status updated" },
          400: { description: "Invalid status" },
        },
      },
    },
    "/items/{id}/location": {
      patch: {
        summary: "Update Item Location",
        description: "Move item to a different location (Admin/Staff only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["locationId"],
                properties: {
                  locationId: { type: "integer", description: "Target location ID" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Location updated" },
          400: { description: "Invalid location" },
        },
      },
    },
    "/items/{id}/qr": {
      get: {
        summary: "Get Item QR Code",
        description: "Get QR code for an item. ?format=svg (default) or ?format=png.",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "format", in: "query", schema: { type: "string", enum: ["svg", "png"], default: "svg" } },
        ],
        responses: {
          200: { description: "QR code image (SVG or PNG)" },
          404: { description: "Item not found" },
        },
      },
    },
    "/items/{id}/qr/regenerate": {
      post: {
        summary: "Regenerate Item QR",
        description: "Generate new QR token for item (Super Admin only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "QR regenerated" },
        },
      },
    },
    "/items/{id}/qr/revoke": {
      post: {
        summary: "Revoke Item QR",
        description: "Revoke/disable QR token for item (Super Admin only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "QR revoked" },
        },
      },
    },
    "/qr/resolve/{token}": {
      get: {
        summary: "Resolve QR Token to Item",
        description: "Lookup item by QR token (Admin/Staff only).",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Item found" },
          404: { description: "QR not found or revoked" },
        },
      },
    },
    "/items/bulk-labels": {
      get: {
        summary: "Get Bulk Label Data",
        description: "Get label data for multiple items. ?ids=uuid1,uuid2,uuid3.",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "ids", in: "query", required: true, schema: { type: "string" }, description: "Comma-separated item UUIDs" },
        ],
        responses: {
          200: { description: "Label data retrieved" },
        },
      },
    },
    "/items/generate-code/{bibliographyId}": {
      get: {
        summary: "Generate Next Item Code",
        tags: ["Items"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "bibliographyId", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Item code generated" } },
      },
    },
    "/loans": {
      get: {
        summary: "Get All Loans",
        description: "Retrieve a list of all loans (Admin/Staff only).",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "status", schema: { type: "string", enum: ["pending", "approved", "returned", "extended", "rejected"] }, description: "Filter by status" },
          { in: "query", name: "memberId", schema: { type: "string" }, description: "Filter by member ID" },
        ],
        responses: {
          200: { description: "List of loans", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/loans/request": {
      post: {
        summary: "Request a Book Loan",
        description: "Member requests to borrow a book. System generates a verification token.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bibliographyId"],
                properties: {
                  bibliographyId: { type: "string", format: "uuid", description: "ID of the bibliography (book) to borrow" },
                  loanDate: { type: "string", format: "date" },
                  dueDate: { type: "string", format: "date" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Loan requested successfully" },
          400: { description: "Item not available or validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/loans/history": {
      get: {
        summary: "Get My Loan History",
        description: "Member views their own loan history.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "My loan history" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/loans/verify/{token}": {
      get: {
        summary: "Verify Loan Token",
        description: "Admin scans QR code/token to verify loan request validity.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Token verified, returns loan data" },
          400: { description: "Invalid or expired token" },
        },
      },
    },
    "/loans/{requestId}/approve": {
      post: {
        summary: "Approve Loan",
        description: "Admin approves the loan request after verification. Item status becomes 'loaned'.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "requestId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Loan approved" },
          404: { description: "Loan request not found" },
        },
      },
    },
    "/loans/{requestId}/reject": {
      post: {
        summary: "Reject Loan",
        description: "Admin rejects the loan request.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "requestId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } },
        },
        responses: {
          200: { description: "Loan rejected" },
          404: { description: "Loan request not found" },
        },
      },
    },
    "/loans/{loanId}/return-request": {
      post: {
        summary: "Create Return Request",
        description: "Member creates a return request for a loan.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "loanId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Return request created" },
          400: { description: "Cannot create return request" },
        },
      },
    },
    "/loans/return-requests/pending": {
      get: {
        summary: "Get Pending Return Requests",
        description: "Admin gets all pending return requests (Super Admin only).",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Pending return requests" },
        },
      },
    },
    "/loans/return-requests/{requestId}/approve": {
      post: {
        summary: "Approve Return Request",
        description: "Admin approves a return request (Super Admin only).",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "requestId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Return approved" },
        },
      },
    },
    "/loans/{loanId}/extend": {
      post: {
        summary: "Extend Loan",
        description: "Member extends their current loan by 7 days. Limit 1x, only if not overdue and no reservations.",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "loanId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Loan extended" },
          400: { description: "Cannot extend (overdue, reserved, or already extended)" },
        },
      },
    },
    "/loans/{loanId}/approve-extension": {
      patch: {
        summary: "Approve Loan Extension (Staff / Admin)",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "loanId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Extension approved" } },
      },
    },
    "/loans/{loanId}/reject-extension": {
      patch: {
        summary: "Reject Loan Extension (Staff / Admin)",
        tags: ["Loans"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "loanId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Extension rejected" } },
      },
    },
    "/reservations": {
      get: {
        summary: "Get All Reservations",
        description: "Admin/Staff views all reservations.",
        tags: ["Reservations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "status", schema: { type: "string", enum: ["waiting", "fulfilled", "canceled"] } },
          { in: "query", name: "memberId", schema: { type: "string" } },
          { in: "query", name: "bibliographyId", schema: { type: "string" } },
          { in: "query", name: "limit", schema: { type: "integer" } },
          { in: "query", name: "offset", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "List of all reservations" },
          403: { description: "Forbidden" },
        },
      },
      post: {
        summary: "Create Reservation",
        description: "Member reserves a book when all copies are loaned. Max 3 active reservations.",
        tags: ["Reservations"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bibliographyId"],
                properties: {
                  bibliographyId: { type: "string", format: "uuid", description: "ID of the bibliography to reserve" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Reservation created" },
          400: { description: "Still has available copies / already reserved / limit reached" },
          404: { description: "Bibliography not found" },
        },
      },
    },
    "/reservations/my": {
      get: {
        summary: "Get My Reservations",
        description: "Member views their own reservations.",
        tags: ["Reservations"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "My reservations" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/reservations/{id}/cancel": {
      patch: {
        summary: "Cancel Reservation",
        description: "Member cancels their reservation (only if status is 'waiting').",
        tags: ["Reservations"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Reservation canceled" },
          400: { description: "Cannot cancel (already fulfilled/canceled)" },
          404: { description: "Reservation not found" },
        },
      },
    },
    "/fines": {
      get: {
        summary: "Get All Fines",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "query", name: "status", schema: { type: "string", enum: ["paid", "unpaid"] } },
          { in: "query", name: "loanId", schema: { type: "string" } },
          { in: "query", name: "limit", schema: { type: "integer" } },
          { in: "query", name: "offset", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "List of fines" } },
      },
      post: {
        summary: "Create Manual Fine",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["loanId", "amount"], properties: { loanId: { type: "string" }, amount: { type: "number" } } } } },
        },
        responses: { 201: { description: "Fine created" } },
      },
    },
    "/fines/my": {
      get: {
        summary: "Get My Fines",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "My fines" } },
      },
    },
    "/fines/audit/paid-active-loans": {
      get: {
        summary: "Audit Paid Fines with Non-Returned Loans",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Audit data" } },
      },
    },
    "/fines/{id}": {
      get: {
        summary: "Get Fine By ID",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Fine details" }, 404: { description: "Not found" } },
      },
      delete: {
        summary: "Delete Fine",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Fine deleted" } },
      },
    },
    "/fines/{id}/pay": {
      post: {
        summary: "Pay Fine",
        tags: ["Fines"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["paymentMethod"], properties: { paymentMethod: { type: "string", default: "cash" } } } } },
        },
        responses: { 200: { description: "Fine paid" }, 400: { description: "Already paid" } },
      },
    },
    "/locations": {
      get: {
        summary: "Get All Locations",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "List of locations" } },
      },
      post: {
        summary: "Create Location",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["room", "rack", "shelf"], properties: { room: { type: "string" }, rack: { type: "string" }, shelf: { type: "string" } } } } },
        },
        responses: { 201: { description: "Location created" } },
      },
    },
    "/locations/{id}": {
      get: {
        summary: "Get Location By ID",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Location details" }, 404: { description: "Not found" } },
      },
      put: {
        summary: "Update Location",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["room", "rack", "shelf"], properties: { room: { type: "string" }, rack: { type: "string" }, shelf: { type: "string" } } } } },
        },
        responses: { 200: { description: "Location updated" } },
      },
      delete: {
        summary: "Delete Location (Soft Delete)",
        tags: ["Locations"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Location deleted" } },
      },
    },
    "/import/bibliographies/upload": {
      post: {
        summary: "Upload bibliography CSV",
        description: "Upload a semicolon-delimited CSV file for staged bibliography import. Supports UTF-8 with optional BOM. Max 50MB.",
        operationId: "uploadBibliography",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          "201": { description: "File uploaded successfully" },
          "400": { description: "No file uploaded" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" }
        }
      }
    },
    "/import/items/upload": {
      post: {
        summary: "Upload items CSV",
        description: "Uploads an items CSV file. System analyzes columns, detects delimiters, validates structure, and stores as a staged batch.",
        operationId: "uploadItems",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary", description: "CSV file to import" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "File uploaded and staged", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportBatch" } } } },
          "400": { description: "Invalid file or structure" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden - super_admin role required" }
        }
      }
    },
    "/import/template/{module}": {
      get: {
        summary: "Download Import Template CSV",
        description: "Mengunduh contoh file template CSV untuk import bibliographies, items, guests, users, atau loans.",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: "path", name: "module", required: true, schema: { type: "string", enum: ["bibliographies", "items", "guests", "users", "loans"] } }
        ],
        responses: {
          200: { description: "CSV template file", content: { "text/csv": { schema: { type: "string" } } } }
        }
      }
    },
    "/import/guests": {
      post: {
        summary: "Import guests directly via CSV",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } }
        },
        responses: { 200: { description: "Guests imported" } }
      }
    },
    "/import/users": {
      post: {
        summary: "Import users directly via CSV",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } }
        },
        responses: { 200: { description: "Users imported" } }
      }
    },
    "/import/loans": {
      post: {
        summary: "Import loans directly via CSV",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } }
        },
        responses: { 200: { description: "Loans imported" } }
      }
    },
    "/import/batches": {
      get: {
        summary: "List import batches",
        description: "Returns all import batches ordered by creation date.",
        operationId: "listBatches",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Batches retrieved" }
        }
      }
    },
    "/import/batches/{batchId}": {
      get: {
        summary: "Get batch details",
        operationId: "getBatch",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Batch retrieved" },
          "404": { description: "Not found" }
        }
      }
    },
    "/import/batches/{batchId}/parse": {
      post: {
        summary: "Parse uploaded CSV into staging",
        description: "Reads CSV, parses rows, inserts into staging tables, validates.",
        operationId: "parseBatch",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Batch parsed" },
          "400": { description: "Invalid state" }
        }
      }
    },
    "/import/batches/{batchId}/preview": {
      get: {
        summary: "Preview staging rows",
        operationId: "previewBatch",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
        ],
        responses: {
          "200": { description: "Preview retrieved" }
        }
      }
    },
    "/import/batches/{batchId}/approve": {
      post: {
        summary: "Approve and commit staging rows",
        description: "Commits valid rows in chunks. Idempotent. Returns progress with hasMore flag.",
        operationId: "approveBatch",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Chunk committed" },
          "400": { description: "Invalid state" }
        }
      }
    },
    "/import/batches/{batchId}/cancel": {
      post: {
        summary: "Cancel import batch",
        operationId: "cancelBatch",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Batch cancelled" },
          "400": { description: "Cannot cancel committed batch" }
        }
      }
    },
    "/import/batches/{batchId}/errors": {
      get: {
        summary: "Get import errors",
        operationId: "getErrors",
        tags: ["Import"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Errors retrieved" }
        }
      }
    },
    "/export/bibliographies": {
      get: {
        summary: "Export bibliographies as Senayan CSV",
        description: "Exports all bibliographies in exact Senayan format. Semicolon-delimited, UTF-8 with BOM.",
        operationId: "exportBibliographies",
        tags: ["Export"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/export/items": {
      get: {
        summary: "Export items as Senayan CSV",
        description: "Exports all items in exact Senayan format. Semicolon-delimited, UTF-8 with BOM.",
        operationId: "exportItems",
        tags: ["Export"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/export/guests": {
      get: {
        summary: "Export guests as CSV",
        description: "Exports all guest visit records in CSV format.",
        tags: ["Export"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/export/loans": {
      get: {
        summary: "Export loans as CSV",
        description: "Exports all loan history and active records in CSV format.",
        tags: ["Export"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/export/users": {
      get: {
        summary: "Export users as CSV",
        description: "Exports all user accounts in CSV format.",
        tags: ["Export"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } }
          }
        }
      }
    },
    "/collections": {
      get: {
        summary: "Get All Collections",
        description: "Alias / sub-koleksi bibliografi.",
        tags: ["Bibliographies"],
        parameters: [
          { in: "query", name: "page", schema: { type: "integer", default: 1 } },
          { in: "query", name: "limit", schema: { type: "integer", default: 10 } },
          { in: "query", name: "search", schema: { type: "string" } },
        ],
        responses: { 200: { description: "List of collections" } },
      },
      post: {
        summary: "Create Collection",
        tags: ["Bibliographies"],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 201: { description: "Collection created" } },
      },
    },
    "/collections/{id}": {
      get: {
        summary: "Get Collection by ID",
        tags: ["Bibliographies"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Collection details" } },
      },
      patch: {
        summary: "Update Collection",
        tags: ["Bibliographies"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Collection updated" } },
      },
      delete: {
        summary: "Delete Collection",
        tags: ["Bibliographies"],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Collection deleted" } },
      },
    },
    "/collections/{id}/items": {
      get: {
        summary: "Get Items in Collection",
        tags: ["Bibliographies"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "List of items in collection" } },
      },
    },
    "/faculties": {
      get: {
        summary: "Get all faculties",
        tags: ["Faculties"],
        security: [],
        responses: { 200: { description: "List of faculties" } },
      },
      post: {
        summary: "Create faculty",
        tags: ["Faculties"],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, code: { type: "string" } }, required: ["name"] } } } },
        responses: { 201: { description: "Faculty created" }, 400: { description: "Validation error" }, 409: { description: "Duplicate name" } },
      },
    },
    "/faculties/{id}": {
      get: {
        summary: "Get faculty by ID",
        tags: ["Faculties"],
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Faculty details" }, 404: { description: "Not found" } },
      },
      patch: {
        summary: "Update faculty",
        tags: ["Faculties"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, code: { type: "string" } } } } } },
        responses: { 200: { description: "Faculty updated" }, 404: { description: "Not found" }, 409: { description: "Duplicate name" } },
      },
      delete: {
        summary: "Delete faculty",
        tags: ["Faculties"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Faculty deleted" }, 404: { description: "Not found" }, 409: { description: "In use" } },
      },
    },
    "/study-programs": {
      get: {
        summary: "Get all study programs",
        tags: ["Study Programs"],
        security: [],
        parameters: [{ in: "query", name: "facultyId", schema: { type: "integer" }, description: "Filter by faculty" }],
        responses: { 200: { description: "List of study programs" } },
      },
      post: {
        summary: "Create study program",
        tags: ["Study Programs"],
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, code: { type: "string" }, facultyId: { type: "integer" } }, required: ["name", "facultyId"] } } } },
        responses: { 201: { description: "Study program created" }, 400: { description: "Validation error" }, 409: { description: "Duplicate name in faculty" } },
      },
    },
    "/study-programs/{id}": {
      get: {
        summary: "Get study program by ID",
        tags: ["Study Programs"],
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Study program details" }, 404: { description: "Not found" } },
      },
      patch: {
        summary: "Update study program",
        tags: ["Study Programs"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, code: { type: "string" }, facultyId: { type: "integer" } } } } } },
        responses: { 200: { description: "Study program updated" }, 404: { description: "Not found" }, 409: { description: "Duplicate name" } },
      },
      delete: {
        summary: "Delete study program",
        tags: ["Study Programs"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Study program deleted" }, 404: { description: "Not found" }, 409: { description: "In use" } },
      },
    },
    "/bibliographies/check-duplicate": {
      get: {
        summary: "Check for duplicate bibliographies",
        description: "Check for existing bibliographies by ISBN exact match or title+author fuzzy match. Returns suggestions for redirecting to existing records.",
        tags: ["Bibliographies"],
        security: [],
        parameters: [
          { in: "query", name: "isbn", schema: { type: "string" }, description: "ISBN/ISSN to match exactly" },
          { in: "query", name: "title", schema: { type: "string" }, description: "Title for fuzzy matching" },
          { in: "query", name: "author", schema: { type: "string" }, description: "Author name for fuzzy matching" },
        ],
        responses: { 200: { description: "Duplicate check result with hasExactMatch and duplicates array" }, 400: { description: "At least one param required" } },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/modules/*/route/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(options);
