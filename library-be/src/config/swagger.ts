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
      url: "https://api-library-be.leapcell.app/api",
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
          image: { type: "string" },
        },
      },
      Member: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "string" },
          memberType: {
            type: "string",
            enum: ["student", "lecturer", "staff"],
          },
          nimNidn: { type: "string" },
          faculty: { type: "string" },
          phone: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
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
    {
      name: "Collections",
      description: "Book & Collection management",
    },
  ],
  paths: {
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
    "/collections": {
      get: {
        summary: "Get All Collections",
        description: "Retrieve a list of all collections (books, etc).",
        tags: ["Collections"],
        security: [],
        responses: {
          200: {
            description: "List of collections",
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
        summary: "Create New Collection",
        description: "Add a new collection (book) with cover image upload.",
        tags: ["Collections"],
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
            description: "Collection created successfully",
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
  },
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts"], // Tetap include jika mau pakai comment di file route nanti
};

export const swaggerSpec = swaggerJSDoc(options);
