import { Request, Response, NextFunction } from 'express';
import { EnrollmentService } from '../services/enrollment.service';

// Express 5 types req.params values as string | string[] — this helper narrows safely
const param = (req: Request, key: string): string => req.params[key] as string;

export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  // ── Enrollments ────────────────────────────────────────────────────────────

  checkEnrollment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.userId as string;
      const courseId = param(req, 'courseId');
      const result = await this.enrollmentService.checkEnrollment(studentId, courseId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getMyEnrollments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.userId as string;
      const enrollments = await this.enrollmentService.getMyEnrollments(studentId);
      res.status(200).json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  };

  getEnrolledCourseDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = param(req, 'slug');
      const studentId = req.userId as string;
      const course = await this.enrollmentService.getEnrolledCourseDetail(slug, studentId);
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      next(error);
    }
  };

  // ── Progress ───────────────────────────────────────────────────────────────

  getCourseProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = param(req, 'courseId');
      const studentId = req.userId as string;
      const progress = await this.enrollmentService.getCourseProgress(courseId, studentId);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  };

  getLastWatchedLesson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = param(req, 'courseId');
      const studentId = req.userId as string;
      const result = await this.enrollmentService.getLastWatchedLesson(courseId, studentId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = param(req, 'lessonId');
      const studentId = req.userId as string;
      const progress = await this.enrollmentService.updateProgress(lessonId, studentId, req.body);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  };
}
