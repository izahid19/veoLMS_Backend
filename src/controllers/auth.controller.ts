import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { generateTokens } from '../utils/jwt';
import User from '../models/user.model';
import { AppError } from '../utils/error';

let loginCounter = 0;

export class AuthController {
  constructor(private authService: AuthService) {}

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { firstName, lastName, username, emailId, password } = req.body;

      if (!firstName || !lastName || !username || !emailId || !password) {
        res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'All fields are required: firstName, lastName, username, emailId, password',
        });
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
      if (!passwordRegex.test(password)) {
        res.status(400).json({
          success: false,
          error: 'WEAK_PASSWORD',
          message:
            'Password must contain a minimum of 6 characters, 1 uppercase, 1 lowercase, 1 number and 1 special character',
        });
        return;
      }

      const user = await this.authService.signupService({ firstName, lastName, username, emailId, password });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  checkUsername = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Username query parameter is required',
        });
        return;
      }

      const isAvailable = await this.authService.checkUsernameService(username);

      res.status(200).json({
        success: true,
        available: isAvailable,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Both identifier (username or email) and password are required',
        });
        return;
      }

      const user = await this.authService.loginService(identifier, password);
      const { accessToken, refreshToken } = generateTokens(user.id.toString(), user.role);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      loginCounter++;
      console.log(`[LOGIN] User ${user.username} logged in at ${new Date().toISOString()}. Total logins: ${loginCounter}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: user,
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { emailId } = req.body;

      if (!emailId) {
        res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'emailId is required',
        });
        return;
      }

      await this.authService.forgotPasswordService(emailId);

      res.status(200).json({
        success: true,
        message: 'If the email is registered, an OTP has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          emailId: user.emailId,
          role: user.role,
          avatar: user.avatar,
          isUserVerify: user.isUserVerify,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { firstName, lastName, username } = req.body;

      const updatedUser = await this.authService.updateMeService(userId, { firstName, lastName, username });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          username: updatedUser.username,
          emailId: updatedUser.emailId,
          isUserVerify: updatedUser.isUserVerify,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Read refreshToken from the httpOnly cookie in the request
      const token = req.cookies?.refreshToken;
      
      // The service throws all 401s if token is missing/invalid or user not found
      const { accessToken } = await this.authService.refreshTokenService(token);

      res.status(200).json({
        success: true,
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { emailId, otp, newPassword } = req.body;

      if (!emailId || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'emailId, otp, and newPassword are required',
        });
        return;
      }

      await this.authService.resetPasswordService(emailId, otp, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.uploadAvatar(req);
      
      res.status(200).json({
        success: true,
        message: 'Avatar updated',
        user: {
          id: user?._id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          username: user?.username,
          emailId: user?.emailId,
          avatar: user?.avatar,
          isUserVerify: user?.isUserVerify,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      await this.authService.changePasswordService(userId, currentPassword, newPassword);

      res.clearCookie('refreshToken');

      res.status(200).json({
        success: true,
        message: 'Password changed. Please login again.',
      });
    } catch (error) {
      next(error);
    }
  };
}
