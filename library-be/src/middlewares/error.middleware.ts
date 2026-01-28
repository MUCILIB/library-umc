import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

/**
 * Global Error Handling Middleware
 * Handles unexpected errors that escape try-catch blocks
 */
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Set default values
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any = undefined;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errors = err.flatten().fieldErrors;
  }
  // Handle Multer Errors (File Upload)
  else if (err instanceof Error && err.name === "MulterError") {
    statusCode = 400;
    message = err.message;
  }
  // Handle generic Error instances
  else if (err instanceof Error) {
    message = err.message;
  }

  // Log errors for debugging
  console.error("🔥 [ERROR MIDDLEWARE]:", {
    message,
    stack: err instanceof Error ? err.stack : "No stack trace",
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && {
      stack: err instanceof Error ? err.stack : undefined,
    }),
  });
};
