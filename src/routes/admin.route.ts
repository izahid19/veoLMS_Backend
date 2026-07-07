import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ─── Dependency Injection ──────────────────────────────────────────────────────
const adminService = new AdminService();
const adminController = new AdminController(adminService);

// ─── Guard shorthand ───────────────────────────────────────────────────────────
const adminOnly = [requireAuth, requireRole('admin')];

// ─── Tags ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   - name: Admin Dashboard
 *     description: Admin-only dashboard and management endpoints
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get platform-wide stats for the admin dashboard
 *     tags: [Admin Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Platform stats
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
 *                     totalCourses:
 *                       type: number
 *                     totalStudents:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                       description: Revenue in ₹ (paise / 100)
 *                     totalEnrollments:
 *                       type: number
 *                     recentEnrollments:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/stats', ...adminOnly, adminController.getStats);

/**
 * @swagger
 * /api/admin/students:
 *   get:
 *     summary: Get all students with enrollment counts (paginated)
 *     tags: [Admin Dashboard]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (max 100)
 *     responses:
 *       200:
 *         description: Paginated list of students
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
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/students', ...adminOnly, adminController.getAllStudents);

/**
 * @swagger
 * /api/admin/students/{id}:
 *   get:
 *     summary: Get a single student with their enrollments and total spend
 *     tags: [Admin Dashboard]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: Student detail with enrollments and totalSpent (₹)
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
 *                     user:
 *                       type: object
 *                     enrollments:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalSpent:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/students/:id', ...adminOnly, adminController.getStudentDetail);

/**
 * @swagger
 * /api/admin/enrollments:
 *   get:
 *     summary: Get all enrollments with populated student, course, and payment (paginated)
 *     tags: [Admin Dashboard]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of enrollments
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
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/enrollments', ...adminOnly, adminController.getAllEnrollments);

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get all payments with populated student and course (paginated)
 *     tags: [Admin Dashboard]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of payments
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
 *                 total:
 *                   type: number
 *                 page:
 *                   type: number
 *                 totalPages:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/payments', ...adminOnly, adminController.getAllPayments);

export default router;
