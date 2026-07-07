import Progress, { IProgress } from '../models/progress.model';

export interface ProgressUpsertData {
  watchedSeconds?: number;
  completed?: boolean;
  lastWatchedAt?: Date;
}

export class ProgressRepository {
  async upsert(
    studentId: string,
    courseId: string,
    lessonId: string,
    data: ProgressUpsertData,
  ): Promise<IProgress> {
    const result = await Progress.findOneAndUpdate(
      { student: studentId, lesson: lessonId },
      {
        $set: {
          course: courseId,
          ...data,
        },
        $setOnInsert: {
          student: studentId,
          lesson: lessonId,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
    return result!;
  }

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<IProgress[]> {
    return Progress.find({ student: studentId, course: courseId });
  }

  async findByStudentAndLesson(studentId: string, lessonId: string): Promise<IProgress | null> {
    return Progress.findOne({ student: studentId, lesson: lessonId });
  }

  async getLastWatched(studentId: string, courseId: string): Promise<IProgress | null> {
    return Progress.findOne({ student: studentId, course: courseId })
      .sort({ lastWatchedAt: -1 })
      .limit(1);
  }

  async countCompleted(studentId: string, courseId: string): Promise<number> {
    return Progress.countDocuments({ student: studentId, course: courseId, completed: true });
  }

  async deleteByStudent(studentId: string): Promise<void> {
    await Progress.deleteMany({ student: studentId });
  }

  async deleteByCourse(courseId: string): Promise<void> {
    await Progress.deleteMany({ course: courseId });
  }
}
