import { Router } from 'express';
import { EnrollmentController } from '../controllers/enrollment.controller';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { ProgressRepository } from '../repositories/progress.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { CourseRepository } from '../repositories/course.repository';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { updateProgressSchema } from '../validators/progress.validator';

const router = Router();

// ─── Dependency Injection ──────────────────────────────────────────────────────
const enrollmentRepository = new EnrollmentRepository();
const progressRepository = new ProgressRepository();
const lessonRepository = new LessonRepository();
const sectionRepository = new SectionRepository();
const courseRepository = new CourseRepository();

const enrollmentService = new EnrollmentService(
  enrollmentRepository,
  progressRepository,
  lessonRepository,
  sectionRepository,
  courseRepository,
);
const enrollmentController = new EnrollmentController(enrollmentService);

// ─── Tags ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   - name: Enrollments
 *     description: Student enrollment endpoints
 *   - name: Progress
 *     description: Student lesson progress endpoints
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENROLLMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/enrollments/my:
 *   get:
 *     summary: Get all courses the authenticated student is enrolled in (with progress)
 *     tags: [Enrollments]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of enrollments with progress percentage per course
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
 *                     properties:
 *                       enrollment:
 *                         type: object
 *                       progress:
 *                         type: object
 *                         properties:
 *                           totalLessons:
 *                             type: number
 *                           completedLessons:
 *                             type: number
 *                           percentage:
 *                             type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/enrollments/my', requireAuth, enrollmentController.getMyEnrollments);

/**
 * @swagger
 * /api/enrollments/check/{courseId}:
 *   get:
 *     summary: Check if the authenticated student is enrolled in a specific course
 *     tags: [Enrollments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Enrollment status
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
 *                     isEnrolled:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/enrollments/check/:courseId', requireAuth, enrollmentController.checkEnrollment);

/**
 * @swagger
 * /api/enrollments/course/{slug}:
 *   get:
 *     summary: Get enrolled course detail with curriculum and per-lesson progress
 *     tags: [Enrollments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Course slug
 *     responses:
 *       200:
 *         description: Course with sections, lessons, and student progress per lesson
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not enrolled in this course
 *       404:
 *         description: Course not found
 */
router.get('/enrollments/course/:slug', requireAuth, enrollmentController.getEnrolledCourseDetail);

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/progress/{courseId}:
 *   get:
 *     summary: Get overall progress for the authenticated student in a course
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course progress summary
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
 *                     totalLessons:
 *                       type: number
 *                     completedLessons:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     lastWatchedLesson:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         lessonId:
 *                           type: string
 *                         watchedSeconds:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/watch-record/:courseId', requireAuth, enrollmentController.getCourseProgress);

/**
 * @swagger
 * /api/progress/{courseId}/last-watched:
 *   get:
 *     summary: Get the last watched lesson for the authenticated student in a course
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Last watched lesson info or null if none
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     lessonId:
 *                       type: string
 *                     watchedSeconds:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/watch-record/:courseId/last-watched', requireAuth, enrollmentController.getLastWatchedLesson);

/**
 * @swagger
 * /api/progress/{lessonId}:
 *   patch:
 *     summary: Update watch progress for a specific lesson
 *     tags: [Progress]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - watchedSeconds
 *             properties:
 *               watchedSeconds:
 *                 type: number
 *                 minimum: 0
 *                 description: Number of seconds the student has watched
 *               completed:
 *                 type: boolean
 *                 description: Whether the lesson is marked complete
 *     responses:
 *       200:
 *         description: Progress record updated (upserted)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not enrolled in this course
 *       404:
 *         description: Lesson not found
 */
router.patch(
  '/watch-record/:lessonId',
  requireAuth,
  validateRequest(updateProgressSchema),
  enrollmentController.updateProgress,
);

export default router;
