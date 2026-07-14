import Course from '../models/course.model';
import User from '../models/user.model';
import Enrollment from '../models/enrollment.model';
import Payment from '../models/payment.model';
import Instructor from '../models/instructor.model';
import { AppError } from '../utils/error';
import { uploadFileToBunny, deleteFileFromBunny } from './bunny.storage.service';
import path from 'path';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface IAdminStats {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  totalEnrollments: number;
  recentEnrollments: any[];
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class AdminService {

  // ── Dashboard Stats ────────────────────────────────────────────────────────

  async getStats(): Promise<IAdminStats> {
    const [totalCourses, totalStudents, totalEnrollments, revenueResult, recentEnrollments] =
      await Promise.all([
        Course.countDocuments(),
        User.countDocuments({ role: 'student' }),
        Enrollment.countDocuments(),
        Payment.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Enrollment.find()
          .sort({ enrolledAt: -1 })
          .limit(10)
          .populate({ path: 'student', select: 'firstName lastName avatar' })
          .populate({ path: 'course', select: 'title thumbnail price' }),
      ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].total / 100 : 0;

    return {
      totalCourses,
      totalStudents,
      totalRevenue,
      totalEnrollments,
      recentEnrollments,
    };
  }

  // ── All Instructors/Admins ───────────────────────────────────────────────

  // ── All Instructors/Admins ───────────────────────────────────────────────

  async getAllInstructors(): Promise<any[]> {
    // Migration: if no instructors exist, seed the first one (Zahid admin)
    const count = await Instructor.countDocuments();
    if (count === 0) {
      const adminUser = await User.findById('6a4990673756ead0e92ad945');
      if (adminUser) {
        await Instructor.create({
          _id: adminUser._id,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          emailId: adminUser.emailId,
          avatar: adminUser.avatar || '',
        });
      }
    }

    const instructors = await Instructor.find()
      .select('firstName lastName emailId avatar socialLinks')
      .sort({ firstName: 1 });
    return instructors;
  }

  async createInstructor(data: {
    firstName: string;
    lastName: string;
    emailId: string;
    socialLinks?: {
      website?: string;
      linkedin?: string;
      github?: string;
      twitter?: string;
      youtube?: string;
    };
  }): Promise<any> {
    const { firstName, lastName, emailId, socialLinks } = data;
    const existing = await Instructor.findOne({ emailId: emailId.toLowerCase() });
    if (existing) {
      throw new AppError('Instructor with this email already exists', 400, 'INSTRUCTOR_EMAIL_EXISTS');
    }
    const instructor = await Instructor.create({
      firstName,
      lastName,
      emailId: emailId.toLowerCase(),
      socialLinks: socialLinks || {},
    });
    return instructor;
  }

  async updateInstructor(id: string, data: {
    firstName: string;
    lastName: string;
    emailId: string;
    socialLinks?: {
      website?: string;
      linkedin?: string;
      github?: string;
      twitter?: string;
      youtube?: string;
    };
  }): Promise<any> {
    const { firstName, lastName, emailId, socialLinks } = data;
    const instructor = await Instructor.findById(id);
    if (!instructor) {
      throw new AppError('Instructor not found', 404, 'INSTRUCTOR_NOT_FOUND');
    }

    if (emailId && emailId.toLowerCase() !== instructor.emailId) {
      const existing = await Instructor.findOne({ emailId: emailId.toLowerCase() });
      if (existing) {
        throw new AppError('Instructor with this email already exists', 400, 'INSTRUCTOR_EMAIL_EXISTS');
      }
      instructor.emailId = emailId.toLowerCase();
    }

    instructor.firstName = firstName;
    instructor.lastName = lastName;
    if (socialLinks) {
      instructor.socialLinks = {
        website: socialLinks.website || '',
        linkedin: socialLinks.linkedin || '',
        github: socialLinks.github || '',
        twitter: socialLinks.twitter || '',
        youtube: socialLinks.youtube || '',
      };
    }
    await instructor.save();
    return instructor;
  }

  async deleteInstructor(id: string): Promise<any> {
    const instructor = await Instructor.findById(id);
    if (!instructor) {
      throw new AppError('Instructor not found', 404, 'INSTRUCTOR_NOT_FOUND');
    }

    const coursesCount = await Course.countDocuments({ instructor: id });
    if (coursesCount > 0) {
      throw new AppError('Cannot delete instructor assigned to courses', 400, 'INSTRUCTOR_ASSIGNED_TO_COURSES');
    }

    if (instructor.avatar) {
      try {
        await deleteFileFromBunny(instructor.avatar);
      } catch (err) {
        console.error('Failed to delete avatar from Bunny:', err);
      }
    }

    await Instructor.findByIdAndDelete(id);
    return { message: 'Instructor deleted successfully' };
  }

  async uploadInstructorAvatar(id: string, file: any): Promise<any> {
    const instructor = await Instructor.findById(id);
    if (!instructor) {
      throw new AppError('Instructor not found', 404, 'INSTRUCTOR_NOT_FOUND');
    }

    if (instructor.avatar) {
      try {
        await deleteFileFromBunny(instructor.avatar);
      } catch (err) {
        console.error('Failed to delete old avatar:', err);
      }
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `instructor-avatar-${id}-${Date.now()}${ext}`;
    const newAvatarUrl = await uploadFileToBunny(file.buffer, fileName, 'avatars');

    instructor.avatar = newAvatarUrl;
    await instructor.save();
    return instructor;
  }

  // ── All Students (paginated) ───────────────────────────────────────────────

  async getAllStudents(
    page: number,
    limit: number,
  ): Promise<IPaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find({ role: 'student' })
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'student' }),
    ]);

    // Attach enrollment count per student
    const studentsWithCount = await Promise.all(
      students.map(async (student) => {
        const enrollmentCount = await Enrollment.countDocuments({
          student: student._id,
        });
        return { ...student.toObject(), enrollmentCount };
      }),
    );

    return {
      data: studentsWithCount,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Student Detail ─────────────────────────────────────────────────────────

  async getStudentDetail(studentId: string): Promise<any> {
    const [user, enrollments, spentResult] = await Promise.all([
      User.findById(studentId).select('-password -refreshToken'),
      Enrollment.find({ student: studentId })
        .populate({ path: 'course', select: 'title slug thumbnail price instructor' })
        .sort({ enrolledAt: -1 }),
      Payment.aggregate([
        { $match: { student: require('mongoose').Types.ObjectId.createFromHexString(studentId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalSpent = spentResult.length > 0 ? spentResult[0].total / 100 : 0;

    return { user, enrollments, totalSpent };
  }

  // ── All Enrollments (paginated) ────────────────────────────────────────────

  async getAllEnrollments(
    page: number,
    limit: number,
  ): Promise<IPaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      Enrollment.find()
        .populate({ path: 'student', select: 'firstName lastName emailId avatar' })
        .populate({ path: 'course', select: 'title slug thumbnail price' })
        .populate({ path: 'payment', select: 'amount status createdAt' })
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments(),
    ]);

    return {
      data: enrollments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── All Payments (paginated) ───────────────────────────────────────────────

  async getAllPayments(
    page: number,
    limit: number,
  ): Promise<IPaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find()
        .populate({ path: 'student', select: 'firstName lastName emailId avatar' })
        .populate({ path: 'course', select: 'title slug thumbnail price' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(),
    ]);

    return {
      data: payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
