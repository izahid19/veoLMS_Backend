import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check cookies first
    let token = req.cookies?.accessToken;

    // Fallback to Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as { userId: string; role: string };
        req.userId = decoded.userId;
        req.userRole = decoded.role;
      } catch (jwtError: any) {
        // If access token is expired, try the refresh token to still identify the user
        if (jwtError.name === 'TokenExpiredError') {
          const refreshToken = req.cookies?.refreshToken;
          if (refreshToken) {
            try {
              const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { userId: string; role: string };
              req.userId = decoded.userId;
              req.userRole = decoded.role;
            } catch {
              req.userId = undefined;
              req.userRole = undefined;
            }
          } else {
            req.userId = undefined;
            req.userRole = undefined;
          }
        } else {
          req.userId = undefined;
          req.userRole = undefined;
        }
      }
    } else {
      req.userId = undefined;
      req.userRole = undefined;
    }
    next();
  } catch (error: any) {
    // On any error, just set to guest and continue
    req.userId = undefined;
    req.userRole = undefined;
    next();
  }
};
