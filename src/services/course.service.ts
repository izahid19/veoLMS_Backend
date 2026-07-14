import fs from 'fs';
import path from 'path';
import slugify from 'slugify';
import { AppError } from '../utils/error';
import { CourseRepository } from '../repositories/course.repository';
import { SectionRepository } from '../repositories/section.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { ICourse } from '../models/course.model';
import { ISection } from '../models/section.model';
import { ILesson } from '../models/lesson.model';
import Enrollment from '../models/enrollment.model';
import Progress from '../models/progress.model';
import Payment from '../models/payment.model';
import { calculatePrice } from '../utils/price.util';
import { uploadFileToBunny, deleteFileFromBunny } from './bunny.storage.service';
import {
  createBunnyVideo,
  uploadBunnyVideo,
  getBunnyVideoDetails,
  deleteBunnyVideo,
  buildPlaybackUrl,
} from './bunny.stream.service';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return slugify(title, { lower: true, strict: true });
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

/** Derive a unique storage filename from the original file name. */
function uniqueFileName(originalName: string): string {
  const ext = path.extname(originalName) || '.jpg';
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class CourseService {
  constructor(
    private courseRepository: CourseRepository,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private enrollmentRepository: EnrollmentRepository,
  ) {}

  // ── Courses ────────────────────────────────────────────────────────────────

  async createCourse(data: Partial<ICourse>, instructorId: string): Promise<ICourse> {
    let slug = generateSlug(data.title as string);

    const existing = await this.courseRepository.findBySlug(slug);
    if (existing) {
      slug = `${slug}-${randomSuffix()}`;
    }

    const course = await this.courseRepository.create({
      ...data,
      slug,
      instructor: instructorId as any,
    });

    return course;
  }

  async getAllCourses(isPublished?: boolean): Promise<any[]> {
    const filters = isPublished !== undefined ? { isPublished } : {};
    const courses = await this.courseRepository.findAll(filters);

    return courses.map((c: any) => {
      const course = c.toObject ? c.toObject() : JSON.parse(JSON.stringify(c));
      const breakdown = calculatePrice({
        price: course.price,
        discountPercent: course.discountPercent || 0,
        discountExpiresAt: course.discountExpiresAt,
        taxPercent: course.taxPercent || 18,
      });

      return {
        ...course,
        effectivePrice: breakdown.totalAmount,
        discountedPrice: breakdown.discountedPrice,
        discountPercent: breakdown.discountPercent,
        taxPercent: breakdown.taxPercent,
        originalPrice: course.price,
        isFree: breakdown.isFree,
      };
    });
  }

  private buildCourseDetail(courseDoc: any, sectionsDocs: any[], lessonsDocs: any[], enrollmentCount: number = 0, isAdmin: boolean = false): any {
    const course = courseDoc.toObject ? courseDoc.toObject() : JSON.parse(JSON.stringify(courseDoc));
    const sections = sectionsDocs.map((s: any) => (s.toObject ? s.toObject() : JSON.parse(JSON.stringify(s))));
    const lessons = lessonsDocs.map((l: any) => {
      const lessonObj = l.toObject ? l.toObject() : JSON.parse(JSON.stringify(l));
      if (!isAdmin) {
        delete lessonObj.videoUrl;
        delete lessonObj.videoPublicId;
      }
      return lessonObj;
    });

    course.enrollmentCount = enrollmentCount;

    course.sections = sections.map((sec: any) => {
      sec.lessons = lessons.filter((les: any) => les.section.toString() === sec._id.toString());
      sec.lessons.sort((a: any, b: any) => a.order - b.order);
      return sec;
    });
    course.sections.sort((a: any, b: any) => a.order - b.order);
    
    return course;
  }

  async getCourseBySlug(slug: string): Promise<any> {
    const course = await this.courseRepository.findBySlug(slug);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const sections = await this.sectionRepository.findByCourse(course._id.toString());
    const lessons = await this.lessonRepository.findByCourse(course._id.toString());
    const enrollmentCount = await this.courseRepository.countEnrollments(course._id.toString());

    const courseData = this.buildCourseDetail(course, sections, lessons, enrollmentCount, false);
    
    const breakdown = calculatePrice({
      price: course.price,
      discountPercent: course.discountPercent || 0,
      discountExpiresAt: course.discountExpiresAt,
      taxPercent: course.taxPercent || 18,
    });

    return {
      course: courseData,
      sections: courseData.sections,
      priceBreakdown: {
        ...breakdown,
        discountExpiresAt: course.discountExpiresAt,
      }
    };
  }

  async getCourseById(id: string): Promise<any> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    
    const sections = await this.sectionRepository.findByCourse(id);
    const lessons = await this.lessonRepository.findByCourse(id);
    const enrollmentCount = await this.courseRepository.countEnrollments(id);

    return this.buildCourseDetail(course, sections, lessons, enrollmentCount, true);
  }

  async updateCourse(
    id: string,
    data: Partial<ICourse>,
    requesterId: string,
    requesterRole: string,
  ): Promise<ICourse> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const isOwner = course.instructor._id?.toString() === requesterId || course.instructor.toString() === requesterId;
    if (!isOwner && requesterRole !== 'admin') {
      throw new AppError('Not authorized to update this course', 403, 'FORBIDDEN');
    }

    const updatePayload: Partial<ICourse> = { ...data };

    if (data.title && data.title !== course.title) {
      let newSlug = generateSlug(data.title);
      const existing = await this.courseRepository.findBySlug(newSlug);
      if (existing && existing._id.toString() !== id) {
        newSlug = `${newSlug}-${randomSuffix()}`;
      }
      updatePayload.slug = newSlug as any;
    }

    const updated = await this.courseRepository.update(id, updatePayload);
    return updated!;
  }

  async deleteCourse(id: string): Promise<{ message: string }> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    // Delete all lesson videos from Bunny Stream
    const lessons = await this.lessonRepository.findByCourse(id);
    await Promise.all(
      lessons
        .filter((l) => l.videoPublicId)
        .map((l) => deleteBunnyVideo(l.videoPublicId)),
    );

    // Delete course thumbnail from Bunny Storage
    if (course.thumbnail) {
      await deleteFileFromBunny(course.thumbnail);
    }

    // Cascade: delete sections, enrollments, progress, payments
    const sections = await this.sectionRepository.findByCourse(id);
    await Promise.all(sections.map((s) => this.sectionRepository.delete(s._id.toString())));

    await Enrollment.deleteMany({ course: id });
    await Progress.deleteMany({ course: id });
    await Payment.deleteMany({ course: id });

    await this.courseRepository.delete(id);

    return { message: 'Course deleted successfully' };
  }

  async togglePublish(id: string): Promise<ICourse> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const updated = await this.courseRepository.update(id, { isPublished: !course.isPublished } as any);
    return updated!;
  }

  // ── Sections ───────────────────────────────────────────────────────────────

  async createSection(courseId: string, data: Partial<ISection>): Promise<ISection> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const existing = await this.sectionRepository.findByCourse(courseId);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) : -1;

    const section = await this.sectionRepository.create({
      ...data,
      course: courseId as any,
      order: maxOrder + 1,
    });

    return section;
  }

  async updateSection(id: string, data: Partial<ISection>): Promise<ISection> {
    const updated = await this.sectionRepository.update(id, data);
    if (!updated) {
      throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
    }
    return updated;
  }

  async deleteSection(id: string): Promise<{ message: string }> {
    const section = await this.sectionRepository.findById(id);
    if (!section) {
      throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
    }

    // Delete Bunny Stream videos for all lessons in this section
    const lessons = await this.lessonRepository.findBySection(id);
    await Promise.all(
      lessons
        .filter((l) => l.videoPublicId)
        .map((l) => deleteBunnyVideo(l.videoPublicId)),
    );

    // Cascade delete lessons + section (section.repository handles this atomically)
    await this.sectionRepository.delete(id);

    return { message: 'Section deleted successfully' };
  }

  // ── Lessons ────────────────────────────────────────────────────────────────

  async getLessonForWatch(lessonId: string, userId?: string, userRole?: string): Promise<any> {
    const lessonDoc = await this.lessonRepository.findById(lessonId);
    if (!lessonDoc) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    const courseId = lessonDoc.course.toString();
    const courseDoc = await this.courseRepository.findById(courseId);
    if (!courseDoc) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    const lesson = lessonDoc.toObject ? lessonDoc.toObject() : JSON.parse(JSON.stringify(lessonDoc));
    const courseSlug = courseDoc.slug;

    // Filtered lesson data to always include
    const lessonData = {
      _id: lesson._id,
      title: lesson.title,
      duration: lesson.duration,
      order: lesson.order,
      isFree: lesson.isFree,
      section: lesson.section,
      course: lesson.course,
    };

    if (lesson.isFree) {
      return { 
        canAccess: true, 
        lesson: { ...lessonData, videoUrl: lesson.videoUrl }, 
        isFree: true,
        courseSlug 
      };
    }

    if (!userId) {
      return { canAccess: false, reason: 'login_required', courseSlug, lesson: lessonData };
    }

    if (userRole === 'admin') {
      return { canAccess: true, lesson: { ...lessonData, videoUrl: lesson.videoUrl }, isFree: false, courseSlug };
    }

    const enrollment = await this.enrollmentRepository.findByStudentAndCourse(userId, courseId);
    if (!enrollment) {
      return { canAccess: false, reason: 'not_enrolled', courseSlug, lesson: lessonData };
    }

    // User is enrolled — return the video URL directly
    return { canAccess: true, lesson: { ...lessonData, videoUrl: lesson.videoUrl }, isFree: false, courseSlug };
  }

  async createLesson(sectionId: string, courseId: string, data: Partial<ILesson>): Promise<ILesson> {
    const [section, course] = await Promise.all([
      this.sectionRepository.findById(sectionId),
      this.courseRepository.findById(courseId),
    ]);

    if (!section) throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
    if (!course) throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');

    const existing = await this.lessonRepository.findBySection(sectionId);
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((l) => l.order)) : -1;

    const lesson = await this.lessonRepository.create({
      ...data,
      section: sectionId as any,
      course: courseId as any,
      order: maxOrder + 1,
    });

    // Increment totalLessons on the course
    await this.courseRepository.update(courseId, {
      totalLessons: course.totalLessons + 1,
    } as any);

    return lesson;
  }

  async updateLesson(id: string, data: Partial<ILesson>): Promise<ILesson> {
    const existing = await this.lessonRepository.findById(id);
    if (!existing) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    // If the frontend explicitly sends an empty videoUrl to remove the video
    if (data.videoUrl === '' && existing.videoPublicId) {
      await deleteBunnyVideo(existing.videoPublicId);
      data.duration = 0; // reset duration as well
    }

    const updated = await this.lessonRepository.update(id, data);
    return updated!;
  }

  async deleteLesson(id: string): Promise<{ message: string }> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    if (lesson.videoPublicId) {
      await deleteBunnyVideo(lesson.videoPublicId);
    }

    await this.lessonRepository.delete(id);

    // Decrement totalLessons and recalculate totalDuration
    const course = await this.courseRepository.findById(lesson.course.toString());
    if (course) {
      const remainingLessons = await this.lessonRepository.findByCourse(lesson.course.toString());
      const totalDuration = remainingLessons.reduce((sum, l) => sum + l.duration, 0);

      await this.courseRepository.update(lesson.course.toString(), {
        totalLessons: Math.max(0, course.totalLessons - 1),
        totalDuration,
      } as any);
    }

    return { message: 'Lesson deleted successfully' };
  }

  async uploadLessonVideo(lessonId: string, file: Express.Multer.File): Promise<ILesson> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    // Delete old video from Bunny Stream if one exists
    if (lesson.videoPublicId) {
      await deleteBunnyVideo(lesson.videoPublicId);
    }

    let tempFilePath: string | null = null;

    try {
      // multer diskStorage saves to a temp path
      tempFilePath = file.path;
      const fileSize = file.size;

      // Step 1 — Create video object in Bunny Stream
      const videoId = await createBunnyVideo(lesson.title || `lesson-${lessonId}`);

      // Step 2 — Stream file from disk → Bunny (no RAM buffering)
      const readStream = fs.createReadStream(tempFilePath);
      await uploadBunnyVideo(videoId, readStream, fileSize);

      // Step 3 — Fetch duration from Bunny
      let duration = 0;
      try {
        const details = await getBunnyVideoDetails(videoId);
        duration = details.duration;
      } catch (err) {
        console.error('[BunnyStream] Could not fetch video duration:', err);
      }

      // Step 4 — Build HLS playback URL
      const videoUrl = buildPlaybackUrl(videoId);

      // Step 5 — Persist in DB
      const updated = await this.lessonRepository.update(lessonId, {
        videoUrl,
        videoPublicId: videoId,
        duration,
      } as any);

      // Recalculate totalDuration on the course
      const allLessons = await this.lessonRepository.findByCourse(lesson.course.toString());
      const totalDuration = allLessons.reduce((sum, l) => {
        return sum + (l._id.toString() === lessonId ? duration : l.duration);
      }, 0);

      await this.courseRepository.update(lesson.course.toString(), { totalDuration } as any);

      return updated!;
    } finally {
      // Always clean up the temp file from disk
      if (tempFilePath) {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('[Upload] Failed to delete temp file:', tempFilePath, err);
        });
      }
    }
  }

  async uploadCourseThumbnail(courseId: string, file: Express.Multer.File): Promise<ICourse> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }

    // Delete old thumbnail from Bunny Storage if one exists
    if (course.thumbnail) {
      await deleteFileFromBunny(course.thumbnail);
    }

    // Upload new thumbnail buffer to Bunny Storage
    const fileName = uniqueFileName(file.originalname);
    const newThumbnailUrl = await uploadFileToBunny(file.buffer, fileName, 'thumbnails');

    const updated = await this.courseRepository.update(courseId, { thumbnail: newThumbnailUrl } as any);

    return updated!;
  }

  async reorderSections(updates: Array<{ id: string; order: number }>): Promise<void> {
    await this.sectionRepository.reorder(updates);
  }

  async reorderLessons(updates: Array<{ id: string; order: number }>): Promise<void> {
    await this.lessonRepository.reorder(updates);
  }
}
