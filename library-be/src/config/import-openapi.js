/**
 * OpenAPI 3.0.3 Import Endpoint Documentation
 * 
 * This file documents all import-related endpoints for the MUCILIB library system.
 * Routes are registered in: src/modules/import/route/import.route.ts
 */

const importOpenAPI = {
  "/api/import/bibliographies/upload": {
    post: {
      summary: "Upload bibliography CSV for staged import",
      description: "Upload a semicolon-delimited CSV file containing bibliography data. The file is stored in staging and must be parsed and approved separately. Supports UTF-8 with optional BOM. Maximum file size: 50MB.",
      operationId: "uploadBibliography",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: {
                  type: "string",
                  format: "binary",
                  description: "Semicolon-delimited CSV file. Required headers: title, gmd_name, edition, isbn_issn, publisher_name, publish_year, collation, series_title, call_number, language_name, place_name, classification, notes, image, sor, authors, topics, item_code"
                }
              }
            }
          }
        }
      },
      responses: {
        "201": {
          description: "File uploaded successfully",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } }
        },
        "400": { description: "No file uploaded or invalid file type" },
        "401": { description: "Authentication required" },
        "403": { description: "Insufficient permissions (requires super_admin)" }
      }
    }
  },
  "/api/import/items/upload": {
    post: {
      summary: "Upload item CSV for staged import",
      description: "Upload a semicolon-delimited CSV file containing item data. Links to an existing bibliography batch via reference_batch_id.",
      operationId: "uploadItem",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: {
                  type: "string",
                  format: "binary",
                  description: "Semicolon-delimited CSV file. Required headers: item_code, call_number, coll_type_name, inventory_code, received_date, supplier_name, order_no, location_name, order_date, item_status_name, site, source, invoice, price, price_currency, invoice_date, input_date, last_update, title"
                }
              }
            }
          }
        }
      },
      responses: {
        "201": { description: "File uploaded", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } },
        "400": { description: "No file uploaded" },
        "401": { description: "Authentication required" },
        "403": { description: "Insufficient permissions" }
      }
    }
  },
  "/api/import/batches/{batchId}/parse": {
    post: {
      summary: "Parse uploaded CSV into staging rows",
      description: "Reads the uploaded CSV, parses each row, inserts into staging tables, validates, and resolves relations. Writes only to staging tables — no production data is modified.",
      operationId: "parseBatch",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Batch parsed and validated", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportParseResponse" } } } },
        "400": { description: "Batch in invalid state" },
        "404": { description: "Batch not found" }
      }
    }
  },
  "/api/import/batches/{batchId}/validate": {
    post: {
      summary: "Re-validate staging rows",
      description: "Re-runs validation on all staging rows for the batch.",
      operationId: "validateBatch",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Validation complete", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportValidationResponse" } } } },
        "404": { description: "Batch not found" }
      }
    }
  },
  "/api/import/batches": {
    get: {
      summary: "List all import batches",
      description: "Returns all import batches ordered by creation date (newest first).",
      operationId: "listBatches",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      responses: {
        "200": { description: "Batches retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccessResponse" } } } }
      }
    }
  },
  "/api/import/batches/{batchId}": {
    get: {
      summary: "Get batch details",
      description: "Returns the current state and counters of an import batch.",
      operationId: "getBatch",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Batch retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportBatch" } } } },
        "404": { description: "Batch not found" }
      }
    }
  },
  "/api/import/batches/{batchId}/preview": {
    get: {
      summary: "Preview staging rows",
      description: "Returns staging rows with their validation status, raw data, and resolved data. Includes error summary.",
      operationId: "previewBatch",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
      ],
      responses: {
        "200": { description: "Preview retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportPreviewResponse" } } } },
        "404": { description: "Batch not found" }
      }
    }
  },
  "/api/import/batches/{batchId}/errors": {
    get: {
      summary: "Get import errors",
      description: "Returns all error rows for the batch with row numbers and error details.",
      operationId: "getErrors",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Errors retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportErrorListResponse" } } } }
      }
    }
  },
  "/api/import/batches/{batchId}/errors.csv": {
    get: {
      summary: "Download error report as CSV",
      description: "Downloads all error rows as a UTF-8 CSV file with BOM.",
      operationId: "downloadErrorsCsv",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "CSV file", content: { "text/csv": { schema: { type: "string" } } } }
      }
    }
  },
  "/api/import/batches/{batchId}/completeness": {
    get: {
      summary: "Get pair completeness report",
      description: "Compares committed bibliography item codes against item rows: codes without detail (missing) and item rows without a bibliography code (extra). Read-only.",
      operationId: "getPairCompleteness",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Completeness retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportPairCompletenessResponse" } } } },
        "400": { description: "Batch is not a paired item batch" },
        "404": { description: "Batch not found" }
      }
    }
  },
  "/api/import/batches/{batchId}/approve": {
    post: {
      summary: "Approve and commit staging rows",
      description: "Commits valid staging rows to production tables in chunks. Idempotent — already-committed rows are skipped. Returns progress with hasMore flag for resumability.",
      operationId: "approveBatch",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ImportApprovalRequest" }
          }
        }
      },
      responses: {
        "200": { description: "Chunk committed", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportApprovalResponse" } } } },
        "400": { description: "Batch not in approvable state" },
        "404": { description: "Batch not found" }
      }
    }
  },
  "/api/import/batches/{batchId}/cancel": {
    post: {
      summary: "Cancel an import batch",
      description: "Cancels a batch that is not yet committed. Committed production records are preserved.",
      operationId: "cancelBatch",
      tags: ["Import"],
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "batchId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Batch cancelled", content: { "application/json": { schema: { $ref: "#/components/schemas/ImportCancellationResponse" } } } },
        "400": { description: "Cannot cancel committed batch" },
        "404": { description: "Batch not found" }
      }
    }
  }
};

const importSchemas = {
  ImportBatch: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      type: { type: "string", enum: ["bibliography", "item"] },
      filename: { type: "string" },
      status: { $ref: "#/components/schemas/ImportBatchStatus" },
      referenceBatchId: { type: "string", format: "uuid", nullable: true },
      totalRows: { type: "integer" },
      processedRows: { type: "integer" },
      validRows: { type: "integer" },
      invalidRows: { type: "integer" },
      committedRows: { type: "integer" },
      duplicateRows: { type: "integer" },
      failedRows: { type: "integer" },
      createdBy: { type: "string" },
      approvedBy: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      committedAt: { type: "string", format: "date-time", nullable: true },
      lastProcessedAt: { type: "string", format: "date-time", nullable: true }
    }
  },
  ImportBatchStatus: {
    type: "string",
    enum: ["uploading", "parsing", "validating", "preview", "approving", "committed", "failed", "cancelled"]
  },
  ImportRowStatus: {
    type: "string",
    enum: ["pending", "valid", "invalid", "committed", "skipped", "duplicate"]
  },
  ImportApprovalRequest: {
    type: "object",
    properties: {
      limit: { type: "integer", default: 25, description: "Number of rows to process in this chunk" }
    }
  },
  ImportApprovalResponse: {
    type: "object",
    properties: {
      processed: { type: "integer" },
      committed: { type: "integer" },
      failed: { type: "integer" },
      remaining: { type: "integer" },
      hasMore: { type: "boolean" }
    }
  },
  ImportPreviewResponse: {
    type: "object",
    properties: {
      batch: { $ref: "#/components/schemas/ImportBatch" },
      rows: { type: "array", items: { type: "object" } },
      errors: { type: "array", items: { type: "object" } },
      pagination: { $ref: "#/components/schemas/PaginationMeta" }
    }
  },
  ImportErrorListResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: { type: "array", items: { type: "object", properties: { rowNumber: { type: "integer" }, errors: { type: "array", items: { type: "string" } }, rawData: { type: "object" } } } }
    }
  },
  ImportCancellationResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" }
    }
  },
  ImportPairCompletenessResponse: {
    type: "object",
    properties: {
      batchId: { type: "string", format: "uuid" },
      referenceBatchId: { type: "string", format: "uuid" },
      totalExpected: { type: "integer" },
      covered: { type: "integer" },
      missing: { type: "array", items: { type: "object", properties: { itemCode: { type: "string" }, committedBibliographyId: { type: "string", format: "uuid" } } } },
      extra: { type: "array", items: { type: "object", properties: { rowNumber: { type: "integer" }, itemCode: { type: "string" } } } }
    }
  },
  PaginationMeta: {
    type: "object",
    properties: {
      total: { type: "integer" },
      limit: { type: "integer" }
    }
  },
  ApiSuccessResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      message: { type: "string" },
      data: { type: "object" }
    }
  },
  ApiErrorResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      message: { type: "string" },
      data: { type: "object", nullable: true }
    }
  }
};

module.exports = { importOpenAPI, importSchemas };
