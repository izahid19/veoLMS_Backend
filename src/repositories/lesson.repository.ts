import Lesson, { ILesson } from '../models/lesson.model';

export class LessonRepository {
  async create(data: Partial<ILesson>): Promise<ILesson> {
    return Lesson.create(data);
  }

  async findBySection(sectionId: string): Promise<ILesson[]> {
    return Lesson.find({ section: sectionId }).sort({ order: 1 });
  }

  async findByCourse(courseId: string): Promise<ILesson[]> {
    return Lesson.find({ course: courseId }).sort({ order: 1 });
  }

  async findById(id: string): Promise<ILesson | null> {
    return Lesson.findById(id);
  }

  async update(id: string, data: Partial<ILesson>): Promise<ILesson | null> {
    return Lesson.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
  }

  async delete(id: string): Promise<ILesson | null> {
    return Lesson.findByIdAndDelete(id);
  }

  async reorder(updates: Array<{ id: string; order: number }>): Promise<void> {
    const ops = updates.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    }));

    await Lesson.bulkWrite(ops);
  }
}
