import { Request, Response, NextFunction } from 'express';
import { CourseService } from '../services/course.service';

// Express 5 types req.params values as string | string[] — this helper narrows safely
const param = (req: Request, key: string): string => req.params[key] as string;

export class CourseController {
  constructor(private courseService: CourseService) {}

  // ── Courses ────────────────────────────────────────────────────────────────

  getAllCourses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('--- GET /admin/courses HIT ---');
      let isPublishedParam = req.query.isPublished;
      // Force 'true' for the public endpoint
      if (req.originalUrl.startsWith('/api/courses') && !req.originalUrl.includes('/admin')) {
        isPublishedParam = 'true';
      }
      const isPublished = isPublishedParam !== undefined ? isPublishedParam === 'true' : undefined;

      const courses = await this.courseService.getAllCourses(isPublished);

      res.status(200).json({ success: true, data: courses });
    } catch (error) {
      next(error);
    }
  };

  getCourseBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = param(req, 'slug');
      const result = await this.courseService.getCourseBySlug(slug);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getCourseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const course = await this.courseService.getCourseById(id);

      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  };

  createCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const instructorId = req.userId as string;
      const course = await this.courseService.createCourse(req.body, instructorId);

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: course,
      });
    } catch (error) {
      next(error);
    }
  };

  updateCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const requesterId = req.userId as string;
      const requesterRole = req.userRole as string;

      const course = await this.courseService.updateCourse(id, req.body, requesterId, requesterRole);

      res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: course,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCourse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const result = await this.courseService.deleteCourse(id);

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  togglePublish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const course = await this.courseService.togglePublish(id);

      res.status(200).json({
        success: true,
        message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  };

  uploadCourseThumbnail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const id = param(req, 'id');
      const course = await this.courseService.uploadCourseThumbnail(id, req.file);

      res.status(200).json({
        success: true,
        message: 'Thumbnail updated successfully',
        data: course,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Sections ───────────────────────────────────────────────────────────────

  createSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = param(req, 'courseId');
      const section = await this.courseService.createSection(courseId, req.body);

      res.status(201).json({
        success: true,
        message: 'Section created successfully',
        data: section,
      });
    } catch (error) {
      next(error);
    }
  };

  updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const section = await this.courseService.updateSection(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Section updated successfully',
        data: section,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const result = await this.courseService.deleteSection(id);

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  reorderSections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { updates } = req.body as { updates: Array<{ id: string; order: number }> };

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ success: false, message: 'updates array is required' });
        return;
      }

      await this.courseService.reorderSections(updates);

      res.status(200).json({ success: true, message: 'Sections reordered successfully' });
    } catch (error) {
      next(error);
    }
  };

  // ── Lessons ────────────────────────────────────────────────────────────────

  getLessonForWatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = param(req, 'lessonId');
      const userId = req.userId;
      const userRole = req.userRole;

      const result = await this.courseService.getLessonForWatch(lessonId, userId, userRole);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sectionId = param(req, 'sectionId');
      const { courseId, ...data } = req.body;

      if (!courseId) {
        res.status(400).json({ success: false, message: 'courseId is required in the request body' });
        return;
      }

      const lesson = await this.courseService.createLesson(sectionId, courseId, data);

      res.status(201).json({
        success: true,
        message: 'Lesson created successfully',
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  };

  updateLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const lesson = await this.courseService.updateLesson(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Lesson updated successfully',
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, 'id');
      const result = await this.courseService.deleteLesson(id);

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  reorderLessons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { updates } = req.body as { updates: Array<{ id: string; order: number }> };

      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ success: false, message: 'updates array is required' });
        return;
      }

      await this.courseService.reorderLessons(updates);

      res.status(200).json({ success: true, message: 'Lessons reordered successfully' });
    } catch (error) {
      next(error);
    }
  };

  uploadLessonVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No video file uploaded' });
        return;
      }

      const id = param(req, 'id');
      const lesson = await this.courseService.uploadLessonVideo(id, req.file);

      res.status(200).json({
        success: true,
        message: 'Lesson video uploaded successfully',
        data: lesson,
      });
    } catch (error) {
      next(error);
    }
  };
}
