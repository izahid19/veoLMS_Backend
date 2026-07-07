import { AppError } from '../utils/error';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { ProgressRepository } from '../repositories/progress.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { CourseRepository } from '../repositories/course.repository';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ICourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  lastWatchedLesson: { lessonId: string; watchedSeconds: number } | null;
  progresses?: any[];
}

export interface IEnrollmentWithProgress {
  enrollment: any;
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  };
}

export interface IUpdateProgressData {
  watchedSeconds: number;
  completed?: boolean;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class EnrollmentService {
  constructor(
    private enrollmentRepository: EnrollmentRepository,
    private progressRepository: ProgressRepository,
    private lessonRepository: LessonRepository,
    private sectionRepository: SectionRepository,
    private courseRepository: CourseRepository,
  ) {}

  // ── Check Enrollment ───────────────────────────────────────────────────────

  async checkEnrollment(studentId: string, courseId: string): Promise<{ isEnrolled: boolean }> {
    const enrollment = await this.enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    return { isEnrolled: !!enrollment };
  }

  // ── My Enrollments with Progress ───────────────────────────────────────────

  async getMyEnrollments(studentId: string): Promise<IEnrollmentWithProgress[]> {
    const enrollments = await this.enrollmentRepository.findByStudent(studentId);

    const result = await Promise.all(
      enrollments.map(async (enrollment) => {
        const courseId = (enrollment.course as any)?._id?.toString() ?? enrollment.course.toString();

        const [totalLessons, completedLessons] = await Promise.all([
          this.lessonRepository.findByCourse(courseId).then((lessons) => lessons.length),
          this.progressRepository.countCompleted(studentId, courseId),
        ]);

        const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          enrollment: enrollment.toObject ? enrollment.toObject() : enrollment,
          progress: { totalLessons, completedLessons, percentage },
        };
      }),
    );

    return result;
  }

  // ── Enrolled Course Detail ─────────────────────────────────────────────────

  async getEnrolledCourseDetail(slug: string, studentId: string): Promise<any> {
    const course = await this.courseRepository.findBySlug(slug);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const courseId = course._id.toString();

    const enrollment = await this.enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (!enrollment) {
      throw new AppError('Not enrolled in this course', 403, 'NOT_ENROLLED');
    }

    const [sections, lessons, progressRecords] = await Promise.all([
      this.sectionRepository.findByCourse(courseId),
      this.lessonRepository.findByCourse(courseId),
      this.progressRepository.findByStudentAndCourse(studentId, courseId),
    ]);

    // Build a lookup map for progress by lessonId
    const progressMap = new Map<string, { watchedSeconds: number; completed: boolean }>();
    for (const p of progressRecords) {
      progressMap.set(p.lesson.toString(), {
        watchedSeconds: p.watchedSeconds,
        completed: p.completed,
      });
    }

    const courseObj = course.toObject ? course.toObject() : JSON.parse(JSON.stringify(course));

    // Attach lessons (with progress) to their sections
    const sectionsWithLessons = sections.map((sec) => {
      const secObj = sec.toObject ? sec.toObject() : JSON.parse(JSON.stringify(sec));
      secObj.lessons = lessons
        .filter((les) => les.section.toString() === sec._id.toString())
        .sort((a, b) => a.order - b.order)
        .map((les) => {
          const lesObj = les.toObject ? les.toObject() : JSON.parse(JSON.stringify(les));
          const lessonProgress = progressMap.get(les._id.toString()) ?? {
            watchedSeconds: 0,
            completed: false,
          };
          return { ...lesObj, progress: lessonProgress };
        });
      return secObj;
    });

    sectionsWithLessons.sort((a, b) => a.order - b.order);

    return { ...courseObj, sections: sectionsWithLessons };
  }

  // ── Course Progress ────────────────────────────────────────────────────────

  async getCourseProgress(courseId: string, studentId: string): Promise<ICourseProgress> {
    const [lessons, progressRecords, lastWatched] = await Promise.all([
      this.lessonRepository.findByCourse(courseId),
      this.progressRepository.findByStudentAndCourse(studentId, courseId),
      this.progressRepository.getLastWatched(studentId, courseId),
    ]);

    const totalLessons = lessons.length;
    const completedLessons = progressRecords.filter((p) => p.completed).length;
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const lastWatchedLesson = lastWatched
      ? { lessonId: lastWatched.lesson.toString(), watchedSeconds: lastWatched.watchedSeconds }
      : null;

    return { 
      totalLessons, 
      completedLessons, 
      percentage, 
      lastWatchedLesson,
      progresses: progressRecords 
    };
  }

  // ── Update Progress ────────────────────────────────────────────────────────

  async updateProgress(
    lessonId: string,
    studentId: string,
    data: IUpdateProgressData,
  ): Promise<any> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    const courseId = lesson.course.toString();

    const enrollment = await this.enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (!enrollment && !lesson.isFree) {
      throw new AppError('Not enrolled in this course and lesson is not free', 403, 'NOT_ENROLLED');
    }

    const progress = await this.progressRepository.upsert(studentId, courseId, lessonId, {
      watchedSeconds: data.watchedSeconds,
      completed: data.completed,
      lastWatchedAt: new Date(),
    });

    return progress;
  }

  // ── Last Watched Lesson ────────────────────────────────────────────────────

  async getLastWatchedLesson(
    courseId: string,
    studentId: string,
  ): Promise<{ lessonId: string; watchedSeconds: number } | null> {
    const progress = await this.progressRepository.getLastWatched(studentId, courseId);
    if (!progress) return null;
    return { lessonId: progress.lesson.toString(), watchedSeconds: progress.watchedSeconds };
  }
}
