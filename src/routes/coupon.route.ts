import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { CouponService } from '../services/coupon.service';
import { CouponRepository } from '../repositories/coupon.repository';
import { CourseRepository } from '../repositories/course.repository';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

const couponRepository = new CouponRepository();
const courseRepository = new CourseRepository();
const couponService = new CouponService(couponRepository, courseRepository);
const couponController = new CouponController(couponService);

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               courseId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon validated successfully
 *       400:
 *         description: Invalid coupon
 */
router.post('/coupons/validate', requireAuth, couponController.validateCoupon);

/**
 * @swagger
 * /api/admin/coupons:
 *   post:
 *     summary: Create a new coupon (Admin only)
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *               discountValue:
 *                 type: number
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.post('/admin/coupons', requireAuth, requireRole('admin'), couponController.createCoupon);

/**
 * @swagger
 * /api/admin/coupons:
 *   get:
 *     summary: Get all coupons (Admin only)
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 */
router.get('/admin/coupons', requireAuth, requireRole('admin'), couponController.getAllCoupons);

/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   put:
 *     summary: Update a coupon (Admin only)
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 */
router.put('/admin/coupons/:id', requireAuth, requireRole('admin'), couponController.updateCoupon);

/**
 * @swagger
 * /api/admin/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon (Admin only)
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 */
router.delete('/admin/coupons/:id', requireAuth, requireRole('admin'), couponController.deleteCoupon);

/**
 * @swagger
 * /api/admin/coupons/{id}/toggle:
 *   patch:
 *     summary: Toggle coupon active status (Admin only)
 *     tags: [Admin Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon status toggled successfully
 */
router.patch('/admin/coupons/:id/toggle', requireAuth, requireRole('admin'), couponController.toggleCoupon);

export default router;
