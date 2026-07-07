import Enrollment, { IEnrollment } from '../models/enrollment.model';

const COURSE_POPULATE = {
  path: 'course',
  select: 'title slug thumbnail instructor',
};

const STUDENT_POPULATE = {
  path: 'student',
  select: 'firstName lastName emailId avatar',
};

export class EnrollmentRepository {
  async create(data: Partial<IEnrollment>): Promise<IEnrollment> {
    return Enrollment.create(data);
  }

  async findByStudent(studentId: string): Promise<IEnrollment[]> {
    return Enrollment.find({ student: studentId }).populate(COURSE_POPULATE).sort({ enrolledAt: -1 });
  }

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<IEnrollment | null> {
    return Enrollment.findOne({ student: studentId, course: courseId });
  }

  async findByCourse(courseId: string): Promise<IEnrollment[]> {
    return Enrollment.find({ course: courseId }).populate(STUDENT_POPULATE).sort({ enrolledAt: -1 });
  }

  async countByCourse(courseId: string): Promise<number> {
    return Enrollment.countDocuments({ course: courseId });
  }

  async findAll(): Promise<IEnrollment[]> {
    return Enrollment.find()
      .populate(STUDENT_POPULATE)
      .populate(COURSE_POPULATE)
      .sort({ enrolledAt: -1 });
  }

  async delete(id: string): Promise<IEnrollment | null> {
    return Enrollment.findByIdAndDelete(id);
  }
}
