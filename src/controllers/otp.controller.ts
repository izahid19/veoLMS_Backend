import { Request, Response, NextFunction } from 'express';
import { OtpService } from '../services/otp.service';

export class OtpController {
  constructor(private otpService: OtpService) {}

  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { emailId, otp } = req.body;

      if (!emailId || !otp) {
        res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: 'emailId and otp are required',
        });
        return;
      }

      await this.otpService.verifyOTP(emailId, otp);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      await this.otpService.resendOTP(emailId);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
      });
    } catch (error) {
      next(error);
    }
  };

  resendForgotPasswordOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      await this.otpService.resendForgotPasswordOTP(emailId);

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
      });
    } catch (error) {
      next(error);
    }
  };
}
