import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { ZodSchema, ZodError, ZodIssue } from "zod";

type ApiResponseData =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

type User = typeof auth.$Infer.Session.user;

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(req: Request) {
  try {
    // Convert Express headers to HeadersInit compatible format
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        // If value is an array, take the first element; otherwise use the string value
        headers[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session?.user) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

/**
 * Create error response
 */
export function createErrorResponse(
  res: Response,
  message: string,
  status: number = 400,
) {
  return res.status(status).json({ error: message });
}

/**
 * Create success response
 */
export function createSuccessResponse(
  res: Response,
  data: ApiResponseData,
  status: number = 200,
) {
  return res.status(status).json(data);
}

/**
 * Validate request body with Zod schema
 */
export function validateRequestBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): { data: T; error: null } | { data: null; error: string } {
  try {
    // In Express, ensure you have bodyParser or express.json() middleware used before this
    const body = req.body;
    const validatedData = schema.parse(body);
    return { data: validatedData, error: null };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        .map((err: ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return { data: null, error: errorMessage };
    }
    return { data: null, error: "Invalid request body" };
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQueryParams<T>(
  req: Request,
  schema: ZodSchema<T>,
): { data: T; error: null } | { data: null; error: string } {
  try {
    const params = req.query;
    const validatedData = schema.parse(params);
    return { data: validatedData, error: null };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        .map((err: ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return { data: null, error: errorMessage };
    }
    return { data: null, error: "Invalid query parameters" };
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate unique slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Higher-order function to wrap a controller with authentication
 * Usage: router.get('/protected', withAuth(async (req, res, user) => { ... }))
 */
export function withAuth(
  handler: (req: Request, res: Response, user: User) => Promise<any>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return createErrorResponse(res, "Unauthorized", 401);
    }

    try {
      await handler(req, res, user);
    } catch (error) {
      console.error("API Error:", error);
      createErrorResponse(res, "Internal server error", 500);
    }
  };
}

/**
 * Higher-order function to wrap a controller without authentication (just error handling)
 */
export function withoutAuth(
  handler: (req: Request, res: Response) => Promise<any>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error("API Error:", error);
      createErrorResponse(res, "Internal server error", 500);
    }
  };
}

/**
 * Calculate pagination offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
