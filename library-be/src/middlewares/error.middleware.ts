import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../exceptions/AppError";

/**
 * Global Error Handling Middleware
 */
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: Record<string, string[]> | undefined = undefined;

  // Handle Custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle Zod Validation Errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errors = err.flatten().fieldErrors;
  }
  // Handle Multer Errors
  else if (err instanceof Error && err.name === "MulterError") {
    statusCode = 400;
    message = err.message;
  }
  // Handle generic Error instances
  else if (err instanceof Error) {
    const raw = err.message || "";
    const isSensitiveInternalError =
      raw.includes("Failed query") ||
      raw.includes("select \"") ||
      raw.includes("insert into") ||
      raw.includes("update \"") ||
      raw.includes("delete from") ||
      raw.includes("syntax error at or near") ||
      raw.includes("relation \"") ||
      raw.includes("column \"") ||
      raw.includes("foreign key constraint") ||
      raw.includes("Connection terminated") ||
      raw.includes("password authentication failed");

    if (isSensitiveInternalError || (statusCode >= 500 && process.env.NODE_ENV === "production")) {
      message = "Terjadi kesalahan internal pada server";
    } else {
      message = err.message;
    }
  }

  // Log errors for debugging (always keep complete technical details in server logs)
  console.error(`🔥 [${req.method}] ${req.originalUrl} Error:`, {
    technicalMessage: err instanceof Error ? err.message : String(err),
    clientMessage: message,
    statusCode,
    stack: err instanceof Error ? err.stack : undefined,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { data: errors }), // Maintain data format consistent with existing responses
    ...(process.env.NODE_ENV === "development" && {
      stack: err instanceof Error ? err.stack : undefined,
    }),
  });
};
