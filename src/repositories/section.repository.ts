import mongoose from 'mongoose';
import Section, { ISection } from '../models/section.model';
import Lesson from '../models/lesson.model';

export class SectionRepository {
  async create(data: Partial<ISection>): Promise<ISection> {
    return Section.create(data);
  }

  async findByCourse(courseId: string): Promise<ISection[]> {
    return Section.find({ course: courseId }).sort({ order: 1 });
  }

  async findById(id: string): Promise<ISection | null> {
    return Section.findById(id);
  }

  async update(id: string, data: Partial<ISection>): Promise<ISection | null> {
    return Section.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });
  }

  async delete(id: string): Promise<ISection | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Cascade: remove all lessons belonging to this section first
      await Lesson.deleteMany({ section: id }, { session });
      const deleted = await Section.findByIdAndDelete(id, { session });
      await session.commitTransaction();
      return deleted;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async reorder(updates: Array<{ id: string; order: number }>): Promise<void> {
    const ops = updates.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    }));

    await Section.bulkWrite(ops);
  }
}
