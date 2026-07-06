import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * Validates the request body against a provided Zod schema.
 * 
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 * 
 * @example
 * // Usage in routes:
 * // router.post('/signup', validateRequest(signupSchema), authController.signup)
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate the request body
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors to match the required response structure
        const formattedErrors = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
        return;
      }

      // Pass unexpected errors to the global error handler
      next(error);
    }
  };
};
