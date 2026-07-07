import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';

// Express 5 types req.params values as string | string[] — this helper narrows safely
const param = (req: Request, key: string): string => req.params[key] as string;

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.userId as string;
      const { courseId } = req.body as { courseId: string };

      const result = await this.paymentService.createOrder(studentId, courseId);

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.userId as string;
      const result = await this.paymentService.verifyPayment(studentId, req.body);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getMyPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.userId as string;
      const payments = await this.paymentService.getMyPayments(studentId);

      res.status(200).json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  };

  handleFailedPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { razorpayOrderId } = req.body as { razorpayOrderId: string };
      const payment = await this.paymentService.handleFailedPayment(razorpayOrderId);

      res.status(200).json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  };
}
