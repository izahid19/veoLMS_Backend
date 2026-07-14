import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../utils/error';

// Public routes that don't require CSRF protection.
// These are credential-based endpoints — an attacker can't forge them
// without knowing the user's password/OTP, so CSRF doesn't apply.
const CSRF_EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/refresh-token',
  '/api/auth/forgot-password',
  '/api/auth/verify-otp',
  '/api/auth/resend-otp',
  '/api/auth/resend-forgot-password-otp',
  '/api/auth/reset-password',
];

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate a CSRF token if one doesn't exist
  let csrfToken = req.cookies.csrfToken;
  
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false, // Must be readable by frontend JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // Always expose it so the frontend can read it if third-party cookies are blocked
  res.setHeader('x-csrf-token', csrfToken);

  // Disable CSRF enforcement in test environment to avoid breaking API tests
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Safe HTTP methods skip the CSRF check
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt public credential-based routes
  if (CSRF_EXEMPT_PATHS.includes(req.path) || CSRF_EXEMPT_PATHS.some(p => req.originalUrl.startsWith(p))) {
    return next();
  }

  // Verify the token for state-changing methods (POST, PUT, DELETE, PATCH)
  const headerToken = req.headers['x-csrf-token'];

  if (!headerToken || csrfToken !== headerToken) {
    return next(new AppError('Invalid CSRF token', 403, 'CSRF_ERROR'));
  }

  next();
};
