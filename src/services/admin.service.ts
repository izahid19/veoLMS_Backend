import Course from '../models/course.model';
import User from '../models/user.model';
import Enrollment from '../models/enrollment.model';
import Payment from '../models/payment.model';

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
