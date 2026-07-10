import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon.service';

export class CouponController {
  constructor(private couponService: CouponService) {}

  validateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.userId as string;
      const { code, courseId } = req.body;
      const result = await this.couponService.validateCoupon(code, courseId, studentId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.userId as string;
      const result = await this.couponService.createCoupon(req.body, adminId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getAllCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.couponService.getAllCoupons();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.couponService.updateCoupon(req.params.id as string, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.couponService.deleteCoupon(req.params.id as string);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  toggleCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.couponService.toggleCoupon(req.params.id as string);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
