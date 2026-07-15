import Course, { ICourse } from '../models/course.model';
import Enrollment from '../models/enrollment.model';

const INSTRUCTOR_POPULATE = {
  path: 'instructor',
  select: 'firstName lastName emailId avatar socialLinks',
};

const LIST_SELECT =
  '_id title slug thumbnail price discountPercent discountExpiresAt taxPercent isPublished isFeatured instructor totalLessons totalDuration createdAt';

export interface CourseFilters {
  isPublished?: boolean;
  isFeatured?: boolean;
  instructor?: string;
}

export class CourseRepository {
  async create(data: Partial<ICourse>): Promise<ICourse> {
    return Course.create(data);
  }

  async findById(id: string): Promise<ICourse | null> {
    return Course.findById(id).populate(INSTRUCTOR_POPULATE);
  }

  async findBySlug(slug: string): Promise<ICourse | null> {
    return Course.findOne({ slug }).populate(INSTRUCTOR_POPULATE);
  }

  async findAll(filters: CourseFilters = {}): Promise<ICourse[]> {
    const query: Record<string, unknown> = {};

    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }
    if (filters.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured;
    }
    if (filters.instructor) {
      query.instructor = filters.instructor;
    }

    return Course.find(query)
      .select(LIST_SELECT)
      .populate(INSTRUCTOR_POPULATE)
      .sort({ createdAt: -1 });
  }

  async findByInstructor(instructorId: string): Promise<ICourse[]> {
    return Course.find({ instructor: instructorId })
      .select(LIST_SELECT)
      .populate(INSTRUCTOR_POPULATE)
      .sort({ createdAt: -1 });
  }

  async update(id: string, data: Partial<ICourse>): Promise<ICourse | null> {
    return Course.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
  }

  async delete(id: string): Promise<ICourse | null> {
    return Course.findByIdAndDelete(id);
  }

  async countEnrollments(courseId: string): Promise<number> {
    return Enrollment.countDocuments({ course: courseId });
  }
}
