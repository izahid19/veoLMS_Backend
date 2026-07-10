import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { CourseRepository } from '../repositories/course.repository';
import { UserRepository } from '../repositories/user.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { CouponService } from '../services/coupon.service';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator';

const router = Router();

// ─── Dependency Injection ──────────────────────────────────────────────────────
const paymentRepository = new PaymentRepository();
const enrollmentRepository = new EnrollmentRepository();
const courseRepository = new CourseRepository();
const userRepository = new UserRepository();
const couponRepository = new CouponRepository();
const couponService = new CouponService(couponRepository, courseRepository);

const paymentService = new PaymentService(
  paymentRepository,
  enrollmentRepository,
  courseRepository,
  userRepository,
  couponService
);
const paymentController = new PaymentController(paymentService);

// ─── Tags ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Razorpay payment and enrollment flow
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/payments/create-order:
 *   post:
 *     summary: Create a Razorpay order for course enrollment
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: MongoDB ObjectId of the course to enroll in
 *     responses:
 *       201:
 *         description: Razorpay order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     courseName:
 *                       type: string
 *                     courseId:
 *                       type: string
 *                     keyId:
 *                       type: string
 *       400:
 *         description: Already enrolled in this course
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.post(
  '/payments/create-order',
  requireAuth,
  validateRequest(createOrderSchema),
  paymentController.createOrder,
);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment signature and complete enrollment
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpayOrderId
 *               - razorpayPaymentId
 *               - razorpaySignature
 *               - courseId
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *               courseId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and enrollment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 courseSlug:
 *                   type: string
 *       400:
 *         description: Invalid payment signature or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment record not found
 */
router.post(
  '/payments/verify',
  requireAuth,
  validateRequest(verifyPaymentSchema),
  paymentController.verifyPayment,
);

/**
 * @swagger
 * /api/payments/failed:
 *   post:
 *     summary: Mark a payment as failed
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpayOrderId
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated to failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment record not found
 */
router.post('/payments/failed', requireAuth, paymentController.handleFailedPayment);

/**
 * @swagger
 * /api/payments/my:
 *   get:
 *     summary: Get all payments for the authenticated student
 *     tags: [Payments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of student payments (with populated course info)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/payments/my', requireAuth, paymentController.getMyPayments);

export default router;
