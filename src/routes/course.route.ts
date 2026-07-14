import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { CourseService } from '../services/course.service';
import { CourseRepository } from '../repositories/course.repository';
import { SectionRepository } from '../repositories/section.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optionalAuth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { generalLimiter } from '../middleware/rateLimiter.middleware';
import { uploadSingle, uploadThumbnail, uploadVideo } from '../middleware/upload.middleware';
import {
  createCourseSchema,
  updateCourseSchema,
  createSectionSchema,
  updateSectionSchema,
  createLessonSchema,
  updateLessonSchema,
} from '../validators/course.validator';

const router = Router();

// ─── Dependency Injection ──────────────────────────────────────────────────────
const courseRepository = new CourseRepository();
const sectionRepository = new SectionRepository();
const lessonRepository = new LessonRepository();
const enrollmentRepository = new EnrollmentRepository();
const courseService = new CourseService(courseRepository, sectionRepository, lessonRepository, enrollmentRepository);
const courseController = new CourseController(courseService);

// ─── Tags ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   - name: Courses
 *     description: Public course browsing endpoints
 *   - name: Admin Courses
 *     description: Admin course management endpoints
 *   - name: Admin Sections
 *     description: Admin section management endpoints
 *   - name: Admin Lessons
 *     description: Admin lesson management endpoints
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC COURSE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all published courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filter by published status (public endpoint forces true)
 *     responses:
 *       200:
 *         description: List of published courses
 */
router.get('/courses', generalLimiter, (req, res, next) => {
  req.query.isPublished = 'true';
  courseController.getAllCourses(req, res, next);
});

/**
 * @swagger
 * /api/courses/{slug}:
 *   get:
 *     summary: Get a course by slug with its full curriculum
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Course slug
 *     responses:
 *       200:
 *         description: Course with sections and lessons
 *       404:
 *         description: Course not found
 */
router.get('/courses/:slug', generalLimiter, courseController.getCourseBySlug);

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC COURSE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/lessons/{lessonId}/watch:
 *   get:
 *     summary: Get lesson for watching (handles access control and signed URLs)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson data and access status
 *       404:
 *         description: Lesson not found
 */
router.get('/lessons/:lessonId/watch', generalLimiter, optionalAuth, courseController.getLessonForWatch);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN COURSE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/courses:
 *   get:
 *     summary: Get all courses (published and unpublished)
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all courses
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/courses', requireAuth, requireRole('admin'), courseController.getAllCourses);

/**
 * @swagger
 * /api/admin/courses/{id}:
 *   get:
 *     summary: Get a course by ID (with full curriculum)
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course data
 *       404:
 *         description: Course not found
 */
router.get('/admin/courses/:id', requireAuth, requireRole('admin'), courseController.getCourseById);

/**
 * @swagger
 * /api/admin/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 150
 *               description:
 *                 type: string
 *                 minLength: 20
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Price in paise (e.g. 49900 = ₹499)
 *               isPublished:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/admin/courses',
  requireAuth,
  requireRole('admin'),
  validateRequest(createCourseSchema),
  courseController.createCourse,
);

/**
 * @swagger
 * /api/admin/courses/{id}:
 *   put:
 *     summary: Update a course
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       400:
 *         description: Validation error or no fields provided
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Course not found
 */
router.put(
  '/admin/courses/:id',
  requireAuth,
  requireRole('admin'),
  validateRequest(updateCourseSchema),
  courseController.updateCourse,
);

/**
 * @swagger
 * /api/admin/courses/{id}:
 *   delete:
 *     summary: Delete a course and all related data
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 */
router.delete('/admin/courses/:id', requireAuth, requireRole('admin'), courseController.deleteCourse);

/**
 * @swagger
 * /api/admin/courses/{id}/publish:
 *   patch:
 *     summary: Toggle course published status
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course publish status toggled
 *       404:
 *         description: Course not found
 */
router.patch('/admin/courses/:id/publish', requireAuth, requireRole('admin'), courseController.togglePublish);

/**
 * @swagger
 * /api/admin/courses/{id}/thumbnail:
 *   put:
 *     summary: Upload or replace course thumbnail
 *     tags: [Admin Courses]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, jpeg, png, webp — max 5MB)
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 *       400:
 *         description: No file uploaded or invalid type
 *       404:
 *         description: Course not found
 */
router.put(
  '/admin/courses/:id/thumbnail',
  requireAuth,
  requireRole('admin'),
  uploadThumbnail,
  courseController.uploadCourseThumbnail,
);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN SECTION ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/courses/{courseId}/sections:
 *   post:
 *     summary: Create a new section in a course
 *     tags: [Admin Sections]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               order:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Section created successfully
 *       404:
 *         description: Course not found
 */
router.post(
  '/admin/courses/:courseId/sections',
  requireAuth,
  requireRole('admin'),
  validateRequest(createSectionSchema),
  courseController.createSection,
);

/**
 * @swagger
 * /api/admin/sections/{id}:
 *   put:
 *     summary: Update a section
 *     tags: [Admin Sections]
 *     security:
 *       - cookieAuth: []
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
 *             properties:
 *               title:
 *                 type: string
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Section updated successfully
 *       404:
 *         description: Section not found
 */
router.put(
  '/admin/sections/:id',
  requireAuth,
  requireRole('admin'),
  validateRequest(updateSectionSchema),
  courseController.updateSection,
);

/**
 * @swagger
 * /api/admin/sections/{id}:
 *   delete:
 *     summary: Delete a section and all its lessons
 *     tags: [Admin Sections]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section deleted successfully
 *       404:
 *         description: Section not found
 */
router.delete('/admin/sections/:id', requireAuth, requireRole('admin'), courseController.deleteSection);

/**
 * @swagger
 * /api/admin/sections/reorder:
 *   patch:
 *     summary: Reorder sections in bulk
 *     tags: [Admin Sections]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: Sections reordered successfully
 *       400:
 *         description: Invalid updates array
 */
router.patch('/admin/sections/reorder', requireAuth, requireRole('admin'), courseController.reorderSections);

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LESSON ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/admin/sections/{sectionId}/lessons:
 *   post:
 *     summary: Create a new lesson in a section
 *     tags: [Admin Lessons]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
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
 *               - title
 *               - courseId
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *               courseId:
 *                 type: string
 *                 description: Parent course ID
 *               order:
 *                 type: number
 *               isFree:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Lesson created successfully
 *       400:
 *         description: Missing courseId or validation error
 *       404:
 *         description: Section or course not found
 */
router.post(
  '/admin/sections/:sectionId/lessons',
  requireAuth,
  requireRole('admin'),
  validateRequest(createLessonSchema),
  courseController.createLesson,
);

/**
 * @swagger
 * /api/admin/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Admin Lessons]
 *     security:
 *       - cookieAuth: []
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
 *             properties:
 *               title:
 *                 type: string
 *               order:
 *                 type: number
 *               isFree:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 *       404:
 *         description: Lesson not found
 */
router.put(
  '/admin/lessons/:id',
  requireAuth,
  requireRole('admin'),
  validateRequest(updateLessonSchema),
  courseController.updateLesson,
);

/**
 * @swagger
 * /api/admin/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson and its Cloudinary video
 *     tags: [Admin Lessons]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 *       404:
 *         description: Lesson not found
 */
router.delete('/admin/lessons/:id', requireAuth, requireRole('admin'), courseController.deleteLesson);

/**
 * @swagger
 * /api/admin/lessons/reorder:
 *   patch:
 *     summary: Reorder lessons in bulk
 *     tags: [Admin Lessons]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: Lessons reordered successfully
 *       400:
 *         description: Invalid updates array
 */
router.patch('/admin/lessons/reorder', requireAuth, requireRole('admin'), courseController.reorderLessons);

/**
 * @swagger
 * /api/admin/lessons/{id}/video:
 *   put:
 *     summary: Upload or replace a lesson video
 *     tags: [Admin Lessons]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video file (mp4, mov, webm)
 *     responses:
 *       200:
 *         description: Lesson video uploaded successfully
 *       400:
 *         description: No video file uploaded
 *       404:
 *         description: Lesson not found
 */
router.put(
  '/admin/lessons/:id/video',
  requireAuth,
  requireRole('admin'),
  uploadVideo,
  courseController.uploadLessonVideo,
);

export default router;
