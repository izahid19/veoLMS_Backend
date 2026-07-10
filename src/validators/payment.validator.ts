import { z } from 'zod';

// ─── Payment Schemas ───────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  couponCode: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
  courseId: z.string().min(1, 'courseId is required'),
});

// ─── Inferred Types ────────────────────────────────────────────────────────────

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
