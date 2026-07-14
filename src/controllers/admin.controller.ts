import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';

// ─── Pagination Helper ─────────────────────────────────────────────────────────

function parsePagination(req: Request): { page: number; limit: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  return { page, limit };
}

// ─── Controller ────────────────────────────────────────────────────────────────

export class AdminController {
  constructor(private adminService: AdminService) {}

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.adminService.getStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  getInstructors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const instructors = await this.adminService.getAllInstructors();
      res.status(200).json({ success: true, data: instructors });
    } catch (error) {
      next(error);
    }
  };

  getAllStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = parsePagination(req);
      const result = await this.adminService.getAllStudents(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getStudentDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const studentId = req.params.id as string;
      const result = await this.adminService.getStudentDetail(studentId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getAllEnrollments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = parsePagination(req);
      const result = await this.adminService.getAllEnrollments(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  getAllPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = parsePagination(req);
      const result = await this.adminService.getAllPayments(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  createInstructor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.adminService.createInstructor(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateInstructor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.adminService.updateInstructor(id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteInstructor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.adminService.deleteInstructor(id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadInstructorAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const result = await this.adminService.uploadInstructorAvatar(id, req.file);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
